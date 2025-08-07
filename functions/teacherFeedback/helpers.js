const { google } = require("googleapis");
const { getFirestore } = require("firebase-admin/firestore");
const { HttpsError } = require("firebase-functions/v2/https");

const db = getFirestore();

// ─── AUTHENTICATION & AUTHORIZATION ───────────────────────────────────────────
// Note: ADMIN_ROLES is now imported from config helper in the main index.js file

function requireAuth(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  return request.auth;
}

function requireRole(request, allowedRoles) {
  const auth = requireAuth(request);
  
  if (!auth.token.role || !allowedRoles.includes(auth.token.role)) {
    throw new HttpsError('permission-denied', `User must have one of these roles: ${allowedRoles.join(', ')}`);
  }
  
  return auth;
}

// ─── VALIDATION HELPERS ───────────────────────────────────────────────────────
function validateRequired(value, fieldName) {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    throw new HttpsError('invalid-argument', `${fieldName} is required`);
  }
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function sanitizeString(str, maxLength = 100) {
  if (!str) return '';
  return String(str).trim().substring(0, maxLength);
}

function extractFormId(formUrl) {
  if (!formUrl) return null;
  
  // Extract form ID from various Google Forms URL formats
  const patterns = [
    /\/forms\/d\/([a-zA-Z0-9-_]+)/,
    /\/forms\/d\/e\/([a-zA-Z0-9-_]+)/,
    /formId=([a-zA-Z0-9-_]+)/
  ];
  
  for (const pattern of patterns) {
    const match = formUrl.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

// ─── GOOGLE API HELPERS ───────────────────────────────────────────────────────
// ADC will pick up the function's service account automatically
const auth = new google.auth.GoogleAuth({
  scopes: [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/forms.responses.readonly'
  ]
});

// ─── DRIVE CONFIGURATION ─────────────────────────────────────────────────────
// Configuration for different drive types
const DRIVE_CONFIG = {
  // Personal Google Drive (for testing/development)
  PERSONAL: {
    type: 'personal',
    name: 'Personal Google Drive',
    description: 'Uses your personal Google Drive for testing',
    supportsSharedDrives: false,
    defaultParent: 'root', // Root of personal drive
    requiresSharing: true // Service account needs access to your personal drive
  },
  // Google Workspace Shared Drive (for production)
  WORKSPACE: {
    type: 'workspace',
    name: 'Google Workspace Shared Drive',
    description: 'Uses school Google Workspace Shared Drive for production',
    supportsSharedDrives: true,
    defaultParent: null, // Will be set to Shared Drive ID
    requiresSharing: false // Service account owns the Shared Drive
  }
};

// Get drive configuration based on environment or school settings
function getDriveConfig(schoolData = null) {
  // Check if school has Shared Drive configured
  if (schoolData && schoolData.sharedDriveId) {
    return {
      ...DRIVE_CONFIG.WORKSPACE,
      sharedDriveId: schoolData.sharedDriveId,
      defaultParent: schoolData.sharedDriveId
    };
  }
  
  // Default to personal drive for testing
  return DRIVE_CONFIG.PERSONAL;
}

// Check if using Shared Drive
function isUsingSharedDrive(driveConfig) {
  return driveConfig.type === 'workspace' && driveConfig.supportsSharedDrives;
}

// Check if personal drive requires sharing
function requiresPersonalDriveSharing(driveConfig) {
  return driveConfig.type === 'personal' && driveConfig.requiresSharing;
}

async function createSheetsClient() {
  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
}

async function createDriveClient() {
  const client = await auth.getClient();
  return google.drive({ version: 'v3', auth: client });
}

// Create Google Docs client
async function createDocsClient() {
  try {
    const auth = new google.auth.GoogleAuth({
      scopes: [
        'https://www.googleapis.com/auth/documents',
        'https://www.googleapis.com/auth/drive.file'
      ]
    });
    
    const authClient = await auth.getClient();
    return google.docs({ version: 'v1', auth: authClient });
  } catch (error) {
    console.error('Error creating Docs client:', error);
    throw error;
  }
}

async function createFormsClient() {
  const client = await auth.getClient();
  return google.forms({ version: 'v1', auth: client });
}

// Sanitize tab name for Google Sheets
function sanitizeTabName(name) {
  return name
    .replace(/[\\\/\?\*\[\]]/g, '_') // Replace invalid characters
    .substring(0, 100); // Limit length
}

// CORS helpers
function setCorsHeaders(response) {
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.set('Access-Control-Max-Age', '3600');
}

function handleCors(request, response) {
  if (request.method === 'OPTIONS') {
    setCorsHeaders(response);
    response.status(204).send('');
    return true;
  }
  setCorsHeaders(response);
  return false;
}

module.exports = {
  auth,
  createSheetsClient,
  createDriveClient,
  createDocsClient,
  createFormsClient,
  getFirestore,
  sanitizeTabName,
  setCorsHeaders,
  handleCors,
  getDriveConfig,
  isUsingSharedDrive,
  requiresPersonalDriveSharing,
  requireAuth,
  requireRole,
  validateRequired,
  validateEmail,
  sanitizeString,
  extractFormId
}; 