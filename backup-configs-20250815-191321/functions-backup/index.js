/* eslint-disable */
// functions/index-refactored.js
// Refactored main functions file with improved organization

// ─── IMPORTS ──────────────────────────────────────────────────────────────────
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require('firebase-functions/v2/https');

// Firebase Admin
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const { getStorage } = require("firebase-admin/storage");

// Utilities
const axios = require("axios");
const express = require("express");
const cors = require("cors");

// ─── INITIALIZATION ───────────────────────────────────────────────────────────
initializeApp();
const db = getFirestore();
const adminAuth = getAuth();

// ─── SHARED UTILITIES ────────────────────────────────────────────────────────
const {
  requireAuth,
  requireRole,
  sanitizeString,
  validateEmail,
  validateRequired,
  checkSecurityThreats
} = require("./utils/shared");

// ─── CONFIGURATION ───────────────────────────────────────────────────────────
const config = require("./utils/config-helper");

// ─── MODULAR FUNCTION IMPORTS ────────────────────────────────────────────────
const { removeDownloadTokens, removeDownloadTokensOnFinalize, removeDownloadTokensOnMetadata } = require("./remove-tokens");
const teacherFeedbackFunctions = require("./teacherFeedback/index");

// Import test functions
const { testSchools } = require("./test-schools");

// Import setup functions
const { setupSharedDrive } = require("./setup-shared-drive");

// Import test functions
const { testSharedDriveAccess } = require("./test-shared-drive-access");

// Import Shared Drive management functions
const { createSharedDrive, updateSharedDriveId } = require("./create-shared-drive");

// Import debug function
const { debugSharedDriveAccess } = require("./debug-shared-drive-access");

// ─── USER MANAGEMENT FUNCTIONS ────────────────────────────────────────────────
exports.addUserWithRole = onCall(
  config.createFunctionOptions(), 
  async (request) => {
    requireRole(request, config.getSuperAdminRoles());

  const { name, email, role, provider, aeriesId } = request.data;
  
  // Comprehensive input validation
  validateRequired(name, "Name");
  validateRequired(email, "Email");
  validateRequired(role, "Role");
  
  // Sanitize inputs
  const sanitizedName = sanitizeString(name, 100);
  const sanitizedEmail = sanitizeString(email.toLowerCase(), 255);
  const sanitizedRole = sanitizeString(role, 50);
  const sanitizedProvider = provider ? sanitizeString(provider, 10) : null;
  const sanitizedAeriesId = aeriesId ? sanitizeString(aeriesId, 20) : null;
  
  // Security threat detection
  checkSecurityThreats(sanitizedName);
  checkSecurityThreats(sanitizedEmail);
  checkSecurityThreats(sanitizedRole);
  if (sanitizedProvider) checkSecurityThreats(sanitizedProvider);
  if (sanitizedAeriesId) checkSecurityThreats(sanitizedAeriesId);
  
  // Validate email format
  if (!validateEmail(sanitizedEmail)) {
    throw new HttpsError("invalid-argument", "Invalid email format");
  }
  
  // Validate role
  if (!config.isValidRole(sanitizedRole)) {
    throw new HttpsError("invalid-argument", `Invalid role. Valid roles: ${config.getValidRoles().join(", ")}`);
  }

  try {
    const userRecord = await adminAuth.createUser({
      email: sanitizedEmail,
      password: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8),
      displayName: sanitizedName,
    });

    await adminAuth.setCustomUserClaims(userRecord.uid, { role: sanitizedRole });

    const userData = {
      name: sanitizedName,
      email: sanitizedEmail,
      role: sanitizedRole,
      createdAt: new Date().toISOString(),
      ...(sanitizedProvider && { provider: sanitizedProvider }),
      ...(sanitizedAeriesId && { aeriesId: sanitizedAeriesId })
    };

    await db.collection(config.getCollection("users")).doc(userRecord.uid).set(userData);

    return { 
      success: true,
      message: `User "${sanitizedName}" created successfully`,
      uid: userRecord.uid
    };

  } catch (error) {
    if (error.code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", `Email "${sanitizedEmail}" already in use`);
    }
    throw new HttpsError("internal", `User creation failed: ${error.message}`);
  }
});

