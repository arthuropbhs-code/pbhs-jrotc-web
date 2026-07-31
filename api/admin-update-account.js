import { jwtVerify, createRemoteJWKSet, SignJWT, importPKCS8 } from 'jose';

// Mirrors the top-command role list in src/constants.js (ADMIN_LEVEL tier) and
// firestore.rules' isAdmin() - keep these three in sync by hand whenever the
// role table changes, same as the rest of the app already does.
const TOP_COMMAND_ROLES = [
  'senior_army_instructor', 'army_instructor',
  'battalion_commander', 'battalion_xo', 'battalion_csm', 'sergeant_major'
];

// Firebase ID tokens are signed with Google's securetoken key set - this is
// the same public JWKS endpoint firebase-admin's verifyIdToken() uses
// internally, just called directly instead of through the firebase-admin
// package. (firebase-admin was dropped entirely: its auth module pulls in
// jwks-rsa, which does a CommonJS require() of an ESM-only dependency and
// crashes the whole function under this project's "type": "module" - a real
// incompatibility in that dependency chain, not fixable from this file.)
const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

let serviceAccount = null;
function getServiceAccount() {
  if (serviceAccount) return serviceAccount;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not set in this environment.');
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON - re-paste the full downloaded key file as-is.');
  }

  // If the private_key's real newlines got flattened into literal "\n" text
  // during copy/paste, un-flatten them so the PEM parses.
  if (parsed.private_key && parsed.private_key.includes('\\n')) {
    parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
  }

  serviceAccount = parsed;
  return serviceAccount;
}

// Standard Google service-account JWT-bearer OAuth2 flow: self-sign a short
// JWT with the service account's private key, trade it for an access token
// scoped to the two REST APIs we need.
let cachedToken = null;
async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }

  const account = getServiceAccount();
  const key = await importPKCS8(account.private_key, 'RS256');
  const now = Math.floor(Date.now() / 1000);

  const assertion = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/datastore'
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .setIssuer(account.client_email)
    .setSubject(account.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .sign(key);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'Failed to obtain a Google access token');

  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

async function getUserRole(accessToken, projectId, uid) {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.fields?.role?.stringValue || null;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) return res.status(401).json({ error: 'Missing auth token' });

    const account = getServiceAccount();
    const projectId = account.project_id;

    let callerUid;
    try {
      const { payload } = await jwtVerify(idToken, JWKS, {
        issuer: `https://securetoken.google.com/${projectId}`,
        audience: projectId,
      });
      callerUid = payload.sub;
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired auth token' });
    }

    const accessToken = await getAccessToken();
    const callerRole = await getUserRole(accessToken, projectId, callerUid);

    if (!TOP_COMMAND_ROLES.includes(callerRole)) {
      return res.status(403).json({ error: 'Only battalion command can change login credentials.' });
    }

    const { targetUid, newEmail } = req.body || {};
    if (!targetUid || !newEmail) {
      return res.status(400).json({ error: 'targetUid and newEmail are required' });
    }

    const identityRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ localId: targetUid, email: newEmail, emailVerified: false }),
      }
    );
    const identityData = await identityRes.json();
    if (!identityRes.ok) {
      throw new Error(identityData.error?.message || 'Failed to update login email');
    }

    const firestoreRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${targetUid}?updateMask.fieldPaths=email`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { email: { stringValue: newEmail } } }),
      }
    );
    if (!firestoreRes.ok) {
      const data = await firestoreRes.json();
      throw new Error(data.error?.message || 'Login email updated, but syncing the roster record failed');
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    // Last-resort net: whatever broke, report it as JSON instead of letting
    // the platform's own non-JSON crash page reach the frontend.
    console.error('admin-update-account failed:', err);
    return res.status(500).json({ error: err.message || 'Unexpected server error' });
  }
}
