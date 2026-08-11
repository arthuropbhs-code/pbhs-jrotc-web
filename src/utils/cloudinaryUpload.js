import { withRetry } from './withRetry';
import { validateUpload } from './validateUpload';
import { convertToWebp } from './convertToWebp';

export const CLOUDINARY_CLOUD_NAME = 'q77zogcy';
export const CLOUDINARY_UPLOAD_PRESET = 'ml_default';

/**
 * The single upload path for every file this app accepts, whether it's a
 * document, a portrait, or a team photo: validate the real file bytes
 * (validateUpload), convert images to WebP so storage stays one consistent
 * format regardless of what the uploader's phone/camera produced
 * (convertToWebp), then POST to Cloudinary with automatic retry on a
 * dropped connection (withRetry). Throws with a user-facing message on
 * anything that fails validation or the upload itself.
 *
 * @param {File} file
 * @param {'image' | 'document'} kind
 * @returns {Promise<{secure_url: string, bytes: number, fileName: string}>}
 */
export async function uploadToCloudinary(file, kind) {
  const { valid, error, detectedType } = await validateUpload(file, kind);
  if (!valid) throw new Error(error);

  const uploadFile = kind === 'image' && detectedType !== 'image/webp'
    ? await convertToWebp(file)
    : file;

  const body = new FormData();
  body.append('file', uploadFile);
  body.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  // 'raw/upload' accepts any file type (PDFs, docs) without processing.
  // 'auto/upload' tries to detect image/video/raw but the ml_default
  // unsigned preset typically only permits image uploads, so PDFs get
  // rejected. Use raw explicitly for documents.
  const endpoint = kind === 'document' ? 'raw' : 'image';

  const data = await withRetry(async () => {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${endpoint}/upload`, {
      method: 'POST',
      body,
    });
    const json = await res.json();
    if (!res.ok || !json.secure_url) {
      throw new Error(json.error?.message || 'Upload failed');
    }
    return json;
  });

  return { ...data, fileName: uploadFile.name };
}
