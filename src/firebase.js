import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserSessionPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// firebase/analytics is loaded via dynamic import() below instead of a
// static import here, so its code doesn't ship in the critical-path
// bundle every page downloads up front - it's non-critical telemetry.

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

// Held after analytics loads so setAnalyticsAdminMode can toggle collection
// on route changes without re-importing the module each time.
let analyticsInstance = null;

// Gate: analytics never loads until the user has actually accepted cookies
// via the CookieConsent banner - loading GA unconditionally on every visit
// (what this used to do) is exactly the thing a consent banner exists to
// prevent. CONSENT_KEY is the single source of truth CookieConsent.jsx reads
// and writes too.
export const CONSENT_KEY = 'cookie-consent';

function loadAnalytics() {
  if (!app || !firebaseConfig.measurementId) return;
  // Dynamically imported so firebase/analytics's code is fetched and
  // parsed in its own chunk after the app's critical render, not bundled
  // into the initial vendor-firebase chunk every page pays for up front.
  // isSupported() guards against environments without analytics support
  // (e.g. browsers blocking storage) instead of letting getAnalytics() throw.
  // Wrapped defensively end-to-end - a rejected config fetch or a bad
  // measurementId/appId shouldn't be able to break anything else on the
  // page just because analytics couldn't start.
  import("firebase/analytics")
    .then(({ getAnalytics, isSupported }) =>
      isSupported().then((supported) => {
        if (!supported) return;
        try {
          analyticsInstance = getAnalytics(app);
          // Apply initial admin-mode check — if the user accepted cookies while
          // already on an admin page, disable collection immediately.
          if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
            const { setAnalyticsCollectionEnabled } = await import("firebase/analytics");
            setAnalyticsCollectionEnabled(analyticsInstance, false);
          }
        } catch (error) {
          console.warn("Firebase Analytics failed to initialize:", error);
        }
      })
    )
    .catch((error) => {
      console.warn("Firebase Analytics support check failed:", error);
    });
}

// Called by CookieConsent.jsx when the user clicks Accept - the only path
// analytics ever loads through, besides an already-accepted prior visit.
export function enableAnalytics() {
  try {
    localStorage.setItem(CONSENT_KEY, 'accepted');
  } catch {
    // Storage can throw in locked-down/private-browsing contexts - consent
    // just won't persist across visits there, not worth failing over.
  }
  loadAnalytics();
}

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

    if (typeof window !== 'undefined' && localStorage.getItem(CONSENT_KEY) === 'accepted') {
      loadAnalytics();
    }
  } else {
    console.warn("Firebase configuration keys are missing. Skipping initialization.");
  }
} catch (error) {
  console.error("Firebase failed to initialize cleanly:", error);
}

// Called by App.jsx on every route change. Disables GA collection while the
// user is on any /admin/* page, re-enables it on public pages. No-ops
// gracefully if analytics hasn't loaded yet (consent not given).
export function setAnalyticsAdminMode(isAdmin) {
  if (!analyticsInstance) return;
  import("firebase/analytics")
    .then(({ setAnalyticsCollectionEnabled }) => {
      setAnalyticsCollectionEnabled(analyticsInstance, !isAdmin);
    })
    .catch(() => {});
}

// Export services safely so your pages don't crash when opening the site
export { auth, db, storage };