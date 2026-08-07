import { describe, it, expect } from 'vitest';
import { validateUpload } from './validateUpload';

// Builds a File whose actual bytes start with the given signature, regardless
// of what name/MIME type is claimed - this is exactly the "disguised file"
// scenario the validator exists to catch, so tests deliberately mismatch the
// claimed type from the real bytes in several cases below.
const fileWithBytes = (bytes, name, claimedType) =>
  new File([new Uint8Array(bytes)], name, { type: claimedType });

const JPEG_BYTES = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10];
const PNG_BYTES = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
const WEBP_BYTES = [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50];
const PDF_BYTES = [0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34];
const EXE_BYTES = [0x4D, 0x5A, 0x90, 0x00]; // 'MZ' - real Windows PE executable signature

describe('validateUpload', () => {
  it('accepts a real JPEG for kind=image', async () => {
    const result = await validateUpload(fileWithBytes(JPEG_BYTES, 'photo.jpg', 'image/jpeg'), 'image');
    expect(result.valid).toBe(true);
    expect(result.detectedType).toBe('image/jpeg');
  });

  it('accepts a real PNG, WebP for kind=image', async () => {
    const png = await validateUpload(fileWithBytes(PNG_BYTES, 'a.png', 'image/png'), 'image');
    expect(png.valid).toBe(true);
    const webp = await validateUpload(fileWithBytes(WEBP_BYTES, 'a.webp', 'image/webp'), 'image');
    expect(webp.valid).toBe(true);
  });

  it('accepts a real PDF for kind=document', async () => {
    const result = await validateUpload(fileWithBytes(PDF_BYTES, 'doc.pdf', 'application/pdf'), 'document');
    expect(result.valid).toBe(true);
    expect(result.detectedType).toBe('application/pdf');
  });

  it('rejects a PDF submitted as kind=image', async () => {
    const result = await validateUpload(fileWithBytes(PDF_BYTES, 'doc.pdf', 'application/pdf'), 'image');
    expect(result.valid).toBe(false);
  });

  it('rejects a JPEG submitted as kind=document (documents must be PDF)', async () => {
    const result = await validateUpload(fileWithBytes(JPEG_BYTES, 'photo.jpg', 'image/jpeg'), 'document');
    expect(result.valid).toBe(false);
  });

  it('rejects an executable disguised with a .jpg name and image/jpeg MIME type', async () => {
    // The whole point of byte-sniffing: the claimed name/type say "image",
    // the actual bytes say "Windows executable" - must not be trusted.
    const disguised = fileWithBytes(EXE_BYTES, 'totally-a-photo.jpg', 'image/jpeg');
    const result = await validateUpload(disguised, 'image');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/not recognized/i);
  });

  it('rejects a file over the size limit even with valid bytes', async () => {
    const bigBytes = new Uint8Array(11 * 1024 * 1024); // 11MB, over the 10MB image cap
    bigBytes.set(JPEG_BYTES);
    const big = new File([bigBytes], 'huge.jpg', { type: 'image/jpeg' });
    const result = await validateUpload(big, 'image');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/too large/i);
  });
});
