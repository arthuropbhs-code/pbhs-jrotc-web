import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // 1. Set the basic user object first
        setUser(firebaseUser);

        // 2. Start the listener for the Firestore user document
        const userDocRef = doc(db, "users", firebaseUser.uid);
        
        const unsubscribeDoc = onSnapshot(userDocRef, 
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
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
            setRole('guest');
            setLoading(false);
          }
        );

        // Cleanup doc listener if auth changes
        return () => unsubscribeDoc();
      } else {
        // No user logged in
        setUser(null);
        setRole(null);
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  return { user, role, userData, loading };
};