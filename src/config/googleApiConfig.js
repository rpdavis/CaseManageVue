// Google API configuration - imports from Firebase config
import { auth } from '@/firebase'

// Extract project info from Firebase config
const getFirebaseConfig = () => {
  return auth.app.options
}

// Google API configuration derived from Firebase project
export const getGoogleApiConfig = () => {
  const firebaseConfig = getFirebaseConfig()
  
  return {
    // Use the same API key as Firebase
    apiKey: firebaseConfig.apiKey,
    
    // Construct OAuth Client ID from project info
    // Format: {messagingSenderId}-{hash}.apps.googleusercontent.com
    clientId: `${firebaseConfig.messagingSenderId}-qe35vm8cv3jrdqhut23418a7ghfpafk5.apps.googleusercontent.com`,
    
    // Google Sheets API configuration
    discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    
    // Project info for logging
    projectId: firebaseConfig.projectId,
    messagingSenderId: firebaseConfig.messagingSenderId
  }
}

// Export individual config values for convenience
export const GOOGLE_API_KEY = () => getGoogleApiConfig().apiKey
export const GOOGLE_CLIENT_ID = () => getGoogleApiConfig().clientId
export const GOOGLE_DISCOVERY_DOCS = () => getGoogleApiConfig().discoveryDocs
export const GOOGLE_SCOPES = () => getGoogleApiConfig().scope

console.log('🔑 Google API Config loaded for project:', getGoogleApiConfig().projectId)
