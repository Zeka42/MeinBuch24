
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCVa3EboIsHKxPbFeQRutWqIvEYCtscp2g",
  authDomain: "bucherstellung-511c9.firebaseapp.com",
  projectId: "bucherstellung-511c9",
  storageBucket: "bucherstellung-511c9.firebasestorage.app",
  messagingSenderId: "638041735374",
  appId: "1:638041735374:web:7ca6f3b560174b1eb8909f",
  measurementId: "G-T4SFF1ST4Q"
};

// Initialize Modular App
let app;
if (getApps().length > 0) {
  app = getApp();
} else {
  app = initializeApp(firebaseConfig);
}

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

// Explicitly set persistence to local to avoid session issues
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Firebase Persistence Error:", error);
});
