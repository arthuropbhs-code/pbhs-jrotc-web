// Mirrors the top-command role list in src/constants.js (ADMIN_LEVEL tier) and
// firestore.rules' isAdmin() - keep these three in sync by hand whenever the
// role table changes, same as the rest of the app already does.
const TOP_COMMAND_ROLES = [
  'senior_army_instructor', 'army_instructor',
  'battalion_commander', 'battalion_xo', 'battalion_csm', 'sergeant_major'
];

let cached = null;

// Everything firebase-admin-related is loaded and initialized lazily, inside
// the handler, via dynamic import() rather than static top-level imports.
// Static imports of the firebase-admin/app, /auth, /firestore subpaths
// crashed the whole function at build/cold-start (their ESM wrappers pull in
// a large dependency chain - google-auth-library, jsonwebtoken, etc. - that
// Vercel's static bundler failed to trace). Dynamic import() of the same
// packages works reliably here, confirmed by direct testing against the
// live endpoint, and also means a bad FIREBASE_SERVICE_ACCOUNT value or any
// other init failure is something our own try/catch can turn into a real
// JSON error instead of the platform's plain-text crash page.
async function getFirebase() {
  if (cached) return cached;

  const [{ initializeApp, getApps, cert }, { getAuth }, { getFirestore }] = await Promise.all([
    import('firebase-admin/app'),
    import('firebase-admin/auth'),
    import('firebase-admin/firestore'),
  ]);

  let app;
  if (getApps().length) {
    app = getApps()[0];
  } else {
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

    // If the private_key's real newlines got flattened into literal "\n"
    // text during copy/paste, un-flatten them so the PEM parses.
    if (serviceAccount.private_key && serviceAccount.private_key.includes('\\n')) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    app = initializeApp({ credential: cert(serviceAccount) });
  }

  cached = { auth: getAuth(app), db: getFirestore(app) };
  return cached;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { auth, db } = await getFirebase();

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
