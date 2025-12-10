/// <reference types="vite/client" />
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";

// Environment variables must be set in your deployment platform (Coolify)
// Vite replaces import.meta.env.VITE_... statically at build time.

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Modular App
let app;
try {
    if (getApps().length > 0) {
      app = getApp();
    } else {
      app = initializeApp(firebaseConfig);
    }
} catch (e) {
    console.error("Firebase Initialization Error. Check your Environment Variables.", e);
}

// Export services, ensuring app is initialized
export const db = app ? getFirestore(app) : {} as any;
export const storage = app ? getStorage(app) : {} as any;
export const auth = app ? getAuth(app) : {} as any;

if (auth) {
    // Explicitly set persistence to local to avoid session issues
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error("Firebase Persistence Error:", error);
    });
}