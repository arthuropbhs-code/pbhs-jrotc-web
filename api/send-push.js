// POST /api/send-push
//
// Broadcasts an FCM push notification to every approved user who has at
// least one registered device token stored in Firestore.
//
// Body:
//   idToken  string   Firebase ID token of the calling user (must be staff 70+)
//   title    string   Notification title (default: "PBHS JROTC")
//   body     string   Notification body text (required)
//
// The caller's role is verified server-side — the same staff (70+) gate
// that guards the Announcements page client-side.
//
// Token hygiene: FCM returns UNREGISTERED for tokens that belong to devices
// that have since revoked permission or uninstalled the app. We remove those
// stale tokens from Firestore so future sends are clean.

import { jwtVerify, createRemoteJWKSet, SignJWT, importPKCS8 } from 'jose';
import { checkRateLimit } from '../lib/rateLimit.js';

// ── Firebase auth / service-account helpers ───────────────────────────────────
// Pattern matches notify-cycle.js — shared utilities would be cleaner but
// each Vercel function is a separate module so they self-contain the helpers.

const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

let _serviceAccount = null;
function getServiceAccount() {
  if (_serviceAccount) return _serviceAccount;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT not set.');
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON.'); }
  if (parsed.private_key?.includes('\\n')) parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
  _serviceAccount = parsed;
  return _serviceAccount;
}

// FCM HTTP v1 requires the firebase.messaging OAuth scope — different from
// the datastore scope used by Firestore REST calls in other notify-*.js files.
let _fcmToken = null;
async function getFcmAccessToken() {
  if (_fcmToken && _fcmToken.expiresAt > Date.now() + 30_000) return _fcmToken.value;
  const account = getServiceAccount();
  const key     = await importPKCS8(account.private_key, 'RS256');
  const now     = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .setIssuer(account.client_email)
    .setSubject(account.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .sign(key);

  const res  = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`FCM token exchange failed: ${data.error_description || data.error}`);
  _fcmToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return _fcmToken.value;
}

// Separate Firestore access token (datastore scope) for querying/updating docs.
let _fsToken = null;
async function getFirestoreAccessToken() {
  if (_fsToken && _fsToken.expiresAt > Date.now() + 30_000) return _fsToken.value;
  const account = getServiceAccount();
  const key     = await importPKCS8(account.private_key, 'RS256');
  const now     = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/datastore',
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .setIssuer(account.client_email)
    .setSubject(account.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .sign(key);

  const res  = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Firestore token exchange failed: ${data.error_description || data.error}`);
  _fsToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return _fsToken.value;
}

/** Verify Firebase ID token → { uid, role, userLevel } */
async function verifyAndGetLevel(idToken) {
  const account   = getServiceAccount();
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer:   `https://securetoken.google.com/${account.project_id}`,
    audience: account.project_id,
  });
  const uid         = payload.sub;
  const accessToken = await getFirestoreAccessToken();
  const docUrl      = `https://firestore.googleapis.com/v1/projects/${account.project_id}/databases/(default)/documents/users/${uid}`;
  const docRes      = await fetch(docUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!docRes.ok) throw new Error('Caller user doc not found');
  const doc         = await docRes.json();
  const role        = doc.fields?.role?.stringValue || 'cadet';
  const HIERARCHY   = {
    senior_army_instructor: 100, army_instructor: 95,
    battalion_commander: 90, battalion_xo: 85, battalion_csm: 85, sergeant_major: 80,
    s1_adjutant: 70, s2_intelligence: 70, s3_operations: 70, s4_logistics: 70,
    s5_public_affairs: 70, s6_technology: 70, s7_special_projects: 70,
    company_commander: 55, company_xo: 50, company_1sg: 45, company_master_sergeant: 45,
  };
  return { uid, role, userLevel: HIERARCHY[role] || 0 };
}

