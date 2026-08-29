import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Must match exactly what you register in Apple App Store Connect and
  // Google Play Console. Once set and published, never change this.
  appId: 'com.pbhsjrotc.app',

  // The name that appears under the icon on the home screen.
  appName: 'PBHS JROTC',

  // Vite's output directory — Capacitor copies this into both native projects
  // on every `npx cap sync`.
  webDir: 'dist',

  // No server.url needed in production — the app loads its own bundled files.
  // During development you can temporarily add:
  //   server: { url: 'http://<your-local-ip>:5173', cleartext: true }
  // to enable live-reload from the Vite dev server, then remove before archiving.
  server: {
    // Use the Capacitor custom scheme on iOS (capacitor://localhost) and the
    // default HTTP local server on Android (http://localhost).
    // These are standard and React Router's BrowserRouter works with both.
    androidScheme: 'https',
  },

  ios: {
    // Minimum iOS version — 15 covers ~98% of active iPhones as of 2025.
    minVersion: '15.0',
  },

  android: {
    // Minimum Android SDK version 22 = Android 5.1 (Lollipop MR1).
    // Capacitor 6 requires minimum 22.
    minWebViewVersion: 60,
  },
};

export default config;
