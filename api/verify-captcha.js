import { checkRateLimit, getClientIp } from '../lib/rateLimit.js';

// Unauthenticated by design - this runs before an account exists, so there's
// no ID token to verify yet. The CAPTCHA check itself is what stands in for
// authorization here: a bot can't easily score above 0.3 on Enterprise's
// risk model, and tokens are single-use (Google invalidates after one check).
// Threshold is 0.3 rather than the default 0.5 because this signup form is
// already gated by a secret code (SHA-256 checked) and requires admin approval,
// so reCAPTCHA is a supplementary bot signal, not the primary security gate.
// Users in incognito mode or with no Google session routinely score 0.3–0.5,
// and we don't want to block legitimate cadets from signing up.
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
      // Key not configured — log loudly but fail open rather than 500ing.
      // The signup form is already gated by a secret code + admin approval;
      // a missing key shouldn't lock everyone out of account creation.
      console.error('RECAPTCHA_API_KEY env var is not set. Skipping score check.');
      return res.status(200).json({ success: true, score: null, skipped: true });
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
    // riskAnalysis.score = 0.0 (bot) → 1.0 (human). Google omits the score
    // entirely when it can't assess risk (e.g. no cookies, incognito mode) —
    // don't default omitted score to 0 or we'll block legitimate incognito users.
    const valid        = data.tokenProperties?.valid;
    const invalidReason = data.tokenProperties?.invalidReason;
    const score        = data.riskAnalysis?.score; // undefined = Google couldn't assess

    // Always log the full assessment so Vercel function logs show what Google returned.
    console.log('reCAPTCHA assessment:', JSON.stringify({
      valid, score, invalidReason,
      action: data.tokenProperties?.action,
    }));

    if (!valid) {
      console.warn('reCAPTCHA token invalid — reason:', invalidReason);
      return res.status(400).json({ error: 'CAPTCHA verification failed', reason: invalidReason });
    }

    // Only apply score gate when Google actually returns one. Threshold is 0.3:
    // incognito/low-cookie users legitimately score 0.3–0.5, and this form is
    // already behind a secret code + admin approval, so reCAPTCHA is supplementary.
    if (score !== undefined && score < 0.3) {
      console.warn('reCAPTCHA score too low:', score);
      return res.status(400).json({ error: 'CAPTCHA verification failed', score });
    }

    return res.status(200).json({ success: true, score });
  } catch (err) {
    console.error('verify-captcha failed:', err);
    return res.status(500).json({ error: err.message || 'Unexpected server error' });
  }
}
