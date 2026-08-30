// src/lib/fcm.js
//
// Firebase Cloud Messaging utilities — permission, token lifecycle, and
// foreground message handling. Import these instead of calling the FCM SDK
// directly so all token storage stays consistent.
//
// Token storage: users/{uid}.fcmTokens  (array — supports multiple devices)
// The Firestore self-update rule allows users to write their own fcmTokens
// field since it is not in the protected-field blocklist.

import { getApp }      from 'firebase/app';
import { getMessaging, getToken, deleteToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';

const SW_PATH   = '/firebase-messaging-sw.js';
const VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY;

// ── Lazy singleton ────────────────────────────────────────────────────────────

let _messaging = null;

function getMessagingInstance() {
  if (!_messaging) {
    try {
      _messaging = getMessaging(getApp());
    } catch (err) {
      console.warn('FCM: Firebase app not initialized', err);
      throw err;
    }
  }
  return _messaging;
}

// ── Service Worker ────────────────────────────────────────────────────────────

let _swRegistration = null;

async function getSwRegistration() {
  if (_swRegistration) return _swRegistration;
  if (!('serviceWorker' in navigator)) throw new Error('Service workers not supported');
  _swRegistration = await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
  await navigator.serviceWorker.ready;
  return _swRegistration;
}

// ── Exported utilities ────────────────────────────────────────────────────────

/**
 * Request notification permission and store the FCM token in Firestore.
 *
 * Returns the token string, or null if permission was denied or VAPID key
 * is missing.  Throws on unexpected Firebase/network errors.
 */
export async function requestAndStoreToken(userId) {
  if (!VAPID_KEY) {
    console.warn('FCM: VITE_FCM_VAPID_KEY is not set — push notifications disabled');
    return null;
  }
  if (!('Notification' in window)) return null;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const sw      = await getSwRegistration();
  const msg     = getMessagingInstance();
  const token   = await getToken(msg, { vapidKey: VAPID_KEY, serviceWorkerRegistration: sw });

  if (token && userId) {
    await updateDoc(doc(db, 'users', userId), { fcmTokens: arrayUnion(token) });
  }
  return token || null;
}

/**
 * Delete the current FCM token and remove it from Firestore.
 * Call this when the user explicitly opts out of push notifications.
 */
export async function removeAndClearToken(userId, token) {
  try {
    const msg = getMessagingInstance();
    await deleteToken(msg);
  } catch (err) {
    // Token may already be invalid — safe to ignore.
    console.warn('FCM: deleteToken failed (token may already be expired)', err);
  }
  if (userId && token) {
    await updateDoc(doc(db, 'users', userId), { fcmTokens: arrayRemove(token) });
  }
}

/**
 * Get the current FCM token WITHOUT requesting permission.
 * Returns null if permission isn't already granted or VAPID key missing.
 * Use this on page load to refresh the stored token silently.
 */
export async function getCurrentToken() {
  if (!VAPID_KEY || Notification.permission !== 'granted') return null;
  try {
    const sw    = await getSwRegistration();
    const msg   = getMessagingInstance();
    return await getToken(msg, { vapidKey: VAPID_KEY, serviceWorkerRegistration: sw });
  } catch {
    return null;
  }
}

/**
 * Subscribe to foreground messages (tab is open and focused).
 * The FCM SDK suppresses OS notifications when the app is in the foreground,
 * so show your own in-app toast from this callback.
 *
 * Returns an unsubscribe function — call it on component unmount.
 */
export function onForegroundMessage(callback) {
  try {
    const msg = getMessagingInstance();
    return onMessage(msg, callback);
  } catch {
    return () => {};
  }
}
