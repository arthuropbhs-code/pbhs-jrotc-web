import { checkRateLimit, getClientIp } from '../lib/rateLimit.js';

// Unauthenticated by design - this runs before an account exists, so there's
// no ID token to verify yet. The CAPTCHA check itself is what stands in for
// authorization here: a bot can't easily score above 0.5 on Enterprise's
// risk model, and tokens are single-use (Google invalidates after one check).
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // By IP, not by account — there's no account yet at this point.
    const ip = getClientIp(req);
    const { allowed } = await checkRateLimit(`ratelimit:captcha:${ip}`, 10, 60);
    if (!allowed) {
      return res.status(429).json({ error: 'Too many attempts. Try again in a minute.' });
    }

    const { token } = req.body || {};
    if (!token) return res.status(400).json({ error: 'Missing CAPTCHA token' });

    const apiKey = process.env.RECAPTCHA_API_KEY;
    if (!apiKey) {
      throw new Error('RECAPTCHA_API_KEY is not set in this environment.');
    }

    const SITE_KEY = '6Ld3tXwtAAAAAP7tu9bJa3fpwpju6LLDe9T2ujWO';
    const PROJECT_ID = 'pbhs-jrotc-web';

    const assessRes = await fetch(
      `https://recaptchaenterprise.googleapis.com/v1/projects/${PROJECT_ID}/assessments?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: {
            token,
            expectedAction: 'SIGNUP',
            siteKey: SITE_KEY,
          },
        }),
      }
    );

    const data = await assessRes.json();

    if (!assessRes.ok) {
      console.error('reCAPTCHA Enterprise API error:', data);
      return res.status(400).json({ error: 'CAPTCHA assessment failed', detail: data });
    }

    // tokenProperties.valid = token was genuine and not expired/replayed.
    // riskAnalysis.score = 0.0 (bot) → 1.0 (human); 0.5 is the standard threshold.
    const valid = data.tokenProperties?.valid;
    const score = data.riskAnalysis?.score ?? 0;

    if (!valid || score < 0.5) {
      console.warn('reCAPTCHA Enterprise rejected signup — valid:', valid, 'score:', score);
      return res.status(400).json({ error: 'CAPTCHA verification failed', score });
    }

    return res.status(200).json({ success: true, score });
  } catch (err) {
    console.error('verify-captcha failed:', err);
    return res.status(500).json({ error: err.message || 'Unexpected server error' });
  }
}
