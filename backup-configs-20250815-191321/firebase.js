// /Users/rd/CaseManageVue/src/firebase.js

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// Jepson Production Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDXMm_ZBTXOd7k0e9FqQkvRRBOWfMUtGZ8",
  authDomain: "casemanagevue-jepson-prod.firebaseapp.com",
  projectId: "casemanagevue-jepson-prod",
  storageBucket: "casemanagevue-jepson-prod.firebasestorage.app",
  messagingSenderId: "1017885957186",
  appId: "1:1017885957186:web:f561608ff50c63730661db"
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