exports.deleteUserAuth = onCall(
  config.createFunctionOptions(), 
  async (request) => {
    requireRole(request, config.getSuperAdminRoles());

  const { uid } = request.data;
  validateRequired(uid, "User ID");

  try {
    // Delete from Firebase Auth
    await adminAuth.deleteUser(uid);
    console.log(`✅ Deleted user from Firebase Auth: ${uid}`);
    
    // Also delete from usersByUID collection if it exists
    try {
      await db.collection(config.getCollection("usersByUID")).doc(uid).delete();
    } catch (error) {
      config.warning(`Failed to delete from usersByUID: ${error.message}`);
    }
    
    return { 
      success: true,
      message: `User ${uid} deleted from Firebase Auth`
    };
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      return {
        success: true,
        message: `User ${uid} not found in Firebase Auth`
      };
    }
    throw new HttpsError("internal", `Failed to delete user: ${error.message}`);
  }
});

exports.deleteAllUsers = onCall(
  config.createFunctionOptions(), 
  async (request) => {
    requireRole(request, config.getSuperAdminRoles());

  try {
    // Get all users from Firebase Auth
    const listUsersResult = await adminAuth.listUsers();
    
    // Delete each user from Auth and usersByUID
    const deletePromises = listUsersResult.users.map(async userRecord => {
      try {
        await adminAuth.deleteUser(userRecord.uid);
        console.log(`✅ Deleted user from Auth: ${userRecord.uid}`);
        
        // Also delete from usersByUID if it exists
        try {
          await db.collection(config.getCollection("usersByUID")).doc(userRecord.uid).delete();
        } catch (error) {
          config.warning(`Failed to delete from usersByUID: ${error.message}`);
        }
      } catch (error) {
        console.error(`❌ Failed to delete user ${userRecord.uid}:`, error);
      }
    });
    
    await Promise.all(deletePromises);
    
    return { 
      success: true,
      message: `Deleted ${listUsersResult.users.length} users from Firebase Auth`
    };
  } catch (error) {
    throw new HttpsError("internal", `Failed to delete all users: ${error.message}`);
  }
});

// Background triggered function for syncing user claims
exports.syncUserClaims = onDocumentWritten(
  config.createDocumentTriggerOptions(config.getCollection("users") + "/{uid}"),
  async (event) => {
  const uid = event.params.uid;
  const afterData = event.data?.after?.data();

  try {
    // If document was deleted, only remove claims (don't delete the user)
    if (!event.data?.after?.exists) {
      try {
        const userRec = await adminAuth.getUser(uid);
        await adminAuth.setCustomUserClaims(userRec.uid, null);
        console.log(`✅ Removed claims for UID: ${uid}`);
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          console.log(`User ${uid} not found in Auth`);
        } else {
          console.error(`❌ Error removing claims: ${uid}`, error);
        }
      }
      return;
    }

    // If document exists, sync claims based on user data
    if (afterData && afterData.role) {
      try {
        const userRec = await adminAuth.getUser(uid);
        await adminAuth.setCustomUserClaims(userRec.uid, { role: afterData.role });
        console.log(`✅ Synced claims for UID: ${uid}, Role: ${afterData.role}`);
      } catch (error) {
        console.error(`❌ Error syncing claims: ${uid}`, error);
      }
    }
  } catch (err) {
    console.error(`❌ syncUserClaims error:`, err);
  }
});

// ─── AERIES API FUNCTIONS ────────────────────────────────────────────────────
exports.getAeriesToken = onCall(
  config.createFunctionOptions(), 
  async (request) => {
    requireRole(request, config.getAdminRoles());

  const { baseUrl, clientId, clientSecret } = request.data;
  
  // Validation
  validateRequired(baseUrl, "Base URL");
  validateRequired(clientId, "Client ID");
  validateRequired(clientSecret, "Client Secret");
  
  if (checkSecurityThreats(baseUrl) || checkSecurityThreats(clientId) || checkSecurityThreats(clientSecret)) {
    throw new HttpsError("invalid-argument", "Security threat detected");
  }

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const response = await axios.post(`${baseUrl}/token`, 
      "grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    return {
      access_token: response.data.access_token,
      expires_in: response.data.expires_in
    };

  } catch (error) {
    console.error("Aeries token error:", error.response?.data || error.message);
    throw new HttpsError("internal", "Failed to get Aeries token");
  }
});

