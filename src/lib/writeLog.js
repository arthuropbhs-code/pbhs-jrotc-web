// src/lib/writeLog.js
//
// Writes a structured entry to the `adminLog` Firestore collection.
// Non-blocking and non-throwing — failures are swallowed with a console
// warning so a logging hiccup never interrupts the user's primary action.
//
// Entry schema:
//   type        'manual' | 'auth' | 'uniform' | 'form' | 'roster' | 'account'
//   action      verb string: 'login', 'approve', 'decline', 'issue', 'create',
//               'update', 'delete', 'graduate', 'role-change', …
//   description Human-readable sentence logged in the activity feed.
//   userId      UID of the actor.
//   userFullName Display name of the actor.
//   userRole    (optional) role string of the actor.
//   targetId    (optional) ID of the affected document.
//   targetName  (optional) Display name of the affected entity (cadet name, etc).
//   category    (optional) Manual-log category tag.
//   notes       (optional) Extra freetext (manual log body).
//   timestamp   Server-set Firestore timestamp.

import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * @param {{
 *   type:        'manual'|'auth'|'uniform'|'form'|'roster'|'account',
 *   action:      string,
 *   description: string,
 *   userId:      string,
 *   userFullName:string,
 *   userRole?:   string,
 *   targetId?:   string|null,
 *   targetName?: string|null,
 *   category?:   string|null,
 *   notes?:      string|null,
 * }} params
 */
export async function writeLog({
  type,
  action,
  description,
  userId,
  userFullName,
  userRole       = '',
  targetId       = null,
  targetName     = null,
  category       = null,
  notes          = null,
}) {
  try {
    await addDoc(collection(db, 'adminLog'), {
      type,
      action,
      description,
      userId,
      userFullName,
      userRole,
      targetId,
      targetName,
      category,
      notes,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[writeLog] Failed to write log entry:', err);
  }
}
