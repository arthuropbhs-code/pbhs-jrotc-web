// Uploads a photo (JPEG / PNG / WebP / HEIC) directly to Firebase Storage.
// Used for S2 inspection submissions and S6 checklist photos.
//
// Files land at:
//   {folder}/{timestamp}_{filename}
//   e.g. s2-inspections/1720000000_cabinet.jpg
//        s6-checklists/1720000001_jrotc-cart.jpg
//
// Each upload returns { url, storagePath, fileName, bytes }.
// storagePath is stored in Firestore so the file can be deleted later.

import { storage } from '../firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { validateUpload } from './validateUpload';

/**
 * Upload a photo to Firebase Storage.
 * @param {File}     file
 * @param {string}   folder    - top-level folder (e.g. 's2-inspections', 's6-checklists')
 * @param {Function} [onProgress] - optional callback(percent: number)
 * @returns {Promise<{ url: string, storagePath: string, fileName: string, bytes: number }>}
 */
export async function uploadPhotoToStorage(file, folder, onProgress) {
  const { valid, error } = await validateUpload(file, 'image');
  if (!valid) throw new Error(error);

  const safeName  = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path      = `${folder}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, path);

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, {
      contentType: file.type || 'image/jpeg',
    });

    task.on(
      'state_changed',
      (snapshot) => {
        if (onProgress) {
          onProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
        }
      },
      (err) => reject(err),
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve({ url, storagePath: path, fileName: file.name, bytes: file.size });
        } catch (err) {
          reject(err);
        }
      },
    );
  });
}

/**
 * Delete a photo from Firebase Storage by its storage path.
 * Silently ignores "not found" — photo may already have been auto-deleted.
 * @param {string} storagePath
 */
export async function deletePhotoFromStorage(storagePath) {
  if (!storagePath) return;
  try {
    await deleteObject(ref(storage, storagePath));
  } catch (err) {
    if (err.code !== 'storage/object-not-found') {
      console.warn('Photo deletion warning:', err.code);
    }
  }
}
