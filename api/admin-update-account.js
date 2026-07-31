import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Mirrors the top-command role list in src/constants.js (ADMIN_LEVEL tier) and
// firestore.rules' isAdmin() - keep these three in sync by hand whenever the
// role table changes, same as the rest of the app already does.
const TOP_COMMAND_ROLES = [
  'senior_army_instructor', 'army_instructor',
  'battalion_commander', 'battalion_xo', 'battalion_csm', 'sergeant_major'
];

let firebaseApp = null;

// Deferred + guarded: a bad FIREBASE_SERVICE_ACCOUNT value (most commonly the
// private_key's newlines getting mangled when pasted into Vercel's env var
// UI) throws here. Doing this at module load with no try/catch would crash
// the whole invocation before our handler's own error handling ever runs.
function ensureApp() {
  if (firebaseApp) return firebaseApp;
  if (getApps().length) {
    firebaseApp = getApps()[0];
    return firebaseApp;
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not set in this environment.');
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw);
  } catch (err) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON - re-paste the full downloaded key file as-is.');
  }

  // If the private_key's real newlines got flattened into literal "\n" text
  // during copy/paste, un-flatten them so the PEM parses.
  if (serviceAccount.private_key && serviceAccount.private_key.includes('\\n')) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }

  firebaseApp = initializeApp({ credential: cert(serviceAccount) });
  return firebaseApp;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const app = ensureApp();
    const auth = getAuth(app);
    const db = getFirestore(app);

    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) return res.status(401).json({ error: 'Missing auth token' });

    let callerUid;
    try {
      const decoded = await auth.verifyIdToken(idToken);
      callerUid = decoded.uid;
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired auth token' });
    }

    const callerDoc = await db.collection('users').doc(callerUid).get();
    const callerRole = callerDoc.exists ? callerDoc.data().role : null;

    if (!TOP_COMMAND_ROLES.includes(callerRole)) {
      return res.status(403).json({ error: 'Only battalion command can change login credentials.' });
    }

    const { targetUid, newEmail } = req.body || {};
    if (!targetUid || !newEmail) {
      return res.status(400).json({ error: 'targetUid and newEmail are required' });
    }

    await auth.updateUser(targetUid, { email: newEmail });
    await db.collection('users').doc(targetUid).update({ email: newEmail });
    return res.status(200).json({ success: true });
  } catch (err) {
    // Last-resort net: whatever broke, report it as JSON instead of letting
    // the platform's own non-JSON crash page reach the frontend.
    console.error('admin-update-account failed:', err);
    return res.status(500).json({ error: err.message || 'Unexpected server error' });
  }
}
