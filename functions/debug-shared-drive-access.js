const { onCall } = require("firebase-functions/v2/https");
const { google } = require("googleapis");
const { requireAuth, sanitizeString, validateRequired } = require("./teacherFeedback/helpers");
const config = require("./utils/config-helper");

exports.debugSharedDriveAccess = onCall(
  config.createFunctionOptions(),
  async (request) => {
  try {
    requireAuth(request);
    
    const { sharedDriveId } = request.data;
    const userEmail = request.auth.token.email;
    
    validateRequired(sharedDriveId, 'Shared Drive ID');
    
    const sanitizedDriveId = sanitizeString(sharedDriveId, 50);
    
    config.info(`Debugging Shared Drive access for: ${sanitizedDriveId}`);
    config.info(`User: ${userEmail}`);
    
    // Test 1: Basic authentication
    config.info('Test 1: Checking authentication...');
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/drive']
    });
    
    const client = await auth.getClient();
    config.success('Authentication successful');
    
    // Test 2: Get service account info
    config.info('Test 2: Getting service account info...');
    const projectId = await auth.getProjectId();
    config.success(`Project ID: ${projectId}`);
    
    // Test 3: Try to get Shared Drive metadata
    config.info('Test 3: Getting Shared Drive metadata...');
    const drive = google.drive({ version: 'v3', auth: client });
    
    try {
      const driveInfo = await drive.drives.get({
        driveId: sanitizedDriveId,
        supportsAllDrives: true
      });
      config.success('Shared Drive metadata retrieved:', {
        name: driveInfo.data.name,
        id: driveInfo.data.id,
        restrictions: driveInfo.data.restrictions
      });
    } catch (driveError) {
      config.error('Error getting Shared Drive metadata:', driveError);
      return {
        success: false,
        error: `Cannot access Shared Drive metadata: ${driveError.message}`,
        details: {
          step: 'Getting Shared Drive metadata',
          error: driveError.message,
          code: driveError.code
        }
      };
    }
    
    // Test 4: Try to list files
    config.info('Test 4: Listing files in Shared Drive...');
    try {
      const filesList = await drive.files.list({
        q: `'${sanitizedDriveId}' in parents`,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        pageSize: 5,
        fields: 'files(id,name,mimeType)'
      });
      config.success('Files list retrieved:', {
        fileCount: filesList.data.files?.length || 0,
        files: filesList.data.files?.map(f => ({ name: f.name, type: f.mimeType })) || []
      });
    } catch (listError) {
      config.error('Error listing files:', listError);
      return {
        success: false,
        error: `Cannot list files in Shared Drive: ${listError.message}`,
        details: {
          step: 'Listing files',
          error: listError.message,
          code: listError.code
        }
      };
    }
    
    // Test 5: Try to create a test file
    config.info('Test 5: Creating test file...');
    try {
      const testFile = await drive.files.create({
        requestBody: {
          name: 'Test Access File',
          mimeType: 'text/plain',
          parents: [sanitizedDriveId]
        },
        supportsAllDrives: true,
        fields: 'id,name'
      });
      console.log('✅ Test file created:', testFile.data);
      
      // Clean up test file
      await drive.files.delete({
        fileId: testFile.data.id,
        supportsAllDrives: true
      });
      console.log('✅ Test file cleaned up');
      
    } catch (createError) {
      console.error('❌ Error creating test file:', createError.message);
      return {
        success: false,
        error: `Cannot create files in Shared Drive: ${createError.message}`,
        details: {
          step: 'Creating test file',
          error: createError.message,
          code: createError.code,
          suggestion: 'Service account needs "Manager" or "Content manager" role'
        }
      };
    }
    
    console.log('✅ All tests passed! Shared Drive access is working correctly.');
    
    return {
      success: true,
      message: 'Shared Drive access is working correctly!',
      details: {
        sharedDriveId: sanitizedDriveId,
        projectId: projectId,
        userEmail: userEmail,
        testsPassed: ['Authentication', 'Metadata', 'File Listing', 'File Creation']
      }
    };
    
  } catch (error) {
    console.error('Error in debugSharedDriveAccess:', error);
    return {
      success: false,
      error: error.message,
      details: {
        step: 'General error',
        error: error.message
      }
    };
  }
});
