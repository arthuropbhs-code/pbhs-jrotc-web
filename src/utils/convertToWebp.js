// Converts any browser-decodable image (JPEG, PNG, HEIC where the browser
// supports it, etc.) to a WebP File via canvas re-encoding. This is what
// lets "only store WebP" coexist with "just let someone upload the photo
// straight off their phone" - the conversion happens client-side before
// upload, so nobody has to know or care that the site only stores WebP.
//
// Quality 0.85 is a deliberate middle ground: visually lossless for photos
// at the sizes this site displays them, while still meaningfully smaller
// than the JPEG/PNG originals phones tend to produce.
const QUALITY = 0.85;

export function convertToWebp(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        URL.revokeObjectURL(objectUrl);
        if (!blob) {
          reject(new Error('Could not convert image to WebP.'));
          return;
        }
        const newName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
        resolve(new File([blob], newName, { type: 'image/webp' }));
      }, 'image/webp', QUALITY);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read image file.'));
    };

    img.src = objectUrl;
  });
}
