// src/store/authStore.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, getIdToken } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { useRouter } from 'vue-router'
import { auditLogger } from '@/utils/auditLogger'

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref(null)
  const errorMsg = ref('')
  const isLoading = ref(true)
  const router = useRouter()

  // Initialize auth state listener
  const initAuth = () => {
    onAuthStateChanged(auth, async (firebaseUser) => {
      isLoading.value = true
      
      if (firebaseUser) {
        try {
          // Get user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          if (userDoc.exists()) {
            currentUser.value = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName,
              ...userDoc.data()
            }
            // Set up automatic token refresh BEFORE token expires
            setupTokenRefresh()
          } else {
            currentUser.value = null
          }
        } catch (error) {
          console.error('❌ Error fetching user data:', error)
          console.error('❌ This might be due to expired token - user will be logged out')
          currentUser.value = null
        }
      } else {
        currentUser.value = null
        
        // Clear token refresh when user logs out
        clearTokenRefresh()
        
        // Redirect to login if user lost authentication (unless already on login page)
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
      
      isLoading.value = false
    })
    }

  // Token refresh interval
  let tokenRefreshInterval = null

  // Set up automatic token refresh every 30 minutes (less aggressive)
  const setupTokenRefresh = () => {
    clearTokenRefresh() // Clear any existing interval
    
    tokenRefreshInterval = setInterval(async () => {
      if (auth.currentUser) {
        try {
          const success = await refreshToken()
          if (!success) {
            console.error('❌ Failed to refresh token - logging user out for security')
            await logout()
          }
        } catch (error) {
          console.error('❌ Token refresh threw an error:', error)
          await logout()
        }
      }
    }, 45 * 60 * 1000) // 45 minutes in milliseconds - refresh BEFORE token expires (Firebase tokens last ~60 minutes)
    
    // Remove the immediate token refresh test to avoid conflicts
    // setTimeout(async () => {
    //   if (auth.currentUser) {
    //     console.log('🔄 Initial token refresh test...')
    //     await refreshToken()
    //   }
    // }, 5000) // 5 seconds after setup
  }

  // Clear token refresh interval
  const clearTokenRefresh = () => {
    if (tokenRefreshInterval) {
      clearInterval(tokenRefreshInterval)
      tokenRefreshInterval = null
    }
  }

  const loginWithGoogle = async () => {
    errorMsg.value = ''
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (!userDoc.exists()) {
        errorMsg.value = '⚠️ User not found in system.'
        return
      }

      currentUser.value = {
        uid: user.uid,
        email: user.email,
        name: user.displayName,
        ...userDoc.data()
      }

      router.push('/')
    } catch (err) {
      console.error('❌ Login error:', err)
      errorMsg.value = err.message || 'Authentication failed.'
    }
  }

  const logout = async () => {
    try {
      // Log logout before clearing user data
      if (currentUser.value) {
        await auditLogger.logSystemAccess('logout', {
          userRole: currentUser.value.role,
          success: true
        })
      }
      

      
      await signOut(auth)
      currentUser.value = null

      router.push('/login')
    } catch (error) {
      console.error('❌ Logout error:', error)
      
      // Log logout error
      await auditLogger.logSystemAccess('logout_error', {
        error: error.message,
        success: false
      })
    }
  }

  // Set user manually (for debugging/testing)
  const setUser = (user) => {
    currentUser.value = user
  }

  // Force refresh user token
  const refreshToken = async () => {
    if (auth.currentUser) {
      try {
        await getIdToken(auth.currentUser, true)
        return true
      } catch (error) {
        console.error('❌ Error refreshing token:', error)
        console.error('❌ Error details:', error.code, error.message)
        return false
      }
    }
    return false
  }

  // Check if current token is valid
  const checkTokenValidity = async () => {
    if (!auth.currentUser) {
      return false
    }

    try {
      await getIdToken(auth.currentUser, false) // Don't force refresh, just get current
      return true
    } catch (error) {
      console.error('❌ Current token is invalid:', error)
      return false
    }
  }

  // Computed property for user
  const user = computed(() => currentUser.value)

  // Initialize auth state when store is created
  initAuth()

  return { 
    currentUser, 
    user,
    errorMsg, 
    isLoading,
    loginWithGoogle, 
    logout,
    setUser,
    refreshToken,
    setupTokenRefresh,
    clearTokenRefresh,
    checkTokenValidity
  }
})

