const { onCall } = require("firebase-functions/v2/https");
const { google } = require("googleapis");
const config = require("./utils/config-helper");

// ADC will pick up the function's service account automatically
const auth = new google.auth.GoogleAuth({
  scopes: [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/documents'
  ]
});

exports.testSharedDriveAccess = onCall(
  config.createFunctionOptions(),
  async (request) => {
  try {
    const client = await auth.getClient();
    const drive = google.drive({ version: 'v3', auth: client });
    
    // Test creating a simple file in the Shared Drive
    // You'll need to replace this with the actual Shared Drive ID
    const sharedDriveId = request.data.sharedDriveId;
    
    if (!sharedDriveId) {
      return {
        success: false,
        error: 'Please provide a Shared Drive ID in the request data'
      };
    }
    
    config.info(`Testing access to Shared Drive: ${sharedDriveId}`);
    
    // Try to list files in the Shared Drive
    const files = await drive.files.list({
      q: `'${sharedDriveId}' in parents`,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      fields: 'files(id,name,mimeType)'
    });
    
    config.success('Successfully listed files in Shared Drive');
    
    // Try to create a test file
    const testFile = await drive.files.create({
      requestBody: {
        name: 'Test File - ' + new Date().toISOString(),
        mimeType: 'application/vnd.google-apps.document',
        parents: [sharedDriveId]
      },
      supportsAllDrives: true,
      fields: 'id,name'
    });
    
    config.success(`Successfully created test file: ${testFile.data.id}`);
    
    // Clean up the test file
    await drive.files.delete({
      fileId: testFile.data.id,
      supportsAllDrives: true
    });
    
    config.success('Successfully deleted test file');
    
    return {
      success: true,
      message: 'Shared Drive access test successful!',
      sharedDriveId: sharedDriveId,
      existingFiles: files.data.files || []
    };
    
  } catch (error) {
    config.error('Error testing Shared Drive access:', error);
    return {
      success: false,
      error: error.message,
      details: error.response?.data || null
    };
  }
});
