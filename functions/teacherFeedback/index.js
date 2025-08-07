/* eslint-disable */
// functions/teacherFeedback/index.js

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");

// Import modular components
const {
  requireAuth,
  requireRole,
  sanitizeString,
  validateRequired,
  extractFormId
} = require("./helpers");

// Import configuration helper
const config = require("../utils/config-helper");

const {
  createGoogleSheet,
  createGoogleSheetWithUserAuth
} = require("./sheets");

const {
  getOrCreateSchool,
  addSchoolAdmin,
  getSchoolTemplates,
  createSchoolTemplate,
  getUserSchool
} = require("./schools");

// ─── INITIALIZATION ───────────────────────────────────────────────────────────
const db = getFirestore();

// ─── CLOUD FUNCTIONS ─────────────────────────────────────────────────────────

// Get or create school for user
exports.getOrCreateSchool = onCall(
  config.createFunctionOptions(),
  async (request) => {
  try {
    requireAuth(request);
    
    const userEmail = request.auth.token.email;
    const userName = request.auth.token.name || userEmail;
    
    const school = await getOrCreateSchool(userEmail, userName);
    
    return {
      success: true,
      school: school
    };
    
  } catch (error) {
    console.error('Error in getOrCreateSchool:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Add school admin
exports.addSchoolAdmin = onCall(
  config.createFunctionOptions(),
  async (request) => {
  try {
    requireAuth(request);
    
    const { newAdminEmail, schoolId } = request.data;
    const currentUserEmail = request.auth.token.email;
    
    validateRequired(newAdminEmail, 'New admin email');
    validateRequired(schoolId, 'School ID');
    
    const result = await addSchoolAdmin(newAdminEmail, schoolId, currentUserEmail);
    
    return result;
    
  } catch (error) {
    console.error('Error in addSchoolAdmin:', error);
    throw new HttpsError('internal', error.message);
  }
});

// Get school templates
exports.getSchoolTemplates = onCall(
  config.createFunctionOptions(),
  async (request) => {
  try {
    requireAuth(request);
    
    const { schoolId } = request.data;
    validateRequired(schoolId, 'School ID');
    
    const templates = await getSchoolTemplates(schoolId);
    
    return {
      success: true,
      templates: templates
    };
    
  } catch (error) {
    console.error('Error in getSchoolTemplates:', error);
    throw new HttpsError('internal', error.message);
  }
});

// Create school template
exports.createSchoolTemplate = onCall(
  config.createFunctionOptions(),
  async (request) => {
  try {
    requireAuth(request);
    
    const { templateData, schoolId } = request.data;
    const userEmail = request.auth.token.email;
    
    validateRequired(templateData, 'Template data');
    validateRequired(schoolId, 'School ID');
    
    const result = await createSchoolTemplate(templateData, schoolId, userEmail);
    
    return result;
    
  } catch (error) {
    console.error('Error in createSchoolTemplate:', error);
    throw new HttpsError('internal', error.message);
  }
});

// Get user's school information
exports.getUserSchool = onCall(
  config.createFunctionOptions(),
  async (request) => {
  try {
    requireAuth(request);
    
    const userEmail = request.auth.token.email;
    const result = await getUserSchool(userEmail);
    
    return result;
    
  } catch (error) {
    console.error('Error in getUserSchool:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Create Google Sheet with service account (for shared drive)
exports.createFeedbackFormSheet = onCall(
  config.createFunctionOptions({
    serviceAccount: config.getServiceAccountEmail()
  }),
  async (request) => {
    try {
      requireRole(request, config.getAdminRoles());
    
    const { title, description, formUrl, studentId, studentName, folderId } = request.data;
    
    // Validate input
    validateRequired(title, 'title');
    validateRequired(formUrl, 'formUrl');
    
    // Get user information
    const userEmail = request.auth.token.email;
    const userName = request.auth.token.name || userEmail;
    
    // Sanitize input
    const sanitizedTitle = sanitizeString(title, 100);
    const sanitizedDescription = sanitizeString(description || '', 500);
    const sanitizedStudentId = studentId ? sanitizeString(studentId, 50) : null;
    const sanitizedStudentName = studentName ? sanitizeString(studentName, 100) : null;
    
    // Create Google Sheet in Shared Drive
    const sheetResult = await createGoogleSheet(
      sanitizedTitle, 
      sanitizedDescription, 
      userEmail, 
      userName,
      null, // Will use environment variable for Shared Drive ID
      sanitizedStudentId,
      sanitizedStudentName,
      folderId
    );
    
    // Extract form ID from URL
    const formId = extractFormId(formUrl);
    
    return {
      success: true,
      message: 'Google Sheet created successfully in the Shared Drive',
      spreadsheetId: sheetResult.spreadsheetId,
      spreadsheetUrl: sheetResult.spreadsheetUrl,
      sharedDriveId: sheetResult.sharedDriveId,
      formId: formId
    };
    
  } catch (error) {
    console.error('Error in createFeedbackFormSheet:', error);
    throw new HttpsError('internal', error.message);
  }
});

// Create Google Sheet using user's personal Google account
exports.createFeedbackFormSheetWithUserAuth = onCall(
  config.createFunctionOptions(),
  async (request) => {
    try {
      requireRole(request, config.getAdminRoles());
    
    const { title, description, formUrl, studentId, studentName, folderId, accessToken } = request.data;
    
    // Validate input
    validateRequired(title, 'title');
    validateRequired(formUrl, 'formUrl');
    validateRequired(accessToken, 'accessToken');
    
    // Get user information
    const userEmail = request.auth.token.email;
    const userName = request.auth.token.name || userEmail;
    
    // Sanitize input
    const sanitizedTitle = sanitizeString(title, 100);
    const sanitizedDescription = sanitizeString(description || '', 500);
    const sanitizedStudentId = studentId ? sanitizeString(studentId, 50) : null;
    const sanitizedStudentName = studentName ? sanitizeString(studentName, 100) : null;
    
    // Create Google Sheet using user's personal account
    const sheetResult = await createGoogleSheetWithUserAuth(
      sanitizedTitle, 
      sanitizedDescription, 
      userEmail, 
      userName,
      accessToken,
      folderId
    );
    
    // Extract form ID from URL
    const formId = extractFormId(formUrl);
    
    return {
      success: true,
      message: 'Google Sheet created successfully in your personal Google Drive',
      spreadsheetId: sheetResult.spreadsheetId,
      spreadsheetUrl: sheetResult.spreadsheetUrl,
      driveUrl: sheetResult.driveUrl,
      formId: formId
    };
    
  } catch (error) {
    console.error('Error in createFeedbackFormSheetWithUserAuth:', error);
    throw new HttpsError('internal', error.message);
  }
});

// Check service account's Drive storage quota
exports.checkServiceAccountStorage = onCall(
  config.createFunctionOptions(),
  async (request) => {
    try {
      requireRole(request, config.getAdminRoles());
    
    const { checkServiceAccountStorage } = require("./sheets");
    const result = await checkServiceAccountStorage();
    
    return result;
    
  } catch (error) {
    console.error('Error in checkServiceAccountStorage:', error);
    throw new HttpsError('internal', error.message);
  }
});

// Export all functions
module.exports = {
  createFeedbackFormSheet: exports.createFeedbackFormSheet,
  createFeedbackFormSheetWithUserAuth: exports.createFeedbackFormSheetWithUserAuth,
  getOrCreateSchool: exports.getOrCreateSchool,
  addSchoolAdmin: exports.addSchoolAdmin,
  getSchoolTemplates: exports.getSchoolTemplates,
  createSchoolTemplate: exports.createSchoolTemplate,
  getUserSchool: exports.getUserSchool,
  checkServiceAccountStorage: exports.checkServiceAccountStorage
}; 