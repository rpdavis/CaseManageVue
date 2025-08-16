import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useGoogleSheetsRealtime, globalAuthState } from '@/composables/useGoogleSheetsRealtime'

export function useGoogleSheetsIntegration(students, users, testingData) {
  const { generateCSV, downloadCSV } = testingData
  
  // Use the existing Google Sheets composable
  const { 
    linkedSheetId,
    linkedSheetUrl,
    lastSyncTime,
    syncStatus,
    syncMessage,
    initializeGoogleAuth,
    createLinkedSheet,
    updateSheetData,
    createCustomTab,
    deleteCustomTab,
    unlinkSheet,
    checkSheetConnection
  } = useGoogleSheetsRealtime()

  // Auto-sync state
  let autoSyncInterval = null
  let hasChanges = false
  let lastStudentCount = 0

  // Initialize Google Auth and setup
  const initializeIntegration = async () => {
    try {
      // Clear any old sheet ID that might be causing 403 errors
      const oldSheetId = localStorage.getItem('casemanage_linked_sheet_id')
      if (oldSheetId && oldSheetId.startsWith('1XSL0Sl7')) {
        console.log('Clearing old sheet ID that was causing 403 errors')
        localStorage.removeItem('casemanage_linked_sheet_id')
      }
      
      await initializeGoogleAuth()
      
      // Check if we have a linked sheet
      if (linkedSheetId.value) {
        const isConnected = await checkSheetConnection()
        if (isConnected) {
          // Only sync if we have valid authentication
          if (globalAuthState.isInitialized.value && globalAuthState.accessToken.value) {
            // Do an initial sync
            await syncNow()
            // Start the hourly auto-sync
            setupAutoSync()
          } else {
            console.log('🔍 Google Auth not fully ready, skipping initial sync')
          }
        }
      }
    } catch (error) {
      console.error('Failed to initialize Google Auth:', error)
    }
  }

  // Watch for student changes to track if sync is needed
  watch(() => students.value, (newStudents, oldStudents) => {
    if (newStudents && oldStudents && newStudents !== oldStudents) {
      hasChanges = true
      console.log('📝 Student data changed, will sync on next interval')
    }
    
    // Update count for change detection
    lastStudentCount = newStudents?.length || 0
  }, { deep: true })

  // Set up hourly auto-sync interval
  const setupAutoSync = () => {
    if (autoSyncInterval) {
      clearInterval(autoSyncInterval)
    }
    
    // Auto-sync every hour (3600000 ms) if there are changes
    autoSyncInterval = setInterval(async () => {
      if (linkedSheetId.value && hasChanges && syncStatus.value !== 'syncing') {
        try {
          console.log('🔄 Hourly auto-sync starting...')
          await syncNow()
          hasChanges = false // Reset change flag after successful sync
          console.log('✅ Hourly auto-sync completed')
        } catch (error) {
          console.error('❌ Hourly auto-sync failed:', error)
          // Don't reset hasChanges so it will try again next hour
        }
      }
    }, 3600000) // 1 hour = 3600000 ms
  }

  // Cleanup auto-sync interval
  const cleanupAutoSync = () => {
    if (autoSyncInterval) {
      clearInterval(autoSyncInterval)
    }
  }

  // Create and link a Google Sheet
  const createLinkedGoogleSheet = async () => {
    try {
      await createLinkedSheet(students.value, users.value)
      // Start the hourly auto-sync for the new sheet
      setupAutoSync()
    } catch (error) {
      console.error('Failed to create linked sheet:', error)
      alert('Failed to create Google Sheet. Please make sure you are signed in to Google.')
    }
  }

  // Sync the linked sheet
  const syncNow = async () => {
    if (!linkedSheetId.value || syncStatus.value === 'syncing') return
    
    try {
      await updateSheetData(students.value, users.value)
    } catch (error) {
      console.error('Failed to sync sheet:', error)
      alert('Failed to sync sheet. Please try again.')
    }
  }

  // Force open sheet in new tab (prevent redirect issues)
  const openGoogleSheet = () => {
    if (linkedSheetUrl.value) {
      // Use window.open with specific parameters to ensure new tab
      const newWindow = window.open(linkedSheetUrl.value, '_blank', 'noopener,noreferrer')
      if (!newWindow) {
        // Fallback if popup blocked
        window.location.href = linkedSheetUrl.value
      }
    }
  }

  // Export functions
  const createGoogleSheetWithData = () => {
    const csvContent = generateCSV()
    downloadCSV(csvContent, 'student_data.csv')
    window.open('https://sheets.new', '_blank')
  }

  const createBlankGoogleSheet = () => {
    window.open('https://sheets.new', '_blank')
  }

  const exportToCSV = () => {
    const csvContent = generateCSV()
    downloadCSV(csvContent, 'student_data_export.csv')
  }

  // Format time helper
  const formatTime = (date) => {
    return new Date(date).toLocaleString()
  }

  return {
    // State from Google Sheets composable
    linkedSheetId,
    linkedSheetUrl,
    lastSyncTime,
    syncStatus,
    syncMessage,
    
    // Methods
    initializeIntegration,
    createLinkedGoogleSheet,
    syncNow,
    openGoogleSheet,
    unlinkSheet,
    createCustomTab,
    deleteCustomTab,
    
    // Export methods
    createGoogleSheetWithData,
    createBlankGoogleSheet,
    exportToCSV,
    
    // Utilities
    formatTime,
    setupAutoSync,
    cleanupAutoSync
  }
} 