/* eslint-disable */
// functions/modules/fileAccess.js
// Secure file access functions

const { onCall } = require("firebase-functions/v2/https");
const { getStorage } = require("firebase-admin/storage");

const {
  requireAuth,
  validateRequired,
  checkSecurityThreats
} = require("../utils/shared");

const config = require("../utils/config-helper");

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

exports.downloadStudentFile = onCall(
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
    
    const [metadata] = await file.getMetadata();
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + config.getSignedUrlExpiry(),
    });
    
    return {
      url,
      contentType: metadata.contentType,
      size: metadata.size
    };
  } catch (error) {
    console.error("Download file error:", error);
    throw new HttpsError("internal", "Failed to generate download URL");
  }
});
