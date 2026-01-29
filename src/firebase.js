// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA-km6JyYMxPETPKP4ruzVX29Hep7a8Y5Y",
  authDomain: "pbhs-jrotc-web.firebaseapp.com",
  projectId: "pbhs-jrotc-web",
  storageBucket: "pbhs-jrotc-web.firebasestorage.app",
  messagingSenderId: "556367355848",
  appId: "1:556367355848:web:1e8a8c570b8bc3ef5e2afd",
  measurementId: "G-2L82CXZ0LJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// 2. Initialize services and EXPORT them
export const auth = getAuth(app);
export const db = getFirestore(app);