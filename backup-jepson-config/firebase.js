// /Users/rd/CaseManageVue/src/firebase.js

import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  browserLocalPersistence
} from "firebase/auth";
import { 
  getFirestore
} from "firebase/firestore";
import { 
  getStorage
} from "firebase/storage";
import { 
  getFunctions
} from "firebase/functions";

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

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

// Production-only configuration - no emulators

// Set auth persistence for production
auth.setPersistence(browserLocalPersistence).then(() => {
  console.log('🔒 Firebase auth persistence set to LOCAL - each tab maintains independent auth state');
}).catch((error) => {
  console.error('❌ Error setting auth persistence:', error);
});

// Production Firebase configuration complete

// Set up Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Function to check if we should add Gmail scope
const checkAndAddGmailScope = async () => {
  try {
    // Check if we're in a Google Workspace environment with internal OAuth
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?client_id=${firebaseConfig.appId.split(':')[1]}`, {
      method: 'GET'
    });
    
    if (response.ok) {
      const data = await response.json();
      
      // Check if this is internal OAuth (not public)
      const isInternal = !data.error && (
        data.aud && !data.aud.includes('apps.googleusercontent.com') ||
        data.client_type === 'confidential'
      );
      
      if (isInternal) {
        googleProvider.addScope('https://www.googleapis.com/auth/gmail.compose');
        console.log('✅ Internal OAuth detected - Gmail scope added');
        return true;
      } else {
        console.log('ℹ️ Public OAuth detected - Gmail scope not added');
        return false;
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not determine OAuth type:', error);
  }
  
  // Default to not adding Gmail scope if we can't determine
  return false;
};

// Only check Gmail scope in production
if (window.location.hostname !== '127.0.0.1' && window.location.hostname !== 'localhost') {
  checkAndAddGmailScope();
}

console.log('🔥 Connected to Firebase project:', firebaseConfig.projectId);

export { auth, db, storage, functions, googleProvider, checkAndAddGmailScope };
