// Uploads a PDF directly from the browser to Cloudinary using a signed upload.
// The signature is generated server-side (/api/cloudinary-sign) so the API
// secret never ships in client code. The file itself goes directly to Cloudinary
// — nothing routes through our Vercel functions — so there's no server body
// size cap to worry about.

import { validateUpload } from './validateUpload';
import { withRetry } from './withRetry';

/**
 * Upload a PDF to Cloudinary via signed upload.
 *
 * @param {File}   file
 * @param {string} folder   subfolder in the Cloudinary media library
 * @returns {Promise<{ url: string, fileName: string, bytes: number }>}
 */
export async function uploadPdfSigned(file, folder = 'documents') {
  // Validate bytes before touching the network
  const { valid, error } = await validateUpload(file, 'document');
  if (!valid) throw new Error(error);

  // Get a short-lived signature from our API endpoint
  const signRes = await fetch(`/api/cloudinary-sign?folder=${encodeURIComponent(folder)}`);
  if (!signRes.ok) {
    const { error: msg } = await signRes.json().catch(() => ({}));
    throw new Error(msg || 'Failed to get upload credentials');
  }
  const { signature, timestamp, api_key, cloud_name } = await signRes.json();

  // Build the signed upload form and POST directly to Cloudinary
  const body = new FormData();
  body.append('file',      file);
  body.append('timestamp', String(timestamp));
  body.append('api_key',   api_key);
  body.append('signature', signature);
  body.append('folder',    folder);

  const data = await withRetry(async () => {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloud_name}/raw/upload`,
      { method: 'POST', body },
    );
    const json = await res.json();
    if (!res.ok || !json.secure_url) {
      throw new Error(json.error?.message || 'Upload failed');
    }
    return json;
  });

  return { url: data.secure_url, fileName: file.name, bytes: file.size };
}
