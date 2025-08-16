// Centralized configuration for Firebase Cloud Functions
// This file makes it easy to transfer functions to other apps by changing only this file

module.exports = {
  // ─── FIREBASE PROJECT CONFIGURATION ─────────────────────────────────────────
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || 'casemanagevue-jepson-prod',
    region: process.env.FIREBASE_REGION || 'us-central1',
    storageRegion: process.env.FIREBASE_STORAGE_REGION || 'us-west1',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'casemanagevue-jepson-prod.appspot.com'
  },

  // ─── FUNCTION CONFIGURATION ────────────────────────────────────────────────
  functions: {
    // Default regions for functions
    defaultRegion: 'us-central1',
    storageRegion: 'us-west1',
    
    // Memory and timeout settings
    memory: '256MB',
    timeoutSeconds: 540, // 9 minutes
    
    // Instance limits
    maxInstances: 10,
    
    // HTTP function settings
    allowUnauthenticated: false,
    cors: {
      origin: true,
      credentials: true
    }
  },

  // ─── COLLECTION NAMES ──────────────────────────────────────────────────────
  collections: {
    students: 'students',
    users: 'users',
    usersByUID: 'usersByUID',
    appSettings: 'app_settings',
    security: 'app_settings/security',
    theme: 'app_settings/theme',
    aideSchedules: 'aideSchedules',
    config: 'config',
    feedbackForms: 'feedbackForms',
    feedbackResponses: 'feedbackResponses',
    feedbackSendLog: 'feedbackSendLog',
    feedbackDocuments: 'feedbackDocuments',
    testing: 'testing',
    auditLogs: 'auditLogs',
    iepAccessLogs: 'iepAccessLogs',
    pdfAccessLogs: 'pdfAccessLogs',
    pdfMetadata: 'pdfMetadata',
    emailLogs: 'emailLogs',
    paraeducatorAssignments: 'paraeducatorAssignments'
  },

  // ─── STORAGE PATHS ─────────────────────────────────────────────────────────
  storage: {
    // Student file paths
    studentsPath: 'students',
    sensitivePath: 'students/{studentId}/sensitive',
    generalPath: 'students/{studentId}/general',
    encryptedPdfsPath: 'encrypted-pdfs',
    
    // Admin paths
    adminPath: 'admin',
    publicPath: 'public',
    
    // File access settings
    downloadTokenExpiry: 15 * 60 * 1000, // 15 minutes
    signedUrlExpiry: 5 * 60 * 1000 // 5 minutes
  },

  // ─── ROLES AND PERMISSIONS ────────────────────────────────────────────────
  roles: {
    // Valid roles for the application
    validRoles: [
      'admin', 'school_admin', 'staff_view', 'staff_edit', 
      'admin_504', 'sped_chair', 'case_manager', 'teacher', 
      'service_provider', 'paraeducator'
    ],
    
    // Admin roles that have full access
    adminRoles: ['admin', 'school_admin', 'admin_504', 'sped_chair'],
    
    // Super admin roles (can delete users, etc.)
    superAdminRoles: ['admin', 'school_admin'],
    
    // Staff roles that work with students
    staffRoles: ['case_manager', 'teacher', 'service_provider', 'paraeducator'],
    
    // Roles that can view all students
    fullReadAccessRoles: ['admin', 'school_admin', 'staff_view', 'staff_edit', 'admin_504', 'sped_chair']
  },

  // ─── STUDENT DATA CONFIGURATION ───────────────────────────────────────────
  students: {
    // Student plan types
    planTypes: ['IEP', '504'],
    
    // Default settings
    defaultPeriods: 7,
    defaultGrades: ['7', '8', '9'],
    
    // Field validation
    maxNameLength: 100,
    maxEmailLength: 255,
    maxRoleLength: 50,
    maxProviderLength: 10,
    maxAeriesIdLength: 20
  },

  // ─── AERIES API CONFIGURATION ─────────────────────────────────────────────
  aeries: {
    // Aeries API settings
    tokenEndpoint: '/token',
    grantType: 'client_credentials',
    contentType: 'application/x-www-form-urlencoded'
  },

  // ─── EMAIL CONFIGURATION ──────────────────────────────────────────────────
  email: {
    // Email settings (for future implementation)
    provider: 'sendgrid', // or 'mailgun', 'firebase-extensions'
    defaultFrom: 'noreply@casemanagevue-jepson-prod.web.app',
    templates: {
      studentNotification: 'student-notification',
      adminNotification: 'admin-notification'
    }
  },

  // ─── GOOGLE DRIVE CONFIGURATION ───────────────────────────────────────────
  googleDrive: {
    // Shared Drive settings
    driveType: 'drive#drive',
    permissions: {
      role: 'writer',
      type: 'user'
    },
    
    // Service account settings
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/spreadsheets'
    ]
  },

  // ─── SECURITY CONFIGURATION ───────────────────────────────────────────────
  security: {
    // Token refresh settings
    tokenRefreshInterval: 2 * 60 * 1000, // 2 minutes (debug mode)
    productionTokenRefreshInterval: 30 * 60 * 1000, // 30 minutes
    
    // Session timeout settings
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    warningTime: 5 * 60 * 1000, // 5 minutes before timeout
    
    // Security threat detection
    maxInputLength: 1000,
    allowedCharacters: /^[a-zA-Z0-9\s\-_@.]+$/,
    
    // FERPA compliance
    dataRetentionDays: 7 * 365, // 7 years
    auditLogRetentionDays: 10 * 365 // 10 years
  },

  // ─── LOGGING CONFIGURATION ────────────────────────────────────────────────
  logging: {
    // Log levels
    level: process.env.LOG_LEVEL || 'info',
    
    // Debug mode
    debug: process.env.NODE_ENV === 'development',
    
    // Log prefixes for easy filtering
    prefixes: {
      auth: '🔐',
      security: '🔒',
      error: '❌',
      success: '✅',
      info: 'ℹ️',
      warning: '⚠️',
      debug: '🔧'
    }
  },

  // ─── ENVIRONMENT-SPECIFIC OVERRIDES ──────────────────────────────────────
  environments: {
    development: {
      tokenRefreshInterval: 2 * 60 * 1000, // 2 minutes for debugging
      debug: true,
      logging: {
        level: 'debug'
      }
    },
    production: {
      tokenRefreshInterval: 30 * 60 * 1000, // 30 minutes
      debug: false,
      logging: {
        level: 'info'
      }
    }
  }
};

