// /Users/rd/CaseManageVue/src/firebase-jepson.js
// Firebase configuration for casemanagevue-jepson project

import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  browserLocalPersistence,
  connectAuthEmulator
} from "firebase/auth";
import { 
  getFirestore, 
  connectFirestoreEmulator 
} from "firebase/firestore";
import { 
  getStorage, 
  connectStorageEmulator 
} from "firebase/storage";
import { 
  getFunctions, 
  connectFunctionsEmulator 
} from "firebase/functions";

// Jepson Firebase configuration - YOU NEED TO UPDATE THESE VALUES
const firebaseConfig = {
  apiKey: "YOUR_JEPSON_API_KEY",
  authDomain: "casemanagevue-jepson.firebaseapp.com",
  projectId: "casemanagevue-jepson",
  storageBucket: "casemanagevue-jepson.firebasestorage.app",
  messagingSenderId: "YOUR_JEPSON_SENDER_ID",
  appId: "YOUR_JEPSON_APP_ID",
  measurementId: "YOUR_JEPSON_MEASUREMENT_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig, 'jepson');

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

// Set persistence for auth
auth.setPersistence(browserLocalPersistence);

// Google Auth Provider
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

// Only check Gmail scope in production
if (window.location.hostname !== '127.0.0.1' && window.location.hostname !== 'localhost') {
  // Add Gmail scope checking if needed for Jepson project
  console.log('🔧 Jepson Firebase initialized for production');
}

export { auth, db, storage, functions, provider };
export default app;