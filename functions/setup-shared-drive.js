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

exports.setupSharedDrive = onCall(
  config.createFunctionOptions(),
  async (request) => {
  try {
    const client = await auth.getClient();
    const drive = google.drive({ version: 'v3', auth: client });
    
    // Create Shared Drive
    config.info('Creating Shared Drive...');
    const sharedDrive = await drive.drives.create({
      requestId: `shared-drive-${Date.now()}`,
      requestBody: {
        name: config.getGoogleDriveConfig('sharedDriveName'),
        restrictions: {
          adminManagedRestrictions: true
        }
      }
    });
    
    const sharedDriveId = sharedDrive.data.id;
    config.success(`Created Shared Drive: ${sharedDriveId}`);
    
    // Add service account as manager
    config.info('Adding service account as manager...');
    await drive.permissions.create({
      fileId: sharedDriveId,
      requestBody: {
        role: 'manager',
        type: 'user',
        emailAddress: config.getServiceAccountEmail()
      },
      supportsAllDrives: true
    });
    
    config.success('Added service account as manager');
    
    // Create Templates folder
    config.info('Creating Templates folder...');
    const templatesFolder = await drive.files.create({
      requestBody: {
        name: config.getGoogleDriveConfig('templatesFolderName'),
        mimeType: 'application/vnd.google-apps.folder',
        parents: [sharedDriveId]
      },
      supportsAllDrives: true
    });
    
    config.success(`Created Templates folder: ${templatesFolder.data.id}`);
    
    return {
      success: true,
      sharedDriveId: sharedDriveId,
      sharedDriveName: config.getGoogleDriveConfig('sharedDriveName'),
      templatesFolderId: templatesFolder.data.id,
      message: 'Shared Drive setup complete!'
    };
    
  } catch (error) {
    config.error('Error setting up Shared Drive:', error);
    return {
      success: false,
      error: error.message
    };
  }
});