// Helper function to get environment-specific config
function getConfig() {
  try {
    const env = process.env.NODE_ENV || 'production';
    const baseConfig = module.exports;
    const envConfig = baseConfig.environments[env] || {};
    
    return {
      ...baseConfig,
      ...envConfig,
      currentEnvironment: env
    };
  } catch (error) {
    // Fallback to hardcoded values if environment variables are not available
    console.warn('Environment variables not available, using fallback config');
    return {
      firebase: {
        projectId: 'casemanagevue-jepson-prod',
        region: 'us-central1',
        storageRegion: 'us-west1',
        storageBucket: 'casemanagevue-jepson-prod.appspot.com'
      },
      functions: {
        defaultRegion: 'us-central1',
        storageRegion: 'us-west1',
        memory: '256MB',
        timeoutSeconds: 540,
        maxInstances: 10
      },
      collections: {
        students: 'students',
        users: 'users',
        usersByUID: 'usersByUID',
        aideSchedules: 'aideSchedules',
        emailLogs: 'emailLogs',
        schools: 'schools'
      },
      storage: {
        studentsPath: 'students',
        downloadTokenExpiry: 15 * 60 * 1000,
        signedUrlExpiry: 5 * 60 * 1000
      },
      roles: {
        validRoles: ['admin', 'school_admin', 'staff_view', 'staff_edit', 'admin_504', 'sped_chair', 'case_manager', 'teacher', 'service_provider', 'paraeducator'],
        adminRoles: ['admin', 'school_admin', 'admin_504', 'sped_chair'],
        superAdminRoles: ['admin', 'school_admin'],
        staffRoles: ['case_manager', 'teacher', 'service_provider', 'paraeducator'],
        fullReadAccessRoles: ['admin', 'school_admin', 'staff_view', 'staff_edit', 'admin_504', 'sped_chair']
      },
      currentEnvironment: 'production'
    };
  }
}

module.exports.getConfig = getConfig;
