// Generates a short-lived Cloudinary upload signature so the browser can
// POST a file directly to Cloudinary (no file ever passes through our
// server). Using a signed upload instead of the unsigned ml_default preset
// because that preset only allows image resource types; signed uploads are
// resource-type-agnostic and are the correct pattern for PDFs / documents.
//
// Requires Vercel env vars:
//   CLOUDINARY_API_KEY    — from Cloudinary dashboard → Settings → API Keys
//   CLOUDINARY_API_SECRET — same location (click the eye icon to reveal)

import crypto from 'node:crypto';
import { checkRateLimit } from '../lib/rateLimit.js';

const CLOUD_NAME = 'q77zogcy';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Light rate-limit: signature endpoint is called once per upload
  try { await checkRateLimit(req, 'cloudinary-sign', 20, 60); } catch {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!apiKey || !apiSecret) {
    return res.status(500).json({
      error: 'Cloudinary API credentials not configured. Add CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to Vercel environment variables.'
    });
  }

  const folder    = (req.query.folder || 'documents').replace(/[^a-zA-Z0-9/_-]/g, '');
  const timestamp = Math.round(Date.now() / 1000);

  // Build signature per Cloudinary spec:
  //   sort params alphabetically (exclude file, cloud_name, resource_type, api_key)
  //   join as key=value&key=value, append API secret, SHA-256 hash
  const params = { folder, timestamp };
  const toSign =
    Object.keys(params)
      .sort()
      .map(k => `${k}=${params[k]}`)
      .join('&') +
    apiSecret;

  const signature = crypto.createHash('sha256').update(toSign).digest('hex');

  res.status(200).json({
    signature,
    timestamp,
    folder,
    api_key: apiKey,
    cloud_name: CLOUD_NAME,
  });
}
