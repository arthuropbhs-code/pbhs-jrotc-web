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

/**
 * Low-level: upload any already-validated File to an explicit Storage path.
 * Use this when the caller controls the path (e.g. S1 form submissions organised
 * by event, not by cadet UID). For PNG→JPEG conversion + standard path-building
 * use uploadCadetDocument() instead.
 *
 * @param {File}     file
 * @param {string}   path        - full Storage path, e.g. "form-submissions/evtId/sub_123.jpg"
 * @param {Function} [onProgress] - optional callback(percent: number)
 * @returns {Promise<{ url: string, storagePath: string, fileName: string, bytes: number }>}
 */
export async function uploadFileToPath(file, path, onProgress) {
  const storageRef = ref(storage, path);
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, { contentType: file.type });
    task.on(
      'state_changed',
      (snap) => { if (onProgress) onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)); },
      reject,
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve({ url, storagePath: path, fileName: file.name, bytes: file.size });
        } catch (err) { reject(err); }
      },
    );
  });
}
import { validateUpload, validateCadetDocument } from './validateUpload';

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
 * Upload a cadet's yearly form document to Firebase Storage.
 *
 * Accepts JPEG, WebP, PNG, or PDF. PNG files are silently converted to JPEG
 * before upload (same readability, ~3–5× smaller file). The returned
 * `wasConverted` flag lets callers show a "saved as JPEG" note if desired.
 *
 * Files land at:
 *   cadet-documents/{uid}/{timestamp}_{filename}
 *
 * @param {File}     file
 * @param {string}   uid          - Firebase Auth UID of the cadet the doc belongs to
 * @param {Function} [onProgress] - optional callback(percent: number)
 * @returns {Promise<{ url: string, storagePath: string, fileName: string, bytes: number, wasConverted: boolean }>}
 */
export async function uploadCadetDocument(file, uid, onProgress) {
  const { valid, error, file: outFile, wasConverted } = await validateCadetDocument(file);
  if (!valid) throw new Error(error);

  const safeName = outFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path     = `cadet-documents/${uid}/${Date.now()}_${safeName}`;
  const result   = await uploadFileToPath(outFile, path, onProgress);
  return { ...result, wasConverted };
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
