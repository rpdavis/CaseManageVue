import { ref } from 'vue'
import { getGoogleApiConfig } from '@/config/googleApiConfig'

// Get Google API configuration from centralized config
const googleConfig = getGoogleApiConfig()
const { clientId: CLIENT_ID, apiKey: API_KEY, discoveryDocs: DISCOVERY_DOCS, scope: SCOPES } = googleConfig

export default function useGoogleSheetsClient() {
  const isSignedIn = ref(false)
  const gapiLoaded = ref(false)
  const currentSheetId = ref('')
  const currentSheetUrl = ref('')
  const errorMessage = ref('')

  const initializeGapi = async () => {
    try {
      if (typeof window.gapi === 'undefined') {
        throw new Error('Google API not loaded')
      }

      await window.gapi.load('client:auth2', async () => {
        await window.gapi.client.init({
          apiKey: API_KEY,
          clientId: CLIENT_ID,
          discoveryDocs: DISCOVERY_DOCS,
          scope: SCOPES
        })

        const authInstance = window.gapi.auth2.getAuthInstance()
        isSignedIn.value = authInstance.isSignedIn.get()
        
        authInstance.isSignedIn.listen((signedIn) => {
          isSignedIn.value = signedIn
        })

        gapiLoaded.value = true
        console.log('Google Sheets API initialized')
      })
    } catch (error) {
      errorMessage.value = `Failed to initialize Google API: ${error.message}`
      console.error('Google API initialization error:', error)
    }
  }

  const signIn = async () => {
    try {
      const authInstance = window.gapi.auth2.getAuthInstance()
      await authInstance.signIn()
    } catch (error) {
      errorMessage.value = `Sign-in failed: ${error.message}`
      console.error('Sign-in error:', error)
    }
  }

  const signOut = async () => {
    try {
      const authInstance = window.gapi.auth2.getAuthInstance()
      await authInstance.signOut()
      currentSheetId.value = ''
      currentSheetUrl.value = ''
    } catch (error) {
      errorMessage.value = `Sign-out failed: ${error.message}`
      console.error('Sign-out error:', error)
    }
  }

  const getSheetData = async (spreadsheetId, range) => {
    try {
      if (!isSignedIn.value) {
        throw new Error('Not signed in to Google')
      }

      const response = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId,
        range
      })

      return response.result.values || []
    } catch (error) {
      errorMessage.value = `Failed to get sheet data: ${error.message}`
      console.error('Get sheet data error:', error)
      throw error
    }
  }

  const updateSheetData = async (spreadsheetId, range, values) => {
    try {
      if (!isSignedIn.value) {
        throw new Error('Not signed in to Google')
      }

      const response = await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        resource: {
          values
        }
      })

      return response.result
    } catch (error) {
      errorMessage.value = `Failed to update sheet: ${error.message}`
      console.error('Update sheet error:', error)
      throw error
    }
  }

  const clearSheet = async (spreadsheetId, range) => {
    try {
      if (!isSignedIn.value) {
        throw new Error('Not signed in to Google')
      }

      const response = await window.gapi.client.sheets.spreadsheets.values.clear({
        spreadsheetId,
        range
      })

      return response.result
    } catch (error) {
      errorMessage.value = `Failed to clear sheet: ${error.message}`
      console.error('Clear sheet error:', error)
      throw error
    }
  }

  return {
    isSignedIn,
    gapiLoaded,
    currentSheetId,
    currentSheetUrl,
    errorMessage,
    initializeGapi,
    signIn,
    signOut,
    getSheetData,
    updateSheetData,
    clearSheet
  }
} 