// ─── TEACHER FEEDBACK FUNCTIONS ──────────────────────────────────────────────
// exports.createFeedbackFormSheet = teacherFeedbackFunctions.createFeedbackFormSheet; // DISABLED - service account approach removed
exports.createFeedbackFormSheetWithUserAuth = teacherFeedbackFunctions.createFeedbackFormSheetWithUserAuth;
// exports.checkServiceAccountStorage = teacherFeedbackFunctions.checkServiceAccountStorage; // DISABLED - service account approach removed

// ─── CASE MANAGER FEEDBACK SYSTEM FUNCTIONS ──────────────────────────────────
exports.createCaseManagerFeedbackSystem = teacherFeedbackFunctions.createCaseManagerFeedbackSystem;
exports.getCaseManagerFeedbackSystem = teacherFeedbackFunctions.getCaseManagerFeedbackSystem;
exports.updateCaseManagerDocument = teacherFeedbackFunctions.updateCaseManagerDocument;
exports.generateFeedbackDocument = teacherFeedbackFunctions.generateFeedbackDocument;

exports.getStudentFeedback = onCall(
  config.createFunctionOptions(), 
  async (request) => {
  requireAuth(request);
  
  const { studentId } = request.data;
  validateRequired(studentId, "Student ID");
  
  if (checkSecurityThreats(studentId)) {
    throw new HttpsError("invalid-argument", "Security threat detected");
  }

  try {
    const snapshot = await db.collection("feedbackResponses")
      .where("studentId", "==", studentId)
      .orderBy("syncedAt", "desc")
      .get();

    return {
      responses: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    };

  } catch (error) {
    console.error("Get feedback error:", error);
    throw new HttpsError("internal", "Failed to retrieve feedback");
  }
});

// ─── SECURE FILE ACCESS FUNCTIONS ────────────────────────────────────────────
exports.getStudentFileUrl = onCall(
  config.createFunctionOptions(), 
  async (request) => {
  requireAuth(request);
  
  const { fileName } = request.data;
  validateRequired(fileName, "File name");
  
  if (checkSecurityThreats(fileName)) {
    throw new HttpsError("invalid-argument", "Security threat detected");
  }

  try {
    const bucket = getStorage().bucket();
    const filePath = config.getStoragePathWithParams('studentsPath', { fileName });
    const file = bucket.file(filePath);
    
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + config.getSignedUrlExpiry(),
    });
    
    return { url };
  } catch (error) {
    console.error("Get file URL error:", error);
    throw new HttpsError("internal", "Failed to generate file URL");
  }
});





// ─── SCHOOL MANAGEMENT FUNCTIONS ──────────────────────────────────────────────
exports.getOrCreateSchool = teacherFeedbackFunctions.getOrCreateSchool;
exports.addSchoolAdmin = teacherFeedbackFunctions.addSchoolAdmin;
exports.getSchoolTemplates = teacherFeedbackFunctions.getSchoolTemplates;
exports.createSchoolTemplate = teacherFeedbackFunctions.createSchoolTemplate;
exports.getUserSchool = teacherFeedbackFunctions.getUserSchool;

// ─── TESTING FUNCTIONS ────────────────────────────────────────────────────────
exports.testSchools = testSchools;

// ─── SHARED DRIVE FUNCTIONS ──────────────────────────────────────────────────
exports.setupSharedDrive = setupSharedDrive;
exports.testSharedDriveAccess = testSharedDriveAccess;
exports.createSharedDrive = createSharedDrive;
exports.updateSharedDriveId = updateSharedDriveId;
exports.debugSharedDriveAccess = debugSharedDriveAccess;




// ─── UTILITY FUNCTIONS ────────────────────────────────────────────────────────
exports.healthCheck = onCall(
  config.createFunctionOptions(), 
  async (request) => {
  try {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Cloud Functions are operational'
    };
  } catch (error) {
    console.error('Health check failed:', error);
    throw new HttpsError('internal', 'Health check failed');
  }
});

