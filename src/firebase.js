import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserSessionPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

// Using import.meta.env to keep keys secure
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize variables outside so they can be safely exported
let app;
let auth;
let db;
let storage;

try {
  // Only attempt to start Firebase if an API key is actually present
  if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    // Session-only persistence: closing the browser/tab logs the user out,
    // instead of Firebase's default of staying signed in indefinitely.
    setPersistence(auth, browserSessionPersistence);
    db = getFirestore(app);
    storage = getStorage(app);

    // isSupported() guards against environments without analytics support
    // (e.g. browsers blocking storage) instead of letting getAnalytics() throw.
    // Wrapped defensively end-to-end - a rejected config fetch or a bad
    // measurementId/appId shouldn't be able to break anything else on the
    // page just because analytics couldn't start.
    if (firebaseConfig.measurementId) {
      isSupported()
        .then((supported) => {
          if (!supported) return;
          try {
            getAnalytics(app);
          } catch (error) {
            console.warn("Firebase Analytics failed to initialize:", error);
          }
        })
        .catch((error) => {
          console.warn("Firebase Analytics support check failed:", error);
        });
    }
  } else {
    console.warn("Firebase configuration keys are missing. Skipping initialization.");
  }
} catch (error) {
  console.error("Firebase failed to initialize cleanly:", error);
}

// Export services safely so your pages don't crash when opening the site
export { auth, db, storage };