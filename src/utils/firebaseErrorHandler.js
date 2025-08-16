import { auth } from '@/firebase'
import { onAuthStateChanged } from 'firebase/auth'

// Track connection state
let isReconnecting = false

// Handle Firebase connection errors
export async function handleFirebaseError(error) {
  console.error('Firebase error:', error)

  // Check for specific authentication errors that require immediate redirect
  const authErrors = [
    'permission-denied',
    'unauthenticated', 
    'auth/user-not-found',
    'auth/invalid-user-token',
    'auth/user-token-expired',
    'auth/token-expired'
  ]
  
  if (authErrors.some(code => error?.code?.includes(code) || error?.message?.includes(code))) {
    console.log('🚪 Authentication error detected - redirecting to login immediately')
    window.location.href = '/login'
    return
  }

  // If already trying to reconnect, don't start another attempt
  if (isReconnecting) {
    return
  }

  isReconnecting = true

  try {
    // Get current user
    const user = auth.currentUser

    if (user) {
      // Force token refresh
      await user.getIdToken(true)
      
      console.log('🔄 Firebase token refreshed successfully')
    } else {
      console.log('⚠️ No user signed in, redirecting to login...')
      // Redirect to login page
      window.location.href = '/login'
    }
  } catch (refreshError) {
    console.error('Failed to refresh token:', refreshError)
    // Redirect to login page on failure
    window.location.href = '/login'
  } finally {
    isReconnecting = false
  }
}

// Note: Token refresh is handled by authStore.js - no duplicate setup needed here

export function isFirebaseError(error) {
  return error?.message?.includes('firestore.googleapis.com') ||
         error?.message?.includes('firebase') ||
         error?.code?.includes('permission-denied')
} 