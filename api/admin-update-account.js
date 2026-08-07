import { jwtVerify, createRemoteJWKSet, SignJWT, importPKCS8 } from 'jose';
import { checkRateLimit } from '../lib/rateLimit.js';

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

// Pure authorization decision for acting on someone ELSE's account, pulled
// out of the handler so it's unit-testable without mocking Firestore/JWT
// verification. Behavior is unchanged from the inline checks this replaced.
export function canManageAccount(callerRole, targetRole) {
  if (!EMAIL_MANAGER_ROLES.includes(callerRole)) {
    return { allowed: false, reason: 'Only battalion command, S1, or S6 can manage another cadet\'s account.' };
  }
  if ((ROLE_HIERARCHY[targetRole] || 0) >= (ROLE_HIERARCHY[callerRole] || 0)) {
    return { allowed: false, reason: 'You can only manage accounts for personnel below your own rank.' };
  }
  return { allowed: true };
}

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
  } catch {
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

async function getUserField(accessToken, projectId, uid, field) {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.fields?.[field]?.stringValue || null;
}

// Minimal plain-object <-> Firestore REST "fields" converters - only the
// value types this file actually writes (string/boolean/Date).
function toFirestoreValue(value) {
  if (typeof value === 'boolean') return { booleanValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  return { stringValue: String(value) };
}

function toFirestoreFields(obj) {
  const fields = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    fields[key] = toFirestoreValue(value);
  }
  return fields;
}

function fromFirestoreFields(fields = {}) {
  const out = {};
  for (const [key, value] of Object.entries(fields)) {
    if ('stringValue' in value) out[key] = value.stringValue;
    else if ('booleanValue' in value) out[key] = value.booleanValue;
    else if ('timestampValue' in value) out[key] = value.timestampValue;
  }
  return out;
}

// A staff member can pre-create a cadet's roster entry ahead of time
// (isManual: true) so the cadet only has to link a login to it later,
// skipping the pending-approval step since they were already vetted. Only
// the server can be trusted to confirm that match - never the client - so
// this runs with the service account's own privileged read access.
async function findShadowRecord(accessToken, projectId, email) {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'users' }],
          where: {
            compositeFilter: {
              op: 'AND',
              filters: [
                { fieldFilter: { field: { fieldPath: 'email' }, op: 'EQUAL', value: { stringValue: email } } },
                { fieldFilter: { field: { fieldPath: 'isManual' }, op: 'EQUAL', value: { booleanValue: true } } },
              ],
            },
          },
          limit: 1,
        },
      }),
    }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  const hit = Array.isArray(rows) ? rows.find((r) => r.document) : null;
  if (!hit) return null;
  return {
    id: hit.document.name.split('/').pop(),
    ...fromFirestoreFields(hit.document.fields),
  };
}

// Mirrors src/utils/emailjs.js's constants/templates, but sent server-side
// instead of from the browser. A password-reset link is a live account-
// takeover credential - returning it in the API response so the client
// could hand it to EmailJS meant it briefly existed in the requester's
// browser (devtools/network tab, extensions, browser history) even for the
// admin-resets-someone-else flow. Sending it from here means it never
// leaves the server. EmailJS's Public Key is designed for use from any
// origin (that's the point of "public"), so calling its REST endpoint
// server-side works identically to the browser SDK.
const EMAILJS_SERVICE_ID = 'service_80dmyxg';
const RESET_PASSWORD_TEMPLATE_ID = 'template_716dlh3';
const ACCOUNT_NOTIFICATION_TEMPLATE_ID = 'template_3owdwgb';
const EMAILJS_PUBLIC_KEY = '5HbZ07R5aInTJAzNw';

async function emailjsSend(templateId, templateParams) {
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: templateId,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: templateParams,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`EmailJS send failed: ${text}`);
  }
}

const sendResetPasswordEmail = (toEmail, resetLink) =>
  emailjsSend(RESET_PASSWORD_TEMPLATE_ID, { to_email: toEmail, reset_link: resetLink });

const CTA_BUTTON = `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
    <tr>
      <td style="border-radius:14px; background-color:#eab308;">
        <a href="https://pbhsjrotc.vercel.app/admin" target="_blank"
           style="display:inline-block; padding:16px 32px; font-size:13px; font-weight:900; letter-spacing:1px; text-transform:uppercase; color:#0f172a; text-decoration:none; border-radius:14px;">
          Go to Command Portal
        </a>
      </td>
    </tr>
  </table>`;

