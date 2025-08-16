// Environment utility functions
// Provides consistent environment detection and configuration across the app

export const isDevelopment = () => {
  return import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development'
}

export const isProduction = () => {
  return import.meta.env.PROD || import.meta.env.VITE_APP_ENV === 'production'
}

export const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_BASE_URL || 'https://us-central1-casemanagevue-jepson-prod.cloudfunctions.net'
}

export const getFunctionsUrl = () => {
  return import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-casemanagevue-jepson-prod.cloudfunctions.net'
}

export const shouldEnableDebugMenu = () => {
  return true // Always enable debug menu
}

export const shouldEnableConsoleLogs = () => {
  return import.meta.env.VITE_ENABLE_CONSOLE_LOGS === 'true'
}

export const shouldUseFirebaseEmulators = () => {
  return import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true' && isDevelopment()
}

// Enhanced console logging that respects environment settings
export const devLog = (...args) => {
  if (shouldEnableConsoleLogs()) {
    console.log('[DEV]', ...args)
  }
}

export const devWarn = (...args) => {
  if (shouldEnableConsoleLogs()) {
    console.warn('[DEV]', ...args)
  }
}

export const devError = (...args) => {
  if (shouldEnableConsoleLogs()) {
    console.error('[DEV]', ...args)
  }
}

// Environment information for debugging
export const getEnvironmentInfo = () => {
  return {
    isDevelopment: isDevelopment(),
    isProduction: isProduction(),
    mode: import.meta.env.MODE,
    apiBaseUrl: getApiBaseUrl(),
    functionsUrl: getFunctionsUrl(),
    debugMenuEnabled: shouldEnableDebugMenu(),
    consoleLogsEnabled: shouldEnableConsoleLogs(),
    firebaseEmulatorsEnabled: shouldUseFirebaseEmulators(),
    firebaseProjectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    buildTimestamp: new Date().toISOString()
  }
}

// Log environment info on app start (development only)
if (isDevelopment()) {
  console.log('🌍 Environment Configuration:', getEnvironmentInfo())
} 