// ─── TOKEN REMOVAL FUNCTIONS ──────────────────────────────────────────────────
exports.removeDownloadTokens = removeDownloadTokens;
exports.removeDownloadTokensOnFinalize = removeDownloadTokensOnFinalize;
exports.removeDownloadTokensOnMetadata = removeDownloadTokensOnMetadata;

// ─── LEGACY FUNCTIONS (for backward compatibility) ───────────────────────────
exports.cleanupDeletedUser = onDocumentWritten(
  config.createDocumentTriggerOptions(config.getCollection("users") + "/{userId}"),
  async (event) => {
  // Only run on delete
  if (event.data.after?.exists) return;

  const userId = event.params.userId;
  console.log(`🗑️ User document deleted from Firestore, cleaning up: ${userId}`);
  
  try {
    // Delete from Auth
    await adminAuth.deleteUser(userId);
    console.log(`✅ Deleted user from Auth after Firestore delete: ${userId}`);
    
    // Delete from usersByUID if it exists
    try {
      await db.collection(config.getCollection("usersByUID")).doc(userId).delete();
      config.success(`Deleted user from usersByUID: ${userId}`);
    } catch (error) {
      if (error.code === 'not-found') {
        config.info(`User ${userId} not found in usersByUID`);
      } else {
        config.error(`Failed to delete from usersByUID: ${error.message}`, error);
      }
    }
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.log(`User ${userId} not found in Auth - already deleted`);
    } else {
      console.error(`❌ Failed to delete user from Auth: ${userId}`, error);
    }
  }
});



exports.migrateUserRoles = onCall(
  config.createFunctionOptions(), 
  async (request) => {
    requireRole(request, config.getAdminRoles());
  
  try {
    const listUsersResult = await adminAuth.listUsers();
    const migrationResults = [];
    
    for (const user of listUsersResult.users) {
      if (user.customClaims?.role) {
        const oldRole = user.customClaims.role;
        let newRole = oldRole;
        
        // Map legacy roles to new roles
        if (oldRole === "administrator") newRole = "admin";
        if (oldRole === "administrator_504_CM") newRole = "admin_504";
        
        if (oldRole !== newRole) {
          await adminAuth.setCustomUserClaims(user.uid, { role: newRole });
          migrationResults.push({
            uid: user.uid,
            email: user.email,
            oldRole,
            newRole
          });
        }
      }
    }
    
    return { migrations: migrationResults };
  } catch (error) {
    console.error("Migrate roles error:", error);
    throw new HttpsError("internal", "Failed to migrate user roles");
  }
});

// ─── STUDENT DATA FUNCTIONS ──────────────────────────────────────────────────
// Background triggered function for updating student staff IDs
exports.updateStudentStaffIds = onDocumentWritten(
  config.createDocumentTriggerOptions(config.getCollection("students") + "/{studentId}"),
  async (event) => {
  const studentId = event.params.studentId;
  const beforeData = event.data?.before?.data();
  const afterData = event.data?.after?.data();
  
  // If document was deleted, nothing to do
  if (!afterData) {
    console.log(`Student ${studentId} deleted, skipping staffIds update`);
    return null;
  }
  
  // Get existing staffIds to check if update is needed
  const existingStaffIds = afterData.app?.staffIds || [];
  
  const staffIds = new Set();
  
  // Add case manager
  const caseManagerId = afterData.app?.studentData?.caseManagerId;
  if (caseManagerId) {
    staffIds.add(caseManagerId);
    console.log(`Added case manager: ${caseManagerId}`);
  }
  
  // Add teachers from schedule (including co-teaching case managers)
  const schedule = afterData.app?.schedule?.periods || {};
  Object.entries(schedule).forEach(([period, data]) => {
    if (typeof data === 'string' && data) {
      // Simple string format (legacy)
      staffIds.add(data);
      console.log(`Added teacher from period ${period}: ${data}`);
    } else if (typeof data === 'object' && data) {
      // Object format with potential co-teaching
      if (data.teacherId) {
        staffIds.add(data.teacherId);
        console.log(`Added teacher from period ${period}: ${data.teacherId}`);
      }
      if (data.coTeaching?.caseManagerId) {
        staffIds.add(data.coTeaching.caseManagerId);
        console.log(`Added co-teaching CM from period ${period}: ${data.coTeaching.caseManagerId}`);
      }
    }
  });
  
  // Add service providers
  const providers = afterData.app?.providers || {};
  Object.entries(providers).forEach(([providerType, providerId]) => {
    if (providerId) {
      staffIds.add(providerId);
      console.log(`Added provider ${providerType}: ${providerId}`);
    }
  });
  
  // Convert Set to Array and update if different
  const newStaffIds = Array.from(staffIds);
  
  if (JSON.stringify(newStaffIds.sort()) !== JSON.stringify(existingStaffIds.sort())) {
    await db.collection("students").doc(studentId).update({
      "app.staffIds": newStaffIds,
      updatedAt: FieldValue.serverTimestamp()
    });
    console.log(`✅ Updated staffIds for student ${studentId}:`, newStaffIds);
  } else {
    console.log(`ℹ️ No staffIds update needed for student ${studentId}`);
  }
});

