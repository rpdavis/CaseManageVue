// /Users/rd/CaseManageVue/src/firebase.js

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// Production Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDx1jbQT-FzgzjASFqVA2kbAHWJ_TeUzdY",
  authDomain: "casemangervue.firebaseapp.com",
  projectId: "casemangervue",
  storageBucket: "casemangervue.firebasestorage.app",
  messagingSenderId: "756483333257",
  appId: "1:756483333257:web:694e2ad2415b7886563a58",
  measurementId: "G-YBRDQX9NFR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services with persistence configuration
const auth = getAuth(app);
auth.setPersistence(browserLocalPersistence).then(() => {
  console.log('🔒 Firebase auth persistence set to LOCAL - each tab maintains independent auth state');
}).catch((error) => {
  console.error('❌ Error setting auth persistence:', error);
});
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

// Enable debug logging in development
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Firebase debug mode enabled');
  // Enable Firestore debug logging
  import('firebase/firestore').then(({ enableMultiTabIndexedDbPersistence }) => {
    console.log('🔧 Firestore persistence enabled');
  }).catch(err => {
    console.log('🔧 Firestore persistence not enabled:', err);
  });
}

// Set up Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Function to check if we should add Gmail scope
const checkAndAddGmailScope = async () => {
  try {
    // Skip OAuth validation for now to avoid authentication issues
    // This can be re-enabled later when OAuth is properly configured
    console.log('ℹ️ Skipping OAuth validation to avoid authentication issues');
    return false;
  } catch (error) {
    console.warn('⚠️ Could not determine OAuth type:', error);
    return false;
  }
};

// Check and configure Gmail scope on initialization
checkAndAddGmailScope();

console.log('🔥 Connected to Firebase project:', firebaseConfig.projectId);

export { auth, db, storage, functions, googleProvider, checkAndAddGmailScope };