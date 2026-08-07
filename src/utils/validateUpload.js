// Validates a File by its actual byte signature ("magic numbers"), not its
// extension or browser-reported MIME type - both of those are just labels
// the uploader chose and are trivial to fake (rename a .exe to .jpg and the
// browser will happily report image/jpeg). Reading the real leading bytes is
// what actually stops "upload a disguised executable" as a class of attack;
// it is not a substitute for real virus scanning, but this app doesn't have
// a third-party AV budget, and combined with strict Cloudinary-hosted
// storage (nothing here ever executes uploaded content), this is the right
// level of defense for what's actually at risk.

const SIGNATURES = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  'image/webp': [0x52, 0x49, 0x46, 0x46], // 'RIFF' - the WEBP tag itself sits at byte 8, checked separately below
  'image/heic': [0x66, 0x74, 0x79, 0x70], // 'ftyp' at byte offset 4 - checked separately below
  'application/pdf': [0x25, 0x50, 0x44, 0x46], // '%PDF'
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB - generous for a phone photo, well short of anything designed to exhaust storage/bandwidth
const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024; // 15MB - PDFs run a bit larger than photos

function bytesMatch(bytes, signature, offset = 0) {
  return signature.every((b, i) => bytes[offset + i] === b);
}

async function detectType(file) {
  const buffer = await file.slice(0, 16).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (bytesMatch(bytes, SIGNATURES['image/jpeg'])) return 'image/jpeg';
  if (bytesMatch(bytes, SIGNATURES['image/png'])) return 'image/png';
  if (bytesMatch(bytes, SIGNATURES['image/webp']) && bytesMatch(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp';
  if (bytesMatch(bytes, SIGNATURES['image/heic'], 4)) return 'image/heic';
  if (bytesMatch(bytes, SIGNATURES['application/pdf'])) return 'application/pdf';
  return null;
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

/**
 * @param {File} file
 * @param {'image' | 'document'} kind
 * @returns {Promise<{valid: boolean, error?: string, detectedType?: string}>}
 */
export async function validateUpload(file, kind) {
  const maxBytes = kind === 'document' ? MAX_DOCUMENT_BYTES : MAX_IMAGE_BYTES;
  if (file.size > maxBytes) {
    return { valid: false, error: `File is too large (max ${Math.round(maxBytes / 1024 / 1024)}MB).` };
  }

  const detectedType = await detectType(file);
  if (!detectedType) {
    return { valid: false, error: 'File type not recognized - only JPEG, PNG, WebP, HEIC images and PDF documents are accepted.' };
  }

  if (kind === 'document' && detectedType !== 'application/pdf') {
    return { valid: false, error: 'Documents must be PDF files.' };
  }
  if (kind === 'image' && !IMAGE_TYPES.includes(detectedType)) {
    return { valid: false, error: 'Images must be JPEG, PNG, WebP, or HEIC.' };
  }

  return { valid: true, detectedType };
}
