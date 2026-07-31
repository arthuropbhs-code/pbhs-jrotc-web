import { useEffect, useRef } from 'react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

const IDLE_LIMIT_MS = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

// Signs a logged-in user out after IDLE_LIMIT_MS of no interaction, so a
// forgotten, unlocked device doesn't leave a session open indefinitely.
export const useIdleLogout = (isLoggedIn) => {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isLoggedIn) return;

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        signOut(auth);
      }, IDLE_LIMIT_MS);
    };

    resetTimer();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, resetTimer));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [isLoggedIn]);
};
