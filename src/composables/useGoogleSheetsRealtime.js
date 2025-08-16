import { ref, watch } from 'vue'
import { getAuth } from 'firebase/auth'
import { getGoogleApiConfig } from '@/config/googleApiConfig'

// Google Sheets API configuration
const SPREADSHEET_ID_KEY = 'casemanage_linked_sheet_id'
const SHEET_NAME = 'Student Data'

// Get Google API configuration from centralized config
const googleConfig = getGoogleApiConfig()

// Global state that persists across component instances
const globalAuthState = {
  isInitialized: ref(false),
  tokenClient: ref(null),
  accessToken: ref(''),
  tokenResolve: null
}

// Export global auth state for other composables
export { globalAuthState }

export function useGoogleSheetsRealtime() {
  const linkedSheetId = ref(localStorage.getItem(SPREADSHEET_ID_KEY) || '')
  const linkedSheetUrl = ref('')
  const lastSyncTime = ref(null)
  const syncStatus = ref('idle') // idle, syncing, success, error
  const syncMessage = ref('')
  
  // Use global authentication state
  const isInitialized = globalAuthState.isInitialized
  const tokenClient = globalAuthState.tokenClient
  const accessToken = globalAuthState.accessToken
  
  // Initialize Google Identity Services (new OAuth approach)
  const initializeGoogleAuth = () => {
    return new Promise((resolve, reject) => {
      // Check if already initialized with valid token client
      if (window.google?.accounts?.oauth2 && window.gapi?.client && tokenClient.value) {
        console.log('🔍 Google Auth already initialized, reusing existing token client')
        resolve()
        return
      }
      
      // Load the Google Identity Services library
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.onload = () => {
        // Initialize the token client only if it doesn't exist
        if (!tokenClient.value) {
          tokenClient.value = window.google.accounts.oauth2.initTokenClient({
          client_id: googleConfig.clientId,
          scope: googleConfig.scope,
          callback: (response) => {
            if (response.access_token) {
              accessToken.value = response.access_token
              isInitialized.value = true
              // Set the token for gapi client
              window.gapi.client.setToken({ access_token: response.access_token })
              // Resolve the token promise if it exists
              if (globalAuthState.tokenResolve) {
                globalAuthState.tokenResolve(response)
                globalAuthState.tokenResolve = null
              }
            } else {
              console.error('Failed to get access token')
              if (globalAuthState.tokenResolve) {
                globalAuthState.tokenResolve(null)
                globalAuthState.tokenResolve = null
              }
            }
          },
        })
        }
        
        // Load Google API client library
        const gapiScript = document.createElement('script')
        gapiScript.src = 'https://apis.google.com/js/api.js'
        gapiScript.onload = () => {
          window.gapi.load('client', async () => {
            await window.gapi.client.init({
              apiKey: googleConfig.apiKey,
              discoveryDocs: googleConfig.discoveryDocs,
            })
            resolve()
          })
        }
        document.head.appendChild(gapiScript)
      }
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
      document.head.appendChild(script)
    })
  }
  
  // Request access token
  const requestAccessToken = async () => {
    if (!tokenClient.value) {
      throw new Error('Google auth not initialized')
    }
    
    // Check if we already have a valid token
    if (accessToken.value) {
      // Test if token is still valid by making a simple API call
      try {
        await window.gapi.client.sheets.spreadsheets.get({
          spreadsheetId: '1BxiMVs0XRA5nFMRigcZ_6g3D6P6dNTMhvBSm1x7kFNg' // Test spreadsheet
        })
        return { access_token: accessToken.value }
      } catch (error) {
        // Token is invalid, need to request new one
        console.log('Token expired, requesting new one')
        accessToken.value = ''
      }
    }
    
    // Only request new token if we don't have one or it's invalid
    return new Promise((resolve, reject) => {
      // Store the resolve function
      globalAuthState.tokenResolve = resolve
      
      // Set a timeout to prevent hanging
      const timeout = setTimeout(() => {
        globalAuthState.tokenResolve = null
        reject(new Error('Token request timed out'))
      }, 30000) // 30 second timeout
      
      // Override the callback to handle the timeout
      const originalCallback = tokenClient.value.callback
      tokenClient.value.callback = (response) => {
        clearTimeout(timeout)
        tokenClient.value.callback = originalCallback
        
        if (response.access_token) {
          accessToken.value = response.access_token
          isInitialized.value = true
          window.gapi.client.setToken({ access_token: response.access_token })
          if (globalAuthState.tokenResolve) {
            globalAuthState.tokenResolve(response)
            globalAuthState.tokenResolve = null
          }
        } else {
          console.error('Failed to get access token:', response)
          if (globalAuthState.tokenResolve) {
            globalAuthState.tokenResolve(null)
            globalAuthState.tokenResolve = null
          }
        }
      }
      
      // Request the token
      try {
        tokenClient.value.requestAccessToken()
      } catch (error) {
        clearTimeout(timeout)
        tokenClient.value.callback = originalCallback
        reject(error)
      }
    })
  }
  
  // Create a new linked sheet
  const createLinkedSheet = async (students, users = []) => {
    try {
      syncStatus.value = 'syncing'
      syncMessage.value = 'Creating new Google Sheet...'
      
      // Request token if we don't have one
      if (!accessToken.value) {
        await requestAccessToken()
      }
      
      // Get current user's email for protection
      const auth = getAuth()
      const currentUserEmail = auth.currentUser?.email || ''
      
      // Create the spreadsheet
      const response = await window.gapi.client.sheets.spreadsheets.create({
        properties: {
          title: `CaseManage Student Data - ${new Date().toLocaleDateString()}`,
          locale: 'en_US',
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        sheets: [{
          properties: {
            title: SHEET_NAME,
            gridProperties: {
              rowCount: 1000,
              columnCount: 9,
              frozenRowCount: 1
            }
          }
        }]
      })
      
      const spreadsheetId = response.result.spreadsheetId
      linkedSheetId.value = spreadsheetId
      linkedSheetUrl.value = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
      
      // Save to localStorage
      localStorage.setItem(SPREADSHEET_ID_KEY, spreadsheetId)
      
      // Add initial data
      await updateSheetData(students, users)
      
      // Format the header row and add read-only protection
      const sheetId = response.result.sheets[0].properties.sheetId
      await window.gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        resource: {
          requests: [
            // Format headers
            {
              repeatCell: {
                range: {
                  sheetId: sheetId,
                  startRowIndex: 0,
                  endRowIndex: 1
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.2, green: 0.6, blue: 0.9 },
                    textFormat: {
                      bold: true,
                      foregroundColor: { red: 1, green: 1, blue: 1 }
                    }
                  }
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)'
              }
            },
            // Auto-resize columns
            {
              autoResizeDimensions: {
                dimensions: {
                  sheetId: sheetId, // Use the actual sheet ID, not 0
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: 9
                }
              }
            },
            // Add read-only protection to the entire sheet
            {
              addProtectedRange: {
                protectedRange: {
                  range: {
                    sheetId: sheetId
                  },
                  description: `Read-only protection for ${SHEET_NAME}`,
                  warningOnly: false,
                  editors: {
                    users: [], // No users can edit - completely read-only
                    domainUsersCanEdit: false
                  }
                }
              }
            }
          ]
        }
      })
      
      syncStatus.value = 'success'
      syncMessage.value = 'Sheet created and linked successfully!'
      lastSyncTime.value = new Date()
      
      // Open the sheet
      window.open(linkedSheetUrl.value, '_blank')
      
      return { spreadsheetId, url: linkedSheetUrl.value }
      
    } catch (error) {
      console.error('Error creating sheet:', error)
      syncStatus.value = 'error'
      syncMessage.value = `Failed to create sheet: ${error.message}`
      throw error
    }
  }
  
  // Update sheet data
  const updateSheetData = async (students, users = []) => {
    if (!linkedSheetId.value) {
      throw new Error('No linked sheet. Create a sheet first.')
    }
    
    try {
      syncStatus.value = 'syncing'
      syncMessage.value = 'Updating Google Sheet...'
      
      // Make sure we have a token
      if (!accessToken.value) {
        await requestAccessToken()
      }
      
      // Filter students to only include those with separate setting flag
      const filteredStudents = students.filter(student => {
        const hasSeparateSetting = student.app?.flags?.flag1 || student.flag1 || false
        return hasSeparateSetting
      })
      
      console.log('🔍 Google Sheets - Original students:', students.length)
      console.log('🔍 Google Sheets - Filtered students (separate setting only):', filteredStudents.length)
      
      // Debug log to see what students data looks like
      console.log('🔍 Google Sheets - Students data:', filteredStudents)
      if (filteredStudents && filteredStudents.length > 0) {
        console.log('🔍 Google Sheets - First student:', filteredStudents[0])
      }
      
      // Prepare the data
      const headers = [
        'Student ID',
        'First Name',
        'Last Name',
        'Grade',
        'Case Manager',
        'Separate Setting',
        'Assessment Accommodations',
        'Services',
        'Last Updated'
      ]
      
      const rows = filteredStudents.map(student => {
        // Debug log for data extraction
        console.log('🔍 Processing student:', student.id, {
          firstName: student.firstName || student.app?.studentData?.firstName,
          lastName: student.lastName || student.app?.studentData?.lastName,
          grade: student.grade || student.app?.studentData?.grade
        })
        
        return [
          student.id || '',
          student.firstName || student.app?.studentData?.firstName || '',
          student.lastName || student.app?.studentData?.lastName || '',
          student.grade || student.app?.studentData?.grade || '',
          getCaseManagerName(student, users) || '',
          getSeparateSetting(student) || '',
          getAccommodations(student, 'assessment') || '',
          getServices(student) || '',
          new Date().toLocaleString()
        ]
      })
      
      const allData = [headers, ...rows]
      console.log('🔍 Google Sheets - Data to write:', allData)
      
      // Clear the sheet first
      await window.gapi.client.sheets.spreadsheets.values.clear({
        spreadsheetId: linkedSheetId.value,
        range: `${SHEET_NAME}!A:Z`
      })
      
      // Update with new data
      const updateResponse = await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: linkedSheetId.value,
        range: `${SHEET_NAME}!A1`,
        valueInputOption: 'RAW',
        resource: {
          values: allData
        }
      })
      
      console.log('🔍 Google Sheets - Update response:', updateResponse)
      
      syncStatus.value = 'success'
      syncMessage.value = `Updated ${rows.length} students (separate setting only)`
      lastSyncTime.value = new Date()
      
    } catch (error) {
      console.error('Error updating sheet:', error)
      syncStatus.value = 'error'
      syncMessage.value = `Failed to update: ${error.message}`
      
      // If token expired, request new one
      if (error.status === 401) {
        accessToken.value = ''
        await requestAccessToken()
      }
      throw error
    }
  }
  
  // Format the header row
  const formatHeaders = async (spreadsheetId, sheetId) => {
    try {
      await window.gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        resource: {
          requests: [{
            repeatCell: {
              range: {
                sheetId: sheetId, // Use the actual sheet ID, not 0
                startRowIndex: 0,
                endRowIndex: 1
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.2, green: 0.6, blue: 0.9 },
                  textFormat: {
                    bold: true,
                    foregroundColor: { red: 1, green: 1, blue: 1 }
                  }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)'
            }
          }, {
            autoResizeDimensions: {
              dimensions: {
                sheetId: sheetId, // Use the actual sheet ID, not 0
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: 9
              }
            }
          }]
        }
      })
    } catch (error) {
      console.error('Error formatting headers:', error)
    }
  }
  
  // Unlink the sheet
  const unlinkSheet = () => {
    linkedSheetId.value = ''
    linkedSheetUrl.value = ''
    localStorage.removeItem(SPREADSHEET_ID_KEY)
    syncStatus.value = 'idle'
    syncMessage.value = ''
    lastSyncTime.value = null
  }
  
  // Helper functions
  const getCaseManagerName = (student, users = []) => {
    // Get the case manager ID from student data
    const caseManagerId = student.caseManagerId || 
                         student.app?.studentData?.caseManagerId || 
                         student.casemanager_id
    
    if (!caseManagerId) {
      return 'Not Assigned'
    }
    
    // Find the user by ID
    const user = users.find(u => u.id === caseManagerId)
    
    if (user) {
      // Return the user's name (try different name formats)
      return user.name || `${user.firstName} ${user.lastName}` || user.email || caseManagerId
    }
    
    // Fallback to ID if user not found
    return caseManagerId
  }
  
  const getAccommodations = (student, type) => {
    const accommodations = student.app?.accommodations?.[type] || 
                          student.accommodations?.[type] || 
                          []
    return Array.isArray(accommodations) ? accommodations.join(', ') : accommodations
  }
  
  const getServices = (student) => {
    const services = student.app?.classServices || 
                    student.classServices || 
                    []
    if (Array.isArray(services)) {
      return services.map(s => s.name || s).join(', ')
    }
    return services
  }

  const getSeparateSetting = (student) => {
    const hasSeparateSetting = student.app?.flags?.flag1 || student.flag1 || false
    return hasSeparateSetting ? 'True' : 'False'
  }
  
  // Check if sheet exists and is accessible
  const checkSheetConnection = async () => {
    if (!linkedSheetId.value) return false
    
    try {
      await window.gapi.client.sheets.spreadsheets.get({
        spreadsheetId: linkedSheetId.value
      })
      return true
    } catch (error) {
      if (error.status === 404) {
        // Sheet was deleted
        unlinkSheet()
      }
      return false
    }
  }

  // Create a custom tab in the sheet
  const createCustomTab = async (tabName, students, teacherIds, users = [], excludedPeriods = []) => {
    if (!linkedSheetId.value) {
      throw new Error('No linked sheet. Create a sheet first.')
    }
    
    try {
      // Make sure we have a token
      if (!accessToken.value) {
        await requestAccessToken()
      }
      
      // Get current user's email for protection
      const auth = getAuth()
      const currentUserEmail = auth.currentUser?.email || ''
      
      console.log('🔍 Creating custom tab:', tabName, 'for teachers:', teacherIds, 'excluding periods:', excludedPeriods)
      
      // First, add a new sheet (tab) to the spreadsheet
      const addSheetResponse = await window.gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: linkedSheetId.value,
        resource: {
          requests: [{
            addSheet: {
              properties: {
                title: tabName,
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 12,
                  frozenRowCount: 1
                }
              }
            }
          }]
        }
      })
      
      const newSheetId = addSheetResponse.result.replies[0].addSheet.properties.sheetId
      console.log('🔍 Created sheet with ID:', newSheetId)
      
      // Filter students to only include those with separate setting flag
      const filteredStudents = students.filter(student => {
        const hasSeparateSetting = student.app?.flags?.flag1 || student.flag1 || false
        return hasSeparateSetting
      })
      
      console.log('🔍 Custom tab - Original students:', students.length)
      console.log('🔍 Custom tab - Filtered students (separate setting only):', filteredStudents.length)
      
      // Prepare the data with teacher-specific columns
      const headers = [
        'Student ID',
        'First Name',
        'Last Name',
        'Grade',
        'Case Manager',
        'Period',
        'Teacher',
        'Subject',
        'Separate Setting',
        'Assessment Accommodations',
        'Services',
        'Last Updated'
      ]
      
      const rows = []
      filteredStudents.forEach(student => {
        // Get all periods for this student with the selected teachers, excluding specified periods
        const periods = getStudentPeriodsForTeachers(student, teacherIds, users, excludedPeriods)
        
        console.log('🔍 Student:', student.id, 'Periods found:', periods.length, 'Excluded periods:', excludedPeriods)
        periods.forEach(periodInfo => {
          console.log('🔍 Adding row for period:', periodInfo.period, 'teacher:', periodInfo.teacherName, 'source:', periodInfo.source || 'unknown')
        })
        
        periods.forEach(periodInfo => {
          rows.push([
            student.id || '',
            student.firstName || student.app?.studentData?.firstName || '',
            student.lastName || student.app?.studentData?.lastName || '',
            student.grade || student.app?.studentData?.grade || '',
            getCaseManagerName(student, users) || '',
            periodInfo.period || '',
            periodInfo.teacherName || '',
            periodInfo.subject || '',
            getSeparateSetting(student) || '',
            getAccommodations(student, 'assessment') || '',
            getServices(student) || '',
            new Date().toLocaleString()
          ])
        })
      })
      
      const allData = [headers, ...rows]
      
      // Update the new sheet with data
      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: linkedSheetId.value,
        range: `${tabName}!A1`,
        valueInputOption: 'RAW',
        resource: {
          values: allData
        }
      })
      
      // Format the header row and add read-only protection
      await window.gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: linkedSheetId.value,
        resource: {
          requests: [
            // Format headers
            {
              repeatCell: {
                range: {
                  sheetId: newSheetId,
                  startRowIndex: 0,
                  endRowIndex: 1
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.2, green: 0.6, blue: 0.9 },
                    textFormat: {
                      bold: true,
                      foregroundColor: { red: 1, green: 1, blue: 1 }
                    }
                  }
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)'
              }
            },
            // Auto-resize columns
            {
              autoResizeDimensions: {
                dimensions: {
                  sheetId: newSheetId,
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: 12
                }
              }
            },
            // Add read-only protection to the entire sheet
            {
              addProtectedRange: {
                protectedRange: {
                  range: {
                    sheetId: newSheetId
                  },
                  description: `Read-only protection for ${tabName}`,
                  warningOnly: false,
                  editors: {
                    users: [], // No users can edit - completely read-only
                    domainUsersCanEdit: false
                  }
                }
              }
            }
          ]
        }
      })
      
      // The entire spreadsheet is already read-only from the main sheet creation
      // No need to set content restriction again as it applies to the whole file
      
      console.log('🔍 Custom tab created successfully with', rows.length, 'rows and read-only protection')
      return { sheetId: newSheetId, rowCount: rows.length }
      
    } catch (error) {
      console.error('Error creating custom tab:', error)
      throw error
    }
  }
  
  // Helper function to get student periods for specific teachers
  const getStudentPeriodsForTeachers = (student, teacherIds, users = [], excludedPeriods = []) => {
    const periods = []
    
    console.log('🔍 getStudentPeriodsForTeachers for student:', student.id, 'teacherIds:', teacherIds, 'excludedPeriods:', excludedPeriods, 'excludedPeriods array:', JSON.stringify(excludedPeriods))
    
    // Create a mapping of period labels to indices for exclusion checking
    // Default period configuration: ["Per1", "Per2", "Per3", "Per4", "Per5", "Per6", "SH"]
    const defaultPeriodLabels = ["Per1", "Per2", "Per3", "Per4", "Per5", "Per6", "SH"]
    
    // Helper function to check if a period should be excluded
    const isPeriodExcluded = (periodKey) => {
      // Find the index of this period in the default configuration
      let periodIndex = -1
      
      // Handle numeric periods (1, 2, 3, etc.)
      if (/^\d+$/.test(periodKey)) {
        periodIndex = parseInt(periodKey) - 1 // Convert 1-based to 0-based
      }
      // Handle "SH" period
      else if (periodKey === 'SH') {
        periodIndex = 6 // SH is at index 6
      }
      // Handle "Per1", "Per2", etc. format
      else if (periodKey.startsWith('Per')) {
        const num = periodKey.replace('Per', '')
        if (/^\d+$/.test(num)) {
          periodIndex = parseInt(num) - 1
        }
      }
      
      console.log('🔍 Period', periodKey, 'maps to index', periodIndex, 'excluded?', excludedPeriods.includes(periodIndex.toString()))
      return excludedPeriods.includes(periodIndex.toString())
    }
    
    // Check aeries schedule structure
    if (student.aeries?.schedule) {
      const scheduleEntries = Object.entries(student.aeries.schedule)
      console.log('🔍 Aeries schedule entries:', scheduleEntries.length)
      for (let i = 0; i < scheduleEntries.length; i++) {
        const [periodKey, period] = scheduleEntries[i]
        const isExcluded = isPeriodExcluded(periodKey)
        console.log('🔍 Checking aeries period key:', periodKey, 'teacherId:', period?.teacherId, 'excluded?', isExcluded)
        if (period && period.teacherId && teacherIds.includes(String(period.teacherId))) {
          // Only include if period is not excluded
          if (!isExcluded) {
            console.log('🔍 Including aeries period', periodKey)
            periods.push({
              period: periodKey.replace('period', ''), // Keep original period number for display
              teacherId: period.teacherId,
              teacherName: getTeacherName(period.teacherId, users),
              subject: period.subject || '',
              source: 'aeries'
            })
          } else {
            console.log('🔍 Excluding aeries period', periodKey)
          }
        }
      }
    }
    
    // Check app.schedule.periods structure
    if (student.app?.schedule?.periods) {
      const periodEntries = Object.entries(student.app.schedule.periods)
      console.log('🔍 App schedule entries:', periodEntries.length)
      for (let i = 0; i < periodEntries.length; i++) {
        const [periodKey, teacherId] = periodEntries[i]
        const isExcluded = isPeriodExcluded(periodKey)
        console.log('🔍 Checking app period key:', periodKey, 'teacherId:', teacherId, 'excluded?', isExcluded)
        if (teacherId && teacherIds.includes(String(teacherId))) {
          // Only include if period is not excluded
          if (!isExcluded) {
            console.log('🔍 Including app period', periodKey)
            periods.push({
              period: periodKey,
              teacherId: teacherId,
              teacherName: getTeacherName(teacherId, users),
              subject: '', // No subject info in this structure
              source: 'app'
            })
          } else {
            console.log('🔍 Excluding app period', periodKey)
          }
        }
      }
    }
    
    // Also check for direct period properties (from CSV import)
    for (let i = 0; i < 7; i++) {
      const teacherIdField = `period${i + 1}TeacherId`
      const teacherId = student[teacherIdField] || 
                       student.aeries?.[teacherIdField] ||
                       student.app?.[teacherIdField]
      
      if (teacherId && teacherIds.includes(String(teacherId))) {
        const isExcluded = excludedPeriods.includes(i.toString())
        console.log('🔍 Checking CSV period index', i, 'field:', teacherIdField, 'teacherId:', teacherId, 'excluded?', isExcluded)
        // Only include if period index is not excluded
        if (!isExcluded) {
          console.log('🔍 Including CSV period', i)
          periods.push({
            period: (i + 1).toString(), // Display as 1, 2, 3, etc.
            teacherId: teacherId,
            teacherName: getTeacherName(teacherId, users),
            subject: '',
            source: 'csv'
          })
        } else {
          console.log('🔍 Excluding CSV period', i)
        }
      }
    }
    
    console.log('🔍 Final periods for student', student.id, ':', periods.length, periods)
    return periods
  }
  
  // Helper to get teacher name
  const getTeacherName = (teacherId, users = []) => {
    // First try to find by ID (email format)
    let user = users.find(u => u.id === teacherId)
    
    // If not found and teacherId is numeric, try to find by aeriesId
    if (!user && /^\d+$/.test(teacherId)) {
      user = users.find(u => u.aeriesId === teacherId)
    }
    
    if (user) {
      return user.name || `${user.firstName} ${user.lastName}` || `Teacher ${teacherId}`
    }
    
    return `Teacher ${teacherId}`
  }
  
  // Delete a custom tab from the sheet
  const deleteCustomTab = async (sheetId) => {
    if (!linkedSheetId.value) {
      throw new Error('No linked sheet.')
    }
    
    try {
      // Make sure we have a token
      if (!accessToken.value) {
        await requestAccessToken()
      }
      
      await window.gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: linkedSheetId.value,
        resource: {
          requests: [{
            deleteSheet: {
              sheetId: sheetId
            }
          }]
        }
      })
      
      console.log('🔍 Deleted custom tab with sheet ID:', sheetId)
      
    } catch (error) {
      console.error('Error deleting custom tab:', error)
      throw error
    }
  }
  
  return {
    isInitialized,
    linkedSheetId,
    linkedSheetUrl,
    lastSyncTime,
    syncStatus,
    syncMessage,
    initializeGoogleAuth,
    requestAccessToken,
    createLinkedSheet,
    updateSheetData,
    createCustomTab,
    deleteCustomTab,
    unlinkSheet,
    checkSheetConnection
  }
} 