const SECURITY_BANNER = `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
    <tr>
      <td style="background-color:#fef2f2; border:1px solid #fecaca; border-radius:12px; padding:12px 16px;">
        <p style="margin:0; font-size:11px; font-weight:900; letter-spacing:1px; text-transform:uppercase; color:#dc2626;">
          Security Notice
        </p>
      </td>
    </tr>
  </table>`;

const NOTIFY_FOOTNOTE = `If you didn't request this change and don't recognize it, contact your battalion's S1 immediately — someone else may have access to your account.`;

const sendEmailChangedNewAddress = (newEmail) =>
  emailjsSend(ACCOUNT_NOTIFICATION_TEMPLATE_ID, {
    to_email: newEmail,
    heading: 'Login Email Updated',
    message: `<p style="margin:0 0 24px; font-size:14px; line-height:1.6; color:#475569;">This confirms that the Command Portal account you now sign in with uses <strong style="color:#0f172a;">${newEmail}</strong> as its login email.</p>`,
    banner: '',
    cta: CTA_BUTTON,
    footnote: NOTIFY_FOOTNOTE,
  });

const sendEmailChangedOldAddress = (oldEmail, newEmail) =>
  emailjsSend(ACCOUNT_NOTIFICATION_TEMPLATE_ID, {
    to_email: oldEmail,
    heading: 'Login Email Changed',
    message: `<p style="margin:0 0 16px; font-size:14px; line-height:1.6; color:#475569;">The Command Portal account that used to sign in with this inbox (<strong style="color:#0f172a;">${oldEmail}</strong>) has had its login email changed to <strong style="color:#0f172a;">${newEmail}</strong>. This inbox will no longer receive account emails.</p>`,
    banner: SECURITY_BANNER,
    cta: '',
    footnote: 'If you made this change yourself (for example, handing the account off to a successor), no action is needed. ' + NOTIFY_FOOTNOTE,
  });

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) return res.status(401).json({ error: 'Missing auth token' });

    const { type = 'update-email', targetUid, newEmail, suspend } = req.body || {};
    if (!targetUid) return res.status(400).json({ error: 'targetUid is required' });
    if (type === 'update-email' && !newEmail) {
      return res.status(400).json({ error: 'newEmail is required' });
    }
    if (type === 'suspend-account' && typeof suspend !== 'boolean') {
      return res.status(400).json({ error: 'suspend (true/false) is required' });
    }

    const account = getServiceAccount();
    const projectId = account.project_id;

    // Verifying the caller's token and obtaining our own access token are
    // independent - run them concurrently to cut a full round trip off the
    // critical path (this endpoint makes several external HTTPS calls, and
    // Vercel's function timeout is short enough that latency here matters).
    let callerUid;
    let callerEmail;
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
      callerEmail = verifyResult.payload.email;
      accessToken = token;
    } catch {
      return res.status(401).json({ error: 'Invalid or expired auth token' });
    }

    // General abuse guard, keyed by the verified caller's own uid (not IP -
    // this endpoint is authenticated, so the account is the stable identity).
    const generalLimit = await checkRateLimit(`ratelimit:account:${callerUid}`, 30, 60);
    if (!generalLimit.allowed) {
      return res.status(429).json({ error: 'Too many requests. Slow down and try again shortly.' });
    }

    // reset-password gets its own tighter limit - the 60s cooldown on the
    // client (My Profile / Manage Personnel) only prevents accidental
    // double-clicks, it's not a real boundary since anyone can call this
    // endpoint directly and skip the client entirely.
    if (type === 'reset-password') {
      const resetLimit = await checkRateLimit(`ratelimit:reset-password:${callerUid}`, 3, 300);
      if (!resetLimit.allowed) {
        return res.status(429).json({ error: 'Too many reset requests. Try again in a few minutes.' });
      }
    }

    // Acting on your own account is always allowed (self-service password
    // reset, email change, or account deletion). Acting on someone else's -
    // for any action type here - is restricted to the email-manager roles,
    // and only for personnel strictly below your own rank.
    if (targetUid !== callerUid) {
      const [callerRole, targetRole] = await Promise.all([
        getUserField(accessToken, projectId, callerUid, 'role'),
        getUserField(accessToken, projectId, targetUid, 'role'),
      ]);

      const decision = canManageAccount(callerRole, targetRole);
      if (!decision.allowed) {
        return res.status(403).json({ error: decision.reason });
      }
    }

    if (type === 'complete-signup') {
      // Always self (SignUp.jsx calls this right after creating its own
      // auth account) - the self-vs-other block above already covers it.
      // A fresh signup can't be trusted to self-report a shadow-record
      // match, or to set its own role/approved status - both are re-
      // verified here from the server's own privileged read, never from
      // anything the client sent.
      const { profile = {} } = req.body || {};
      const shadow = await findShadowRecord(accessToken, projectId, callerEmail);

      const finalProfile = {
        uid: targetUid,
        fullName: shadow?.fullName || (profile.fullName || '').toString(),
        email: callerEmail,
        phone: profile.phone || '',
        rank: shadow?.rank || profile.rank || '',
        position: shadow?.position || profile.position || '',
        company: shadow?.company || profile.company || 'Battalion',
        platoon: shadow?.platoon || profile.platoon || '',
        squad: shadow?.squad || profile.squad || '',
        letLevel: shadow?.letLevel || 'LET 1',
        gender: shadow?.gender || 'Male',
        role: shadow?.role || 'cadet',
        isManual: false,
        status: 'Active',
        createdAt: new Date(),
        updatedAt: new Date(),
        accountLinked: !!shadow,
        // If staff already pre-created this roster entry (with a real
        // rank/role) and this signup just links a login to it, no separate
        // approval step is needed - they were already vetted then. A blind
        // self-registration with no matching record starts pending.
        approved: !!shadow,
      };

      const writes = [{
        update: {
          name: `projects/${projectId}/databases/(default)/documents/users/${targetUid}`,
          fields: toFirestoreFields(finalProfile),
        },
      }];
      if (shadow?.id) {
        writes.push({ delete: `projects/${projectId}/databases/(default)/documents/users/${shadow.id}` });
      }

      const commitRes = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ writes }),
        }
      );
      if (!commitRes.ok) {
        const data = await commitRes.json();
        throw new Error(data.error?.message || 'Failed to finish creating your account');
      }

      // Best-effort - a failed confirmation email shouldn't turn an
      // otherwise-successful signup into an error for the user.
      try {
        await emailjsSend(ACCOUNT_NOTIFICATION_TEMPLATE_ID, {
          to_email: callerEmail,
          heading: shadow ? 'Welcome to the Battalion' : 'Request Received',
          message: shadow
            ? `<p style="margin:0 0 24px; font-size:14px; line-height:1.6; color:#475569;">Your Command Portal account has been linked to your existing personnel record and you're ready to go. Sign in to see your duties, uniform status, and battalion announcements.</p>`
            : `<p style="margin:0 0 24px; font-size:14px; line-height:1.6; color:#475569;">Your Command Portal account request for <strong style="color:#0f172a;">${callerEmail}</strong> has been submitted. Battalion staff will review it and assign your rank and position - you'll get another email once that's done.</p>`,
          banner: '',
          cta: shadow ? CTA_BUTTON : '',
          footnote: shadow
            ? `Questions about your rank or position? Contact your battalion's S1.`
            : `If you didn't request this account, contact your battalion's S1.`,
        });
      } catch (notifyErr) {
        console.error('Signup confirmation email failed:', notifyErr);
      }

      return res.status(200).json({ success: true, linked: !!shadow });
    }

    if (type === 'notify-uniform-issued') {
      // Not an account-management action, so it doesn't rely on the
      // self-vs-other gate above (targetUid is just the caller's own uid
      // here to satisfy the required-field check). Verifies the caller is
      // actually S-4 tier itself - mirrors UniformRequests.jsx's isS4Master
      // exactly, since the client-side check alone isn't a real boundary.
      const callerRole = await getUserField(accessToken, projectId, callerUid, 'role');
      // Mirrors UniformRequests.jsx APPROVE_ROLES — keep in sync.
      const APPROVE_ROLES = ['s4_logistics', 'battalion_xo', 'battalion_commander', 'battalion_csm'];
      if (!APPROVE_ROLES.includes(callerRole)) {
        return res.status(403).json({ error: 'Only S-4, XO, or Command can send this notification.' });
      }

      const { toEmail, cadetName, item, detail } = req.body || {};
      if (!toEmail || !cadetName || !item) {
        return res.status(400).json({ error: 'toEmail, cadetName, and item are required' });
      }

      await emailjsSend(ACCOUNT_NOTIFICATION_TEMPLATE_ID, {
        to_email: toEmail,
        heading: 'Uniform Request Fulfilled',
        message: `<p style="margin:0 0 24px; font-size:14px; line-height:1.6; color:#475569;">Your request to issue <strong style="color:#0f172a;">${item}${detail ? ` (${detail})` : ''}</strong> to <strong style="color:#0f172a;">${cadetName}</strong> has been marked as issued by S-4.</p>`,
        banner: '',
        cta: CTA_BUTTON,
        footnote: `Questions about this issuance? Contact your battalion's S-4.`,
      });

      return res.status(200).json({ success: true });
    }

    if (type === 'welcome-notification') {
      // Sent by staff at the moment they approve a pending signup and
      // assign a real rank/position - gated by the same self-vs-other rule
      // above (staff acting on someone else's account).
      const targetEmail = await getUserField(accessToken, projectId, targetUid, 'email');
      if (!targetEmail) throw new Error('Could not resolve that account\'s email address');

      await emailjsSend(ACCOUNT_NOTIFICATION_TEMPLATE_ID, {
        to_email: targetEmail,
        heading: 'Welcome to the Battalion',
        message: `<p style="margin:0 0 24px; font-size:14px; line-height:1.6; color:#475569;">Your Command Portal account has been approved and you're ready to go. Sign in to see your duties, uniform status, and battalion announcements.</p>`,
        banner: '',
        cta: CTA_BUTTON,
        footnote: `Questions about your rank or position? Contact your battalion's S1.`,
      });

      return res.status(200).json({ success: true });
    }

    if (type === 'reset-password') {
      // Never trust a client-supplied email for someone else's account -
      // resolve the target's real current login email server-side. For
      // self-service, the ID token's own (already-verified) email claim is
      // authoritative and needs no extra lookup.
      const targetEmail = targetUid === callerUid
        ? callerEmail
        : await getUserField(accessToken, projectId, targetUid, 'email');
      if (!targetEmail) throw new Error('Could not resolve that account\'s email address');

      const oobRes = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:sendOobCode`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestType: 'PASSWORD_RESET', email: targetEmail, returnOobLink: true }),
      });
      const oobData = await oobRes.json();
      if (!oobRes.ok) throw new Error(oobData.error?.message || 'Failed to generate a reset link');

      // Send it from here - the raw link never reaches the client at all.
      await sendResetPasswordEmail(targetEmail, oobData.oobLink);

      return res.status(200).json({ success: true, email: targetEmail });
    }

    if (type === 'suspend-account') {
      // disableUser is enforced natively by Firebase Auth - a disabled
      // account can't sign in at all, regardless of anything client-side.
      // The Firestore `suspended` field is just a mirror for display/badges
      // and so an already-open session gets force-signed-out immediately
      // (see useAuth.js) rather than staying valid until its token expires.
      const [identityRes, firestoreRes] = await Promise.all([
        fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ localId: targetUid, disableUser: suspend }),
        }),
        fetch(
          `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${targetUid}?updateMask.fieldPaths=suspended`,
          {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: { suspended: { booleanValue: suspend } } }),
          }
        ),
      ]);

      if (!identityRes.ok) {
        const data = await identityRes.json();
        throw new Error(data.error?.message || `Failed to ${suspend ? 'suspend' : 'reactivate'} account`);
      }
      if (!firestoreRes.ok) {
        const data = await firestoreRes.json();
        throw new Error(data.error?.message || 'Account suspension changed, but syncing the roster record failed');
      }

      return res.status(200).json({ success: true, suspended: suspend });
    }

    if (type === 'delete-account') {
      // Auth user and Firestore record are independent deletes - run them
      // concurrently. Firestore's REST delete is idempotent-ish (404 on an
      // already-missing doc), so only the Auth deletion's failure is fatal.
      const [identityRes] = await Promise.all([
        fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:delete`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ localId: targetUid }),
        }),
        fetch(
          `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${targetUid}`,
          { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
        ),
      ]);

      if (!identityRes.ok) {
        const data = await identityRes.json();
        throw new Error(data.error?.message || 'Failed to delete the account');
      }

      return res.status(200).json({ success: true });
    }

    // Resolve the target's CURRENT email before we overwrite it, so the
    // frontend can notify that inbox too. For self-service the verified JWT
    // claim already has it; for someone else, read it fresh from Firestore.
    const oldEmail = targetUid === callerUid
      ? callerEmail
      : await getUserField(accessToken, projectId, targetUid, 'email');

    // type === 'update-email': the Auth login email and the Firestore copy
    // of it are independent writes - run them concurrently.
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

    // The update itself already succeeded above - a notification failing
    // shouldn't turn into a 500 for an action that actually worked.
    try {
      await sendEmailChangedNewAddress(newEmail);
      if (oldEmail && oldEmail !== newEmail) {
        await sendEmailChangedOldAddress(oldEmail, newEmail);
      }
    } catch (notifyErr) {
      console.error('Email-change notification failed:', notifyErr);
    }

    return res.status(200).json({ success: true, oldEmail, newEmail });
  } catch (err) {
    // Last-resort net: whatever broke, report it as JSON instead of letting
    // the platform's own non-JSON crash page reach the frontend.
    console.error('admin-update-account failed:', err);
    return res.status(500).json({ error: err.message || 'Unexpected server error' });
  }
}
