// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "agentforge-62cfe.firebaseapp.com",
  projectId: "agentforge-62cfe",
  storageBucket: "agentforge-62cfe.firebasestorage.app",
  messagingSenderId: "688241172351",
  appId: "1:688241172351:web:aacedbed976cfec014c44a",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
