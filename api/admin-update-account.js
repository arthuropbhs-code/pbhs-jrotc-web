import { jwtVerify, createRemoteJWKSet, SignJWT, importPKCS8 } from 'jose';

// Mirrors src/constants.js ROLE_HIERARCHY - keep these two in sync by hand
// whenever the role table changes, same as firestore.rules already does.
const ROLE_HIERARCHY = {
  senior_army_instructor: 100, army_instructor: 95,
  battalion_commander: 90, battalion_xo: 85, battalion_csm: 85, sergeant_major: 80,
  s1_adjutant: 70, s2_intelligence: 70, s3_operations: 70, s4_logistics: 70,
  s5_public_affairs: 70, s6_technology: 70, s7_special_projects: 70,
  company_commander: 55, company_xo: 50, company_1sg: 45,
  company_s1_assistant: 35, company_s2_assistant: 35, company_s3_assistant: 35,
  company_s4_assistant: 35, company_s5_assistant: 35, company_s6_assistant: 35, company_s7_assistant: 35,
  platoon_leader: 25, platoon_sergeant: 20,
  squad_leader: 15, squad_leader_assistant: 12,
  squad_member: 5, cadet: 1
};

// Only these roles may change someone ELSE's login email - self-service
// (changing your own) is handled separately below and needs no role check.
const EMAIL_MANAGER_ROLES = [
  'senior_army_instructor', 'army_instructor',
  'battalion_commander', 'battalion_xo', 'battalion_csm', 'sergeant_major',
  's1_adjutant', 's6_technology'
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

    const { targetUid, newEmail } = req.body || {};
    if (!targetUid || !newEmail) {
      return res.status(400).json({ error: 'targetUid and newEmail are required' });
    }

    const account = getServiceAccount();
    const projectId = account.project_id;

    // Verifying the caller's token and obtaining our own access token are
    // independent - run them concurrently to cut a full round trip off the
    // critical path (this endpoint makes several external HTTPS calls, and
    // Vercel's function timeout is short enough that latency here matters).
    let callerUid;
    let accessToken;
    try {
      const [verifyResult, token] = await Promise.all([
        jwtVerify(idToken, JWKS, {
          issuer: `https://securetoken.google.com/${projectId}`,
          audience: projectId,
        }),
        getAccessToken(),
      ]);
      callerUid = verifyResult.payload.sub;
      accessToken = token;
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired auth token' });
    }

    // Changing your own login email is always allowed - it's your account.
    // Changing someone else's is restricted to the email-manager roles, and
    // only for personnel strictly below your own rank.
    if (targetUid !== callerUid) {
      const [callerRole, targetRole] = await Promise.all([
        getUserRole(accessToken, projectId, callerUid),
        getUserRole(accessToken, projectId, targetUid),
      ]);

      if (!EMAIL_MANAGER_ROLES.includes(callerRole)) {
        return res.status(403).json({ error: 'Only battalion command, S1, or S6 can change another cadet\'s login credentials.' });
      }
      if ((ROLE_HIERARCHY[targetRole] || 0) >= (ROLE_HIERARCHY[callerRole] || 0)) {
        return res.status(403).json({ error: 'You can only change login credentials for personnel below your own rank.' });
      }
    }

    // The Auth login email and the Firestore copy of it are independent
    // writes - run them concurrently too.
    const [identityRes, firestoreRes] = await Promise.all([
      fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ localId: targetUid, email: newEmail, emailVerified: false }),
      }),
      fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${targetUid}?updateMask.fieldPaths=email`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { email: { stringValue: newEmail } } }),
        }
      ),
    ]);

    if (!identityRes.ok) {
      const data = await identityRes.json();
      throw new Error(data.error?.message || 'Failed to update login email');
    }
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
