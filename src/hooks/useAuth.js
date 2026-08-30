import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeDoc = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      // Tear down the previous user's doc listener before attaching a new one
      // (or clearing state) - this callback can fire again for the same effect run.
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      if (firebaseUser) {
        // 1. Set the basic user object first
        setUser(firebaseUser);

        // 2. Start the listener for the Firestore user document
        const userDocRef = doc(db, "users", firebaseUser.uid);

        unsubscribeDoc = onSnapshot(userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              // A staff-triggered suspension disables the Firebase Auth
              // account itself (blocks future sign-ins natively), but an
              // already-open session's ID token stays valid until it
              // expires. This forces an immediate sign-out the moment the
              // Firestore flag flips, instead of waiting up to an hour.
              if (data.suspended) {
                sessionStorage.setItem('accountSuspended', '1');
                signOut(auth);
                return;
              }
              setUserData(data);
              setRole(data.role || 'cadet');
            } else {
              // Doc missing in Firestore
              setUserData(null);
              setRole('guest');
            }
            setLoading(false);
          },
          (error) => {
            console.warn("Firestore: Access pending or denied.", error);
            // Only fall back to 'guest' if no role has been established yet
            // for this session. A transient WebChannel failure (token refresh,
            // brief connectivity blip) should never kick a logged-in admin by
            // resetting their role — keep whatever role we already confirmed.
            setRole(prev => prev ?? 'guest');
            setLoading(false);
          }
        );
      } else {
        // No user logged in
        setUser(null);
        setRole(null);
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  return { user, role, userData, loading };
};