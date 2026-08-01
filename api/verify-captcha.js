// Unauthenticated by design - this runs before an account exists, so there's
// no ID token to verify yet. The CAPTCHA check itself is what stands in for
// authorization here: a bot can't produce a valid token without solving the
// widget, and the token can only be verified once (Google invalidates it
// after a successful check), so this can't be replayed.
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { token } = req.body || {};
    if (!token) return res.status(400).json({ error: 'Missing CAPTCHA token' });

    const secret = process.env.RECAPTCHA_SECRET_KEY;
    if (!secret) {
      throw new Error('RECAPTCHA_SECRET_KEY is not set in this environment.');
    }

    const verifyRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = await verifyRes.json();

    if (!data.success) {
      return res.status(400).json({ error: 'CAPTCHA verification failed' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('verify-captcha failed:', err);
    return res.status(500).json({ error: err.message || 'Unexpected server error' });
  }
}
