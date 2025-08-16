import { ref, watch } from 'vue'
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/firebase'

const DEFAULT_SETTINGS = {
  grades: [],
  classServices: [
    { name: 'SDC', subcategories: ['English', 'Math', 'History', 'Science'], enabledSubcategories: ['English', 'Math', 'History', 'Science'] },
    { name: 'Co-teach', subcategories: ['English', 'Math', 'History', 'Science'], enabledSubcategories: ['English', 'Math', 'History', 'Science'] },
    { name: 'RSP', subcategories: ['English', 'Math', 'History', 'Science'], enabledSubcategories: ['English', 'Math', 'History', 'Science'] },
    { name: 'Other', subcategories: ['FA', 'Directed Studies', 'DS: Reading Intv'], enabledSubcategories: ['FA', 'Directed Studies', 'DS: Reading Intv'] }
  ],
  sdcSubcategories: [],
  customClassServices: [],
  serviceProviders: ['SLP', 'OT', 'PT', 'SC', 'MH', 'TR', 'AUD', 'VI', 'AT', 'DHH', 'O&M', 'BIS', 'HN', 'SW'],
  customServiceProviders: [],
  numPeriods: 7,
  periodLabels: ['1', '2', '3', '4', '5', '6', 'sh'],
  gmailApi: {
    enabled: false,
    isWorkspace: false,
    isInternalOAuth: false,
    lastCheck: null
  }
}

// Global singleton state
const appSettings = ref({ ...DEFAULT_SETTINGS })
const loading = ref(false)
const error = ref(null)
let isInitialized = false

export function useAppSettings() {
  const settingsDocRef = doc(db, 'app_settings', 'global')

    const loadAppSettings = async () => {
    if (loading.value) {
      return new Promise((resolve) => {
        const unwatch = watch(loading, (newLoading) => {
          if (!newLoading) {
            unwatch()
            resolve(appSettings.value)
          }
        })
      })
    }

    if (isInitialized && !error.value) {
      return appSettings.value
    }

    loading.value = true
    error.value = null
    try {
      const docSnap = await getDoc(settingsDocRef)
      appSettings.value = docSnap.exists() ? docSnap.data() : { ...DEFAULT_SETTINGS }
      
      // Note: Auto-check Gmail API removed to prevent infinite loops
      // Users can manually check Gmail API status from the App Settings page
    } catch (e) {
      appSettings.value = { ...DEFAULT_SETTINGS }
    } finally {
      loading.value = false
      isInitialized = true
    }
    return appSettings.value
  }

  // Save app settings to Firestore
  const saveAppSettings = async (settings) => {
    loading.value = true
    error.value = null
    
    try {
      const settingsRef = doc(db, 'app_settings', 'global')
      await setDoc(settingsRef, settings)
      
      // Update the reactive appSettings after successful save
      appSettings.value = { ...settings }
      
      // Also save to localStorage as backup
      try {
        localStorage.setItem('app_settings_backup', JSON.stringify(settings))
      } catch (backupError) {
        console.warn('⚠️ Failed to save localStorage backup:', backupError)
      }
      
    } catch (e) {
      error.value = e.message || 'Unknown error'
      
      // Fallback to localStorage if Firestore fails
      try {
        localStorage.setItem('app_settings_backup', JSON.stringify(settings))
        console.warn('⚠️ saveAppSettings: Fell back to localStorage due to Firestore error')
      } catch (fallbackError) {
        console.error('❌ Both Firestore and localStorage saves failed:', fallbackError)
        throw new Error('Failed to save settings to both Firestore and localStorage')
      }
    } finally {
      loading.value = false
    }
  }

  const resetAppSettings = async () => {
    loading.value = true
    error.value = null
    try {
      await setDoc(settingsDocRef, { ...DEFAULT_SETTINGS })
      // Update the local state immediately without reloading
      appSettings.value = { ...DEFAULT_SETTINGS }
      isInitialized = true
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  // Auto-load settings on first use
  if (!isInitialized && !loading.value) {
    loadAppSettings()
  }

  // Check if Google Workspace and internal OAuth are configured
  const checkGmailApiStatus = async () => {
    try {
      // Skip OAuth validation to avoid authentication issues
      console.log('ℹ️ Skipping OAuth validation to avoid authentication issues');
      const gmailScopeAdded = false
      
      // Try to get more detailed info about the OAuth setup
      let isWorkspace = false
      let isInternalOAuth = gmailScopeAdded
      
      try {
        const response = await fetch('https://oauth2.googleapis.com/tokeninfo')
        if (response.ok) {
          const data = await response.json()
          isWorkspace = data.hd && data.hd.includes('.')
        }
      } catch (tokenError) {
        console.warn('Could not get detailed OAuth info:', tokenError)
      }

      // Update settings in memory only (don't auto-save to prevent infinite loops)
      const gmailApiStatus = {
        enabled: gmailScopeAdded,
        isWorkspace,
        isInternalOAuth,
        lastCheck: new Date().toISOString()
      }

      // Update the reactive settings without saving
      appSettings.value = {
        ...appSettings.value,
        gmailApi: gmailApiStatus
      }

      return gmailApiStatus
    } catch (error) {
      console.error('Failed to check Gmail API status:', error)
      return {
        enabled: false,
        isWorkspace: false,
        isInternalOAuth: false,
        lastCheck: new Date().toISOString(),
        error: error.message
      }
    }
  }

  return {
    appSettings,
    loadAppSettings,
    saveAppSettings,
    resetAppSettings,
    checkGmailApiStatus,
    loading,
    error
  }
} 