// Background triggered function for syncing paraeducator assignments
exports.syncParaeducatorStudentAssignments = onDocumentWritten(
  config.createDocumentTriggerOptions(config.getCollection("students") + "/{studentId}"),
  async (event) => {
  const studentId = event.params.studentId;
  const afterData = event.data.after?.data();
  const schedule = afterData?.app?.schedule?.periods || {};

  // Read all aideSchedules docs with admin privileges
  const aideSchedulesSnap = await db.collection('aideSchedules').get();
  for (const docSnap of aideSchedulesSnap.docs) {
    const aideId = docSnap.id;
    const aideData = docSnap.data() || {};
    let include = false;

    // Direct assignment
    const direct = Array.isArray(aideData.directAssignment)
      ? aideData.directAssignment
      : (aideData.directAssignment ? [aideData.directAssignment] : []);
    if (direct.includes(studentId)) include = true;

    // Class assignments (co-teach included)
    if (!include && aideData.classAssignment) {
      for (const [period, teacherIds] of Object.entries(aideData.classAssignment)) {
        const arr = Array.isArray(teacherIds) ? teacherIds : [teacherIds];
        const pd = schedule[period];
        let teacherId;
        if (typeof pd === 'string') teacherId = pd;
        else if (pd && typeof pd === 'object') teacherId = pd.teacherId;
        else continue;
        if (arr.includes(teacherId)) { include = true; break; }
      }
    }

    const docRef = db.doc(`aideSchedules/${aideId}`);
    if (include) {
      await docRef.update({ studentIds: FieldValue.arrayUnion(studentId) });
    } else {
      await docRef.update({ studentIds: FieldValue.arrayRemove(studentId) });
    }
  }
});

// Background triggered function for rebuilding paraeducator student IDs
exports.rebuildParaeducatorStudentIds = onDocumentWritten(
  config.createDocumentTriggerOptions(config.getCollection("aideSchedules") + "/{aideId}"),
  async (event) => {
  const aideId = event.params.aideId;
  const data = event.data.after?.data() || {};
  const direct = Array.isArray(data.directAssignment)
    ? data.directAssignment
    : (data.directAssignment ? [data.directAssignment] : []);
  const classAssign = data.classAssignment || {};
  const accessible = new Set(direct.filter(Boolean));

  // Fetch all students (server-side)
  const studentsSnap = await db.collection(config.getCollection("students")).get();
  for (const sDoc of studentsSnap.docs) {
    const student = { id: sDoc.id, ...sDoc.data() };
    const plan = student.app?.studentData?.plan;
    if (plan !== 'IEP' && plan !== '504') continue;
    const schedule = student.app?.schedule?.periods || {};
    for (const [period, teacherIds] of Object.entries(classAssign)) {
      const arr = Array.isArray(teacherIds) ? teacherIds : [teacherIds];
      const pd = schedule[period];
      let teacherId;
      if (typeof pd === 'string') teacherId = pd;
      else if (pd && typeof pd === 'object') teacherId = pd.teacherId;
      else continue;
      if (arr.includes(teacherId)) { accessible.add(student.id); break; }
    }
  }

  const docRef = db.doc(`${config.getCollection("aideSchedules")}/${aideId}`);
  await docRef.update({ studentIds: Array.from(accessible) });
});



// HTTP function for downloading student files
const downloadApp = express();
downloadApp.use(cors({ origin: true }));
downloadApp.use(express.json());

// Authentication middleware
downloadApp.use(async (req, res, next) => {
  const authHeader = req.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).send('Unauthorized');
  }
  const idToken = authHeader.split('Bearer ')[1];
  try {
    req.user = await adminAuth.verifyIdToken(idToken);
    next();
  } catch (error) {
    return res.status(401).send('Unauthorized');
  }
});

// File download endpoint
// URL format: /downloadStudentFile?studentId=ID&fileName=filename.pdf
downloadApp.get('/downloadStudentFile', async (req, res) => {
  const { studentId, fileName } = req.query;
  if (!studentId || !fileName) {
    return res.status(400).send('studentId and fileName required');
  }
  const { role, uid } = req.user;
  
  // Authorization check
  const docSnap = await db.collection('students').doc(studentId).get();
  if (!docSnap.exists) {
    return res.status(404).send('Student not found');
  }
  const data = docSnap.data();
  const staffIds = data.app?.staffIds || [];
  const caseManagerId = data.app?.studentData?.caseManagerId;
  const allowed = (
    config.isAdminRole(role) || config.isStaffRole(role) ||
    staffIds.includes(uid) || (role === 'case_manager' && uid === caseManagerId)
  );
  if (!allowed) {
    return res.status(403).send('Forbidden');
  }
  
  // Stream file from private bucket
  const bucket = getStorage().bucket();
  
  // Check both possible file paths (students folder first for consistency)
  let filePath = `students/${studentId}/${fileName}`;
  let file = bucket.file(filePath);
  
  try {
    const [exists] = await file.exists();
    if (!exists) {
      // Try alternative path
      filePath = `students/${fileName}`;
      file = bucket.file(filePath);
      const [exists2] = await file.exists();
      if (!exists2) {
        return res.status(404).send('File not found');
      }
    }
    
    const [metadata] = await file.getMetadata();
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    });
    
    res.json({
      url,
      contentType: metadata.contentType,
      size: metadata.size
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).send('Internal server error');
  }
});

exports.downloadStudentFile = onRequest(
  config.createHttpFunctionOptions(),
  downloadApp
);

// ─── EMAIL FUNCTIONS ──────────────────────────────────────────────────────────
exports.sendStudentEmail = onCall(
  config.createFunctionOptions(), 
  async (request) => {
    requireRole(request, config.getAdminRoles());
  
  const { studentId, emailType, recipientEmail, subject, message } = request.data;
  
  // Validation
  validateRequired(studentId, "Student ID");
  validateRequired(emailType, "Email type");
  validateRequired(recipientEmail, "Recipient email");
  validateRequired(subject, "Subject");
  validateRequired(message, "Message");
  
  if (!validateEmail(recipientEmail)) {
    throw new HttpsError("invalid-argument", "Invalid recipient email format");
  }
  
  if (checkSecurityThreats(subject) || checkSecurityThreats(message)) {
    throw new HttpsError("invalid-argument", "Security threat detected");
  }
  
  try {
    // Get student data
    const studentDoc = await db.collection(config.getCollection("students")).doc(studentId).get();
    if (!studentDoc.exists) {
      throw new HttpsError("not-found", "Student not found");
    }
    
    const studentData = studentDoc.data();
    
    // Log email sending for audit purposes
    await db.collection(config.getCollection("emailLogs")).add({
      studentId,
      emailType,
      recipientEmail,
      subject,
      message,
      sentBy: request.auth.uid,
      sentAt: FieldValue.serverTimestamp(),
      studentName: studentData.name || "Unknown"
    });
    
    // TODO: Implement actual email sending logic
    // This would typically use a service like SendGrid, Mailgun, or Firebase Extensions
    
    return {
      success: true,
      message: "Email logged successfully",
      studentId,
      recipientEmail
    };
  } catch (error) {
    console.error("Send student email error:", error);
    throw new HttpsError("internal", "Failed to send student email");
  }
});

