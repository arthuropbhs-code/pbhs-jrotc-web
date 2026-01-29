import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // 1. Get the user's UID
          const uid = firebaseUser.uid;
          // 2. Fetch their specific data from Firestore
          const docRef = doc(db, "users", uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setRole(docSnap.data().role);
            setUserData(docSnap.data());
          }
          setUser(firebaseUser);
        } else {
          setUser(null);
          setRole(null);
          setUserData(null);
        }
      } catch (error) {
        console.error("Auth Hook Error:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { user, role, userData, loading };
};