// firebase-messaging-sw.js
// Background push notification handler for Firebase Cloud Messaging.
// This file is served as a static asset — it cannot use import.meta.env (Vite
// transforms only apply to the main bundle). Firebase config values are
// inlined here; they are intentionally public (same values shipped in the
// frontend bundle that every visitor downloads).

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyA-km6JyYMxPETPKP4ruzVX29Hep7a8Y5Y',
  authDomain:        'pbhs-jrotc-web.firebaseapp.com',
  projectId:         'pbhs-jrotc-web',
  storageBucket:     'pbhs-jrotc-web.firebasestorage.app',
  messagingSenderId: '556367355848',
  appId:             '1:556367355848:web:1e8a8c570b8bc3ef5e2afd',
});

const messaging = firebase.messaging();

// Fires when the app is NOT in the foreground (tab closed / minimised).
// The FCM SDK automatically shows notifications when notification.title is
// set — override here to control icon, badge, and tag.
messaging.onBackgroundMessage(payload => {
  const { title = 'PBHS JROTC', body = '' } = payload.notification || {};
  self.registration.showNotification(title, {
    body,
    icon:  '/icon-192.png',
    badge: '/icon-192.png',
    tag:   'pbhs-jrotc-push', // collapses multiple rapid pushes into one
    data:  payload.data || {},
  });
});