// ─── CUSTOM CLAIMS SYNC FUNCTION ──────────────────────────────────────────────
exports.syncCustomClaims = onCall(
  config.createFunctionOptions(), 
  async (request) => {
    requireRole(request, config.getAdminRoles());
  
  const { uid, customClaims } = request.data;
  
  // Validation
  validateRequired(uid, "User ID");
  validateRequired(customClaims, "Custom claims");
  
  if (typeof customClaims !== 'object') {
    throw new HttpsError("invalid-argument", "Custom claims must be an object");
  }
  
  try {
    // Update custom claims for the user
    await adminAuth.setCustomUserClaims(uid, customClaims);
    
    // Log the claim update for audit purposes
    await db.collection("claimUpdates").add({
      uid,
      customClaims,
      updatedBy: request.auth.uid,
      updatedAt: FieldValue.serverTimestamp()
    });
    
    return {
      success: true,
      message: "Custom claims updated successfully",
      uid,
      customClaims
    };
  } catch (error) {
    console.error("Sync custom claims error:", error);
    throw new HttpsError("internal", "Failed to sync custom claims");
  }
});

// ─── BOOTSTRAP FUNCTIONS ──────────────────────────────────────────────────────

// Scheduled function to sync project owners (runs every hour)
exports.syncProjectOwnersScheduled = onSchedule("every 1 hours", async (event) => {
  try {
    console.log("🔄 Running scheduled project owners sync...");
    
    // Get all project owners from IAM
    const { CloudResourceManagerClient } = require('@google-cloud/resource-manager');
    const client = new CloudResourceManagerClient();
    
    const projectId = config.getProjectId();
    const [policy] = await client.getIamPolicy({
      resource: `projects/${projectId}`
    });
    
    const projectOwners = policy.bindings
      .filter(binding => binding.role === 'roles/owner')
      .flatMap(binding => binding.members)
      .filter(member => member.startsWith('user:'))
      .map(member => member.replace('user:', ''));
    
    console.log(`📋 Found ${projectOwners.length} project owners:`, projectOwners);
    
    // Create or update user documents for project owners
    for (const email of projectOwners) {
      try {
        const userRecord = await adminAuth.getUserByEmail(email);
        
        // Check if user document exists
        const userDoc = await db.collection('users').doc(userRecord.uid).get();
        
        if (!userDoc.exists) {
          // Create new user document with admin role
          await db.collection('users').doc(userRecord.uid).set({
            email: email,
            name: userRecord.displayName || email.split('@')[0],
            role: 'admin',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            isProjectOwner: true
          });
          
          // Set custom claims
          await adminAuth.setCustomUserClaims(userRecord.uid, {
            role: 'admin',
            isProjectOwner: true
          });
          
          console.log(`✅ Created admin user for project owner: ${email}`);
        } else {
          // Update existing user to ensure admin role
          const userData = userDoc.data();
          if (userData.role !== 'admin') {
            await db.collection('users').doc(userRecord.uid).update({
              role: 'admin',
              isProjectOwner: true,
              updatedAt: FieldValue.serverTimestamp()
            });
            
            // Update custom claims
            await adminAuth.setCustomUserClaims(userRecord.uid, {
              role: 'admin',
              isProjectOwner: true
            });
            
            console.log(`✅ Updated user to admin: ${email}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error processing project owner ${email}:`, error);
      }
    }
    
    console.log("✅ Project owners sync completed");
  } catch (error) {
    console.error("❌ Error in scheduled project owners sync:", error);
  }
});

// Manual function to sync project owners (can be called directly)
exports.syncProjectOwners = onCall(
  config.createFunctionOptions(),
  async (request) => {
    requireRole(request, config.getSuperAdminRoles());
    
    try {
      console.log("🔄 Manual project owners sync triggered...");
      
      // Get all project owners from IAM
      const { CloudResourceManagerClient } = require('@google-cloud/resource-manager');
      const client = new CloudResourceManagerClient();
      
      const projectId = config.getProjectId();
      const [policy] = await client.getIamPolicy({
        resource: `projects/${projectId}`
      });
      
      const projectOwners = policy.bindings
        .filter(binding => binding.role === 'roles/owner')
        .flatMap(binding => binding.members)
        .filter(member => member.startsWith('user:'))
        .map(member => member.replace('user:', ''));
      
      console.log(`📋 Found ${projectOwners.length} project owners:`, projectOwners);
      
      let createdCount = 0;
      let updatedCount = 0;
      
      // Create or update user documents for project owners
      for (const email of projectOwners) {
        try {
          const userRecord = await adminAuth.getUserByEmail(email);
          
          // Check if user document exists
          const userDoc = await db.collection('users').doc(userRecord.uid).get();
          
          if (!userDoc.exists) {
            // Create new user document with admin role
            await db.collection('users').doc(userRecord.uid).set({
              email: email,
              name: userRecord.displayName || email.split('@')[0],
              role: 'admin',
              createdAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
              isProjectOwner: true
            });
            
            // Set custom claims
            await adminAuth.setCustomUserClaims(userRecord.uid, {
              role: 'admin',
              isProjectOwner: true
            });
            
            createdCount++;
            console.log(`✅ Created admin user for project owner: ${email}`);
          } else {
            // Update existing user to ensure admin role
            const userData = userDoc.data();
            if (userData.role !== 'admin') {
              await db.collection('users').doc(userRecord.uid).update({
                role: 'admin',
                isProjectOwner: true,
                updatedAt: FieldValue.serverTimestamp()
              });
              
              // Update custom claims
              await adminAuth.setCustomUserClaims(userRecord.uid, {
                role: 'admin',
                isProjectOwner: true
              });
              
              updatedCount++;
              console.log(`✅ Updated user to admin: ${email}`);
            }
          }
        } catch (error) {
          console.error(`❌ Error processing project owner ${email}:`, error);
        }
      }
      
      return {
        success: true,
        message: `Project owners sync completed. Created: ${createdCount}, Updated: ${updatedCount}`,
        totalOwners: projectOwners.length,
        created: createdCount,
        updated: updatedCount
      };
    } catch (error) {
      console.error("❌ Error in manual project owners sync:", error);
      throw new HttpsError("internal", "Failed to sync project owners");
    }
  }
);

// Bootstrap function for current user (called during login)
exports.bootstrapAdminForCurrentUser = onCall(
  config.createFunctionOptions(),
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }
    
    const uid = request.auth.uid;
    const email = request.auth.token.email;
    
    try {
      console.log(`🔄 Bootstrap attempt for user: ${email} (${uid})`);
      
      // Check if user document exists
      const userDoc = await db.collection('users').doc(uid).get();
      
      if (userDoc.exists) {
        console.log(`✅ User document already exists for: ${email}`);
        return {
          success: true,
          message: "User already exists",
          userExists: true
        };
      }
      
      // Check if user is a project owner
      const { CloudResourceManagerClient } = require('@google-cloud/resource-manager');
      const client = new CloudResourceManagerClient();
      
      const projectId = config.getProjectId();
      const [policy] = await client.getIamPolicy({
        resource: `projects/${projectId}`
      });
      
      const projectOwners = policy.bindings
        .filter(binding => binding.role === 'roles/owner')
        .flatMap(binding => binding.members)
        .filter(member => member.startsWith('user:'))
        .map(member => member.replace('user:', ''));
      
      const isProjectOwner = projectOwners.includes(email);
      
      // Create user document
      const userData = {
        email: email,
        name: request.auth.token.name || email.split('@')[0],
        role: isProjectOwner ? 'admin' : 'staff_view',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        isProjectOwner: isProjectOwner
      };
      
      await db.collection('users').doc(uid).set(userData);
      
      // Set custom claims
      const customClaims = {
        role: userData.role,
        isProjectOwner: isProjectOwner
      };
      
      await adminAuth.setCustomUserClaims(uid, customClaims);
      
      console.log(`✅ Created user document for: ${email} with role: ${userData.role}`);
      
      return {
        success: true,
        message: "User created successfully",
        userExists: false,
        role: userData.role,
        isProjectOwner: isProjectOwner
      };
    } catch (error) {
      console.error("❌ Error in bootstrap function:", error);
      throw new HttpsError("internal", "Failed to bootstrap user");
    }
  }
);