/** Collect all FCM tokens from approved users. Returns { tokens: string[], tokenToUid: Map } */
async function getAllTokens(accessToken, projectId) {
  const url  = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'users' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'approved' },
          op:    'EQUAL',
          value: { booleanValue: true },
        },
      },
    },
  };
  const res  = await fetch(url, {
    method:  'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  const rows = await res.json();

  const tokens    = [];
  const tokenToUid = new Map();
  for (const r of rows) {
    if (!r.document?.fields) continue;
    const uid         = r.document.name.split('/').pop();
    const tokensField = r.document.fields.fcmTokens;
    if (!tokensField?.arrayValue?.values) continue;
    for (const v of tokensField.arrayValue.values) {
      if (v.stringValue) {
        tokens.push(v.stringValue);
        tokenToUid.set(v.stringValue, uid);
      }
    }
  }
  return { tokens, tokenToUid };
}

/** Send one FCM message. Returns { ok: boolean, errorCode: string|null } */
async function sendOne(fcmToken, accessToken, projectId, title, body) {
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  const res = await fetch(url, {
    method:  'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      message: {
        token:        fcmToken,
        notification: { title, body },
        webpush:      {
          notification: {
            icon:  'https://www.pbhsjrotc.com/icon-192.png',
            badge: 'https://www.pbhsjrotc.com/icon-192.png',
            tag:   'pbhs-jrotc-push',
          },
        },
      },
    }),
  });
  if (res.ok) return { ok: true, errorCode: null };
  const err = await res.json().catch(() => ({}));
  const code = err.error?.details?.[0]?.errorCode || err.error?.message || 'UNKNOWN';
  return { ok: false, errorCode: code };
}

/** Remove stale tokens from Firestore using batchWrite transforms. */
async function removeStaleTokens(fsToken, projectId, staleTokensByUid) {
  const writes = [];
  for (const [uid, badTokens] of staleTokensByUid) {
    writes.push({
      transform: {
        document: `projects/${projectId}/databases/(default)/documents/users/${uid}`,
        fieldTransforms: [{
          fieldPath:          'fcmTokens',
          removeAllFromArray: {
            values: badTokens.map(t => ({ stringValue: t })),
          },
        }],
      },
    });
  }
  if (!writes.length) return;
  await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:batchWrite`,
    {
      method:  'POST',
      headers: { Authorization: `Bearer ${fsToken}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ writes }),
    }
  );
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try { await checkRateLimit(req, 'send-push', 10, 60); }
  catch { return res.status(429).json({ error: 'Too many requests' }); }

  const { idToken, title = 'PBHS JROTC', body } = req.body || {};
  if (!idToken || !body) return res.status(400).json({ error: 'Missing idToken or body' });

  let uid, userLevel;
  try {
    ({ uid, userLevel } = await verifyAndGetLevel(idToken));
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (userLevel < 70) return res.status(403).json({ error: 'Staff level (70+) required' });

  const account    = getServiceAccount();
  const projectId  = account.project_id;
  const [fcmToken, fsToken] = await Promise.all([getFcmAccessToken(), getFirestoreAccessToken()]);
  const { tokens, tokenToUid } = await getAllTokens(fsToken, projectId);

  if (!tokens.length) return res.status(200).json({ ok: true, sent: 0, failed: 0 });

  // Send all concurrently; FCM HTTP v1 is per-token.
  const results = await Promise.all(
    tokens.map(t => sendOne(t, fcmToken, projectId, title, body).then(r => ({ token: t, ...r })))
  );

  const sent   = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;

  // Collect stale tokens (UNREGISTERED = device unsubscribed or app cleared).
  const stale = results.filter(r => !r.ok && ['UNREGISTERED', 'INVALID_ARGUMENT'].includes(r.errorCode));
  if (stale.length) {
    const byUid = new Map();
    for (const { token } of stale) {
      const u = tokenToUid.get(token);
      if (u) {
        if (!byUid.has(u)) byUid.set(u, []);
        byUid.get(u).push(token);
      }
    }
    // Fire-and-forget — don't let cleanup delay the response.
    removeStaleTokens(fsToken, projectId, byUid).catch(err =>
      console.error('send-push: stale token cleanup failed', err)
    );
  }

  return res.status(200).json({ ok: true, sent, failed });
}
