const { onCall } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");
const { google } = require("googleapis");
const { requireAuth, sanitizeString, validateRequired } = require("./teacherFeedback/helpers");
const config = require("./utils/config-helper");

const db = getFirestore();

exports.createSharedDrive = onCall(
  config.createFunctionOptions(),
  async (request) => {
  try {
    requireAuth(request);
    
    const { schoolId, driveName } = request.data;
    const userEmail = request.auth.token.email;
    
    validateRequired(schoolId, 'School ID');
    validateRequired(driveName, 'Drive name');
    
    const sanitizedDriveName = sanitizeString(driveName, 100);
    
    // Check if user is school admin
    const schoolDoc = await db.collection(config.getCollection("schools")).doc(schoolId).get();
    if (!schoolDoc.exists) {
      throw new Error('School not found');
    }
    
    const schoolData = schoolDoc.data();
    const isAdmin = schoolData.adminEmails && schoolData.adminEmails.includes(userEmail);
    
    if (!isAdmin) {
      throw new Error('Only school admins can create Shared Drives');
    }
    
    // Check if Shared Drive already exists
    if (schoolData.sharedDriveId) {
      throw new Error('Shared Drive already exists for this school');
    }
    
    // For now, we'll return instructions for manual creation
    // In the future, we could implement OAuth2 flow for the admin user
    const instructions = {
      success: false,
      requiresManualCreation: true,
      instructions: [
        "1. Go to Google Drive (drive.google.com)",
        "2. Click 'Shared drives' in the left sidebar",
        "3. Click 'New' to create a new shared drive",
        "4. Name it: '" + sanitizedDriveName + "'",
        "5. Add the service account as a Manager:",
        `   Email: ${config.getServiceAccountEmail()}`,
        "6. Copy the Shared Drive ID from the URL",
        "7. Use the 'Update Shared Drive ID' function to save it"
      ],
      serviceAccountEmail: config.getServiceAccountEmail(),
      suggestedDriveName: sanitizedDriveName
    };
    
    return instructions;
    
  } catch (error) {
    console.error('Error in createSharedDrive:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Function to update Shared Drive ID after manual creation
exports.updateSharedDriveId = onCall(
  config.createFunctionOptions(),
  async (request) => {
  try {
    requireAuth(request);
    
    const { schoolId, sharedDriveId } = request.data;
    const userEmail = request.auth.token.email;
    
    validateRequired(schoolId, 'School ID');
    validateRequired(sharedDriveId, 'Shared Drive ID');
    
    const sanitizedDriveId = sanitizeString(sharedDriveId, 50);
    
    // Check if user is school admin
    const schoolDoc = await db.collection(config.getCollection("schools")).doc(schoolId).get();
    if (!schoolDoc.exists) {
      throw new Error('School not found');
    }
    
    const schoolData = schoolDoc.data();
    const isAdmin = schoolData.adminEmails && schoolData.adminEmails.includes(userEmail);
    
    if (!isAdmin) {
      throw new Error('Only school admins can update Shared Drive ID');
    }
    
    // Test access to the Shared Drive
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/drive']
    });
    
    const client = await auth.getClient();
    const drive = google.drive({ version: 'v3', auth: client });
    
    try {
      // Try to list files in the Shared Drive
      await drive.files.list({
        q: `'${sanitizedDriveId}' in parents`,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        pageSize: 1
      });
      
      console.log('✅ Successfully accessed Shared Drive:', sanitizedDriveId);
      
    } catch (accessError) {
      console.error('❌ Error accessing Shared Drive:', accessError);
      throw new Error('Cannot access Shared Drive. Please ensure the service account has been added as a Manager.');
    }
    
    // Update the school record with the Shared Drive ID
    await db.collection('schools').doc(schoolId).update({
      sharedDriveId: sanitizedDriveId,
      sharedDriveName: schoolData.name + ' - CaseManageVue',
      updatedAt: new Date(),
      updatedBy: userEmail
    });
    
    console.log('✅ Updated school with Shared Drive ID:', sanitizedDriveId);
    
    return {
      success: true,
      message: 'Shared Drive ID updated successfully!',
      sharedDriveId: sanitizedDriveId
    };
    
  } catch (error) {
    console.error('Error in updateSharedDriveId:', error);
    return {
      success: false,
      error: error.message
    };
  }
});
