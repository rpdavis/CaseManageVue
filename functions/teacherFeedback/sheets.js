/* eslint-disable */
// functions/teacherFeedback/sheets.js

const { HttpsError } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");
const { google } = require("googleapis");
const { createSheetsClient, createDriveClient, getDriveConfig, isUsingSharedDrive } = require("./helpers");
const config = require("../utils/config-helper");

const db = getFirestore();

// Check Google Drive storage quota
async function checkDriveQuota(drive, userEmail) {
  try {
    // Get about information for the user's drive
    const about = await drive.about.get({
      fields: 'storageQuota,user'
    });
    
    const quota = about.data.storageQuota;
    const user = about.data.user;
    
    config.info(`Drive quota for ${userEmail}:`, {
      total: quota.limit,
      used: quota.usage,
      available: quota.limit - quota.usage,
      usagePercent: Math.round((quota.usage / quota.limit) * 100)
    });
    
    // Check if we have enough space (at least 1MB available)
    const availableBytes = quota.limit - quota.usage;
    const minRequiredBytes = 1024 * 1024; // 1MB
    
    if (availableBytes < minRequiredBytes) {
      throw new Error(`Insufficient storage space. Available: ${Math.round(availableBytes / 1024 / 1024)}MB, Required: 1MB minimum`);
    }
    
    return {
      success: true,
      quota: {
        total: quota.limit,
        used: quota.usage,
        available: availableBytes,
        usagePercent: Math.round((quota.usage / quota.limit) * 100)
      }
    };
    
  } catch (error) {
    config.error('Error checking drive quota:', error);
    throw new HttpsError('internal', 'Failed to check drive storage: ' + error.message);
  }
}

// Check service account's own Drive storage quota
async function checkServiceAccountStorage() {
  try {
    const drive = await createDriveClient();
    
    // Get about information for the service account's own drive
    const about = await drive.about.get({
      fields: 'storageQuota,user'
    });
    
    const quota = about.data.storageQuota;
    const user = about.data.user;
    
    // Handle case where quota is not available or is 0
    const total = parseInt(quota.limit) || 0;
    const used = parseInt(quota.usage) || 0;
    const available = Math.max(0, total - used);
    const usagePercent = total > 0 ? Math.round((used / total) * 100) : 0;
    
    config.info(`Service Account Drive Storage:`, {
      user: user.emailAddress,
      total: total,
      used: used,
      available: available,
      usagePercent: usagePercent
    });
    
    return {
      success: true,
      quota: {
        total: total,
        used: used,
        available: available,
        usagePercent: usagePercent
      },
      user: user.emailAddress
    };
    
  } catch (error) {
    config.error('Error checking service account storage:', error);
    throw new HttpsError('internal', 'Failed to check service account storage: ' + error.message);
  }
}

// Create Google Sheet in either personal drive or shared drive
async function createGoogleSheet(title, description, userEmail, userName, schoolId = null, studentId = null, studentName = null, folderId = null) {
  try {
    // Use OAuth 2.0 with user's personal account instead of service account
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || config.getAppUrl()
    );
    
    // For now, we'll use the service account but create files in the user's shared folder
    // This is a simpler approach that should work immediately
    const sheets = await createSheetsClient();
    const drive = await createDriveClient();

    // Get school data if schoolId provided
    let schoolData = null;
    if (schoolId) {
      const schoolDoc = await db.collection('schools').doc(schoolId).get();
      if (schoolDoc.exists) {
        schoolData = schoolDoc.data();
      }
    }

    // Get drive configuration
    const driveConfig = getDriveConfig(schoolData);
    console.log(`📁 Using drive type: ${driveConfig.type} - ${driveConfig.name}`);

    // If folderId is provided, use it instead of default parent
    if (folderId && folderId.trim()) {
      driveConfig.defaultParent = folderId.trim();
      console.log(`📁 Using specified folder ID: ${folderId}`);
    }

    // Create the spreadsheet in the user's shared folder
    const spreadsheetId = await createSpreadsheet(drive, title, driveConfig);
    console.log(`✅ Created spreadsheet: ${spreadsheetId}`);

    // Initialize the spreadsheet with headers and formatting
    await initializeSpreadsheet(sheets, spreadsheetId, title, description, studentId, studentName);

    // Share the spreadsheet with the user
    await shareSpreadsheet(drive, spreadsheetId, userEmail, driveConfig);

    // Generate URLs
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    const driveUrl = isUsingSharedDrive(driveConfig) 
      ? `https://drive.google.com/drive/folders/${driveConfig.sharedDriveId}`
      : folderId 
        ? `https://drive.google.com/drive/folders/${folderId}`
        : 'https://drive.google.com/drive/my-drive';

    return {
      spreadsheetId: spreadsheetId,
      spreadsheetUrl: spreadsheetUrl,
      driveUrl: driveUrl,
      driveType: driveConfig.type,
      driveName: driveConfig.name,
      folderId: folderId,
      success: true
    };

  } catch (error) {
    console.error('Error creating Google Sheet:', error);
    
    // Provide more helpful error messages
    if (error.message.includes('storage quota has been exceeded')) {
      throw new HttpsError('resource-exhausted', 'Service account storage quota exceeded (0 bytes available). This is a known issue. The service account needs to be configured with Google Drive storage access. For now, please use the "Check Service Account Storage" button to verify this issue.');
    } else if (error.message.includes('permission') || error.message.includes('access') || error.message.includes('caller does not have permission')) {
      throw new HttpsError('permission-denied', `Cannot access your Google Drive. Please share the folder with: ${config.getServiceAccountEmail()} with Editor permissions.`);
    } else {
      throw new HttpsError('internal', 'Failed to create Google Sheet: ' + error.message);
    }
  }
}

// Create Google Sheet using user's personal Google account
async function createGoogleSheetWithUserAuth(title, description, userEmail, userName, accessToken, folderId = null) {
  try {
    // Use the user's access token to authenticate
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    
    const sheets = google.sheets({ version: 'v4', auth });
    const drive = google.drive({ version: 'v3', auth });
    
    console.log(`📁 Creating sheet for user: ${userEmail}`);
    
    // Create the spreadsheet file
    const requestBody = {
      name: `Feedback Responses - ${title}`,
      mimeType: 'application/vnd.google-apps.spreadsheet'
    };

    // Set parent folder if provided
    if (folderId && folderId.trim()) {
      requestBody.parents = [folderId.trim()];
      console.log(`📁 Creating in folder: ${folderId}`);
    }

    console.log('🔍 Debug - Request body:', JSON.stringify(requestBody, null, 2));

    try {
      const driveRes = await drive.files.create({
        requestBody: requestBody,
        fields: 'id'
      });
      console.log('✅ File created successfully:', driveRes.data.id);
      
      const spreadsheetId = driveRes.data.id;
      
      // Initialize the spreadsheet with headers and formatting
      await initializeSpreadsheet(sheets, spreadsheetId, title, description, null, null);

      // Generate URLs
      const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
      const driveUrl = folderId 
        ? `https://drive.google.com/drive/folders/${folderId}`
        : 'https://drive.google.com/drive/my-drive';

      return {
        spreadsheetId: spreadsheetId,
        spreadsheetUrl: spreadsheetUrl,
        driveUrl: driveUrl,
        driveType: 'personal',
        driveName: 'Personal Google Drive',
        folderId: folderId,
        success: true
      };
      
    } catch (error) {
      console.error('❌ Error creating file:', error.message);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      
      if (error.message.includes('storage quota') || error.message.includes('quota exceeded')) {
        throw new Error('Your Google Drive storage quota has been exceeded. Please free up some space and try again.');
      }
      if (error.code === 403 || error.message.includes('permission') || error.message.includes('access')) {
        throw new Error('You do not have permission to create files in this location. Please check the folder permissions.');
      }
      throw error;
    }
    
  } catch (error) {
    console.error('Error creating Google Sheet with user auth:', error);
    throw new HttpsError('internal', 'Failed to create Google Sheet: ' + error.message);
  }
}

// Create the spreadsheet file
async function createSpreadsheet(drive, title, driveConfig) {
  const requestBody = {
    name: `Feedback Responses - ${title}`,
    mimeType: 'application/vnd.google-apps.spreadsheet'
  };

  // Set parent folder based on drive type
  if (isUsingSharedDrive(driveConfig)) {
    requestBody.parents = [driveConfig.sharedDriveId];
    console.log(`📁 Creating in Shared Drive: ${driveConfig.sharedDriveId}`);
  } else {
    // For personal drive, create in the specified folder
    if (driveConfig.defaultParent && driveConfig.defaultParent !== 'root') {
      requestBody.parents = [driveConfig.defaultParent];
      console.log(`📁 Creating in Personal Drive folder: ${driveConfig.defaultParent}`);
    } else {
      // Don't set parents if it's root - let it create in service account's own drive
      console.log(`📁 Creating in service account's drive (no parent specified)`);
    }
  }

  console.log('🔍 Debug - Request body:', JSON.stringify(requestBody, null, 2));

  try {
    const driveRes = await drive.files.create({
      requestBody: requestBody,
      supportsAllDrives: true, // Always true to support shared folders in personal drives
      fields: 'id'
    });
    
    console.log('✅ File created successfully:', driveRes.data.id);
    return driveRes.data.id;
  } catch (error) {
    console.error('❌ Error creating file:', error.message);
    console.error('❌ Error details:', JSON.stringify(error, null, 2));
    
    // Check if it's a storage quota issue (service account's own quota)
    if (error.message.includes('storage quota') || error.message.includes('quota exceeded')) {
      console.error('💾 Service account storage quota exceeded. Service account has 15GB limit.');
      throw new Error('Service account storage quota exceeded (15GB limit). Files created by service account count against its own quota, not your personal drive quota.');
    }
    
    // Check if it's a permissions issue
    if (error.code === 403 || error.message.includes('permission') || error.message.includes('access') || error.message.includes('caller does not have permission')) {
      console.error('🔒 Permission issue detected. Service account needs proper access to the target folder.');
      throw new Error('Service account lacks permission to create files in the specified location. Please ensure the folder is shared with the service account.');
    }
    
    throw error;
  }
}

// Initialize spreadsheet with headers and formatting
async function initializeSpreadsheet(sheets, spreadsheetId, title, description, studentId, studentName) {
  const requests = [
    // Set up headers
    {
      updateCells: {
        range: {
          sheetId: 0,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: 8
        },
        rows: [{
          values: [
            { userEnteredValue: { stringValue: 'Timestamp' } },
            { userEnteredValue: { stringValue: 'Teacher Email' } },
            { userEnteredValue: { stringValue: 'Teacher Name' } },
            { userEnteredValue: { stringValue: 'Student ID' } },
            { userEnteredValue: { stringValue: 'Student Name' } },
            { userEnteredValue: { stringValue: 'Form Title' } },
            { userEnteredValue: { stringValue: 'Response Data' } },
            { userEnteredValue: { stringValue: 'Notes' } }
          ]
        }],
        fields: 'userEnteredValue'
      }
    },
    // Format headers
    {
      repeatCell: {
        range: {
          sheetId: 0,
          startRowIndex: 0,
          endRowIndex: 1
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.2, green: 0.6, blue: 0.9 },
            textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }
          }
        },
        fields: 'userEnteredFormat'
      }
    },
    // Add metadata row
    {
      updateCells: {
        range: {
          sheetId: 0,
          startRowIndex: 1,
          endRowIndex: 2,
          startColumnIndex: 0,
          endColumnIndex: 8
        },
        rows: [{
          values: [
            { userEnteredValue: { stringValue: new Date().toISOString() } },
            { userEnteredValue: { stringValue: '' } },
            { userEnteredValue: { stringValue: '' } },
            { userEnteredValue: { stringValue: studentId || '' } },
            { userEnteredValue: { stringValue: studentName || '' } },
            { userEnteredValue: { stringValue: title } },
            { userEnteredValue: { stringValue: description || '' } },
            { userEnteredValue: { stringValue: 'Sheet created automatically by CaseManageVue' } }
          ]
        }],
        fields: 'userEnteredValue'
      }
    }
  ];

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: spreadsheetId,
    requestBody: { requests: requests }
  });
}

// Share the spreadsheet with the user
async function shareSpreadsheet(drive, spreadsheetId, userEmail, driveConfig) {
  const permission = {
    role: 'writer',
    type: 'user',
    emailAddress: userEmail
  };

  await drive.permissions.create({
    fileId: spreadsheetId,
    requestBody: permission,
    supportsAllDrives: isUsingSharedDrive(driveConfig)
  });

  console.log(`✅ Shared spreadsheet with: ${userEmail}`);
}

// Create a new tab for a specific student
async function createStudentTab(spreadsheetId, studentName, studentId) {
  try {
    const sheets = await createSheetsClient();
    
    // Create a new sheet for the student
    const tabName = sanitizeTabName(studentName);
    
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: tabName,
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 20
                }
              }
            }
          }
        ]
      }
    });
    
    // Add headers to the new tab (copy from Template)
    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: `${tabName}!A1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [['Timestamp', 'Teacher Name', 'Student Name', 'Question 1', 'Question 2', 'Question 3', 'Additional Notes']]
      }
    });
    
    // Add student info header
    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: `${tabName}!A3`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[`Student: ${studentName}`, '', '', '', '', '', '']]
      }
    });
    
    // Update Summary sheet with new student
    const summaryRange = 'Summary!A6:E';
    const summaryResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: summaryRange
    });
    
    const newRow = [studentName, tabName, '0', 'No responses yet', 'Active'];
    const updatedValues = [...(summaryResponse.data.values || []), newRow];
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: summaryRange,
      valueInputOption: 'RAW',
      requestBody: {
        values: updatedValues
      }
    });
    
    return {
      tabName: tabName,
      success: true
    };
    
  } catch (error) {
    console.error('Error creating student tab:', error);
    throw new HttpsError('internal', 'Failed to create student tab: ' + error.message);
  }
}

// Get spreadsheet data for syncing
async function getSpreadsheetData(spreadsheetId, sheetName = "Form Responses 1") {
  try {
    const sheets = await createSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetName
    });

    return response.data.values || [];
  } catch (error) {
    console.error('Error getting spreadsheet data:', error);
    throw new HttpsError('internal', 'Failed to get spreadsheet data: ' + error.message);
  }
}

// Create or get individual spreadsheet for case manager and form
async function getOrCreateCaseManagerSpreadsheet(formId, formTitle, caseManagerId, caseManagerName) {
  try {
    console.log(`🔍 Getting/creating spreadsheet for case manager: ${caseManagerName}, form: ${formTitle}`);
    
    // Check if case manager already has a spreadsheet for this form
    const existingQuery = await db.collection('caseManagerSpreadsheets')
      .where('formId', '==', formId)
      .where('caseManagerId', '==', caseManagerId)
      .limit(1)
      .get();
    
    if (!existingQuery.empty) {
      const existing = existingQuery.docs[0].data();
      console.log(`✅ Found existing spreadsheet: ${existing.spreadsheetId}`);
      return {
        spreadsheetId: existing.spreadsheetId,
        spreadsheetUrl: existing.spreadsheetUrl,
        documentId: existing.documentId,
        documentUrl: existing.documentUrl,
        isNew: false
      };
    }
    
    // Create new individual spreadsheet for this case manager
    console.log(`📊 Creating new individual spreadsheet for ${caseManagerName}`);
    
    // Get the user's access token for personal account creation
    // For now, we'll use the service account but this should be enhanced to use personal accounts
    const sheets = await createSheetsClient();
    const drive = await createDriveClient();
    
    // Create spreadsheet with case manager's name in title
    const spreadsheetTitle = `${formTitle} - ${caseManagerName} Responses`;
    
    const requestBody = {
      name: spreadsheetTitle,
      mimeType: 'application/vnd.google-apps.spreadsheet'
    };
    
    console.log('🔍 Creating spreadsheet with request body:', JSON.stringify(requestBody, null, 2));
    
    try {
      const driveRes = await drive.files.create({
        requestBody: requestBody,
        supportsAllDrives: true,
        fields: 'id'
      });
      
      const spreadsheetId = driveRes.data.id;
      console.log('✅ Individual spreadsheet created:', spreadsheetId);
      
      // Initialize the spreadsheet with Summary and Template tabs
      await initializeCaseManagerSpreadsheet(sheets, spreadsheetId, formTitle, caseManagerName);
      
      // Create corresponding Google Doc for easy reading
      const documentId = await createCaseManagerDocument(drive, formTitle, caseManagerName, spreadsheetId);
      
      // Save to Firestore
      const spreadsheetData = {
        formId: formId,
        formTitle: formTitle,
        caseManagerId: caseManagerId,
        caseManagerName: caseManagerName,
        spreadsheetId: spreadsheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
        documentId: documentId,
        documentUrl: `https://docs.google.com/document/d/${documentId}/edit`,
        createdAt: new Date(),
        studentTabs: [] // Track which student tabs have been created
      };
      
      await db.collection('caseManagerSpreadsheets').add(spreadsheetData);
      
      console.log(`✅ Created individual system for ${caseManagerName}: Sheet ${spreadsheetId}, Doc ${documentId}`);
      
      return {
        spreadsheetId: spreadsheetId,
        spreadsheetUrl: spreadsheetData.spreadsheetUrl,
        documentId: documentId,
        documentUrl: spreadsheetData.documentUrl,
        isNew: true
      };
      
    } catch (error) {
      console.error('❌ Error creating individual spreadsheet:', error.message);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      
      if (error.message.includes('storage quota') || error.message.includes('quota exceeded')) {
        throw new Error('Service account storage quota exceeded. Individual spreadsheets require personal Google account access.');
      }
      if (error.code === 403 || error.message.includes('permission')) {
        throw new Error('Service account lacks permission to create individual spreadsheets.');
      }
      throw error;
    }
    
  } catch (error) {
    console.error('Error in getOrCreateCaseManagerSpreadsheet:', error);
    throw new HttpsError('internal', 'Failed to create case manager spreadsheet: ' + error.message);
  }
}

// Initialize case manager's individual spreadsheet
async function initializeCaseManagerSpreadsheet(sheets, spreadsheetId, formTitle, caseManagerName) {
  try {
    console.log(`📋 Initializing spreadsheet for ${caseManagerName}`);
    
    // Rename the default sheet to "Summary"
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      requestBody: {
        requests: [
          {
            updateSheetProperties: {
              properties: {
                sheetId: 0,
                title: 'Summary'
              },
              fields: 'title'
            }
          }
        ]
      }
    });
    
    // Add Summary sheet headers and content
    const summaryValues = [
      [`${formTitle} - Response Summary`],
      [`Case Manager: ${caseManagerName}`],
      [`Created: ${new Date().toLocaleDateString()}`],
      [''],
      ['Student Name', 'Tab Name', 'Response Count', 'Last Response', 'Status'],
      // Student rows will be added when tabs are created
    ];
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: 'Summary!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: summaryValues
      }
    });
    
    // Create Template sheet
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: 'Template',
                gridProperties: {
                  rowCount: 100,
                  columnCount: 10
                }
              }
            }
          }
        ]
      }
    });
    
    // Add template headers (these will be copied to student tabs)
    const templateHeaders = [
      ['Timestamp', 'Teacher Name', 'Student Name', 'Question 1', 'Question 2', 'Question 3', 'Additional Notes']
    ];
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: 'Template!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: templateHeaders
      }
    });
    
    console.log('✅ Spreadsheet initialized with Summary and Template sheets');
    
  } catch (error) {
    console.error('Error initializing case manager spreadsheet:', error);
    throw error;
  }
}

// Create Google Doc for case manager to view responses in readable format
async function createCaseManagerDocument(drive, formTitle, caseManagerName, spreadsheetId) {
  try {
    console.log(`📄 Creating Google Doc for ${caseManagerName}`);
    
    const documentTitle = `${formTitle} - ${caseManagerName} Summary`;
    
    const requestBody = {
      name: documentTitle,
      mimeType: 'application/vnd.google-apps.document'
    };
    
    const driveRes = await drive.files.create({
      requestBody: requestBody,
      supportsAllDrives: true,
      fields: 'id'
    });
    
    const documentId = driveRes.data.id;
    console.log('✅ Google Doc created:', documentId);
    
    // Initialize the document with basic content
    await initializeCaseManagerDocument(documentId, formTitle, caseManagerName, spreadsheetId);
    
    return documentId;
    
  } catch (error) {
    console.error('Error creating case manager document:', error);
    throw error;
  }
}

// Initialize Google Doc with basic structure
async function initializeCaseManagerDocument(documentId, formTitle, caseManagerName, spreadsheetId) {
  try {
    const docs = await createDocsClient();
    
    const initialContent = [
      {
        insertText: {
          location: { index: 1 },
          text: `${formTitle}\nTeacher Feedback Summary\n\nCase Manager: ${caseManagerName}\nCreated: ${new Date().toLocaleDateString()}\n\nSpreadsheet: https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit\n\n--- Student Feedback Responses ---\n\n(This document will be automatically updated when new responses are received)\n\n`
        }
      }
    ];
    
    await docs.documents.batchUpdate({
      documentId: documentId,
      requestBody: {
        requests: initialContent
      }
    });
    
    console.log('✅ Document initialized with basic structure');
    
  } catch (error) {
    console.error('Error initializing document:', error);
    throw error;
  }
}

// Update Google Doc with latest form responses
async function updateCaseManagerDocument(documentId, responses, formTitle, caseManagerName) {
  try {
    console.log(`📄 Updating Google Doc ${documentId} with ${responses.length} responses`);
    
    const docs = await createDocsClient();
    
    // Get current document content
    const doc = await docs.documents.get({
      documentId: documentId
    });
    
    // Clear existing response content (everything after the header)
    const content = doc.data.body.content;
    let startIndex = 1;
    
    // Find where to start clearing (after the header section)
    for (const element of content) {
      if (element.paragraph && element.paragraph.elements) {
        const text = element.paragraph.elements
          .map(el => el.textRun?.content || '')
          .join('');
        if (text.includes('--- Student Feedback Responses ---')) {
          startIndex = element.endIndex;
          break;
        }
      }
    }
    
    // Clear existing response content
    if (content.length > 1) {
      const deleteRequests = [{
        deleteContentRange: {
          range: {
            startIndex: startIndex,
            endIndex: doc.data.body.content[doc.data.body.content.length - 1].endIndex - 1
          }
        }
      }];
      
      await docs.documents.batchUpdate({
        documentId: documentId,
        requestBody: {
          requests: deleteRequests
        }
      });
    }
    
    // Group responses by student
    const responsesByStudent = {};
    responses.forEach(response => {
      const studentName = response.studentName || 'Unknown Student';
      if (!responsesByStudent[studentName]) {
        responsesByStudent[studentName] = [];
      }
      responsesByStudent[studentName].push(response);
    });
    
    // Build new content
    let newContent = '\n\n';
    
    if (Object.keys(responsesByStudent).length === 0) {
      newContent += '(No responses received yet)\n\n';
    } else {
      Object.keys(responsesByStudent).forEach(studentName => {
        const studentResponses = responsesByStudent[studentName];
        newContent += `━━━ ${studentName} ━━━\n\n`;
        
        studentResponses.forEach((response, index) => {
          newContent += `Response ${index + 1} (${response.timestamp || 'No timestamp'})\n`;
          newContent += `Teacher: ${response.teacherName || 'Unknown'}\n\n`;
          
          // Add all response fields
          Object.keys(response).forEach(key => {
            if (!['studentName', 'teacherName', 'timestamp', 'id'].includes(key)) {
              const value = response[key];
              if (value && value.toString().trim()) {
                newContent += `${key}: ${value}\n`;
              }
            }
          });
          
          newContent += '\n' + '─'.repeat(50) + '\n\n';
        });
        
        newContent += '\n';
      });
    }
    
    newContent += `\nLast Updated: ${new Date().toLocaleString()}\n`;
    
    // Insert new content
    const insertRequests = [{
      insertText: {
        location: { index: startIndex },
        text: newContent
      }
    }];
    
    await docs.documents.batchUpdate({
      documentId: documentId,
      requestBody: {
        requests: insertRequests
      }
    });
    
    console.log('✅ Document updated with latest responses');
    
  } catch (error) {
    console.error('Error updating case manager document:', error);
    throw error;
  }
}

// Get responses for a specific case manager's spreadsheet
async function getResponsesForCaseManagerSpreadsheet(spreadsheetId) {
  try {
    console.log(`📊 Getting responses for spreadsheet: ${spreadsheetId}`);
    
    // Get responses from Firestore
    const responsesQuery = await db.collection('feedbackResponses')
      .where('spreadsheetId', '==', spreadsheetId)
      .orderBy('timestamp', 'desc')
      .get();
    
    const responses = responsesQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`✅ Found ${responses.length} responses`);
    return responses;
    
  } catch (error) {
    console.error('Error getting responses for spreadsheet:', error);
    throw error;
  }
}


// Add a student section to a case manager's tab
async function addStudentToTab(spreadsheetId, tabName, studentName, studentId) {
  try {
    const sheets = await createSheetsClient();
    
    console.log(`👤 Adding student section for: ${studentName} in tab: ${tabName}`);
    
    // Get current content to find where to add the student
    const currentData = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: `${tabName}!A:A`
    });
    
    const values = currentData.data.values || [];
    let nextRow = values.length + 1;
    
    // Check if student already has a section
    const studentSectionExists = values.some(row => 
      row[0] && row[0].includes(`Student: ${studentName}`)
    );
    
    if (studentSectionExists) {
      console.log(`✅ Student section already exists for: ${studentName}`);
      return { studentName, existed: true };
    }
    
    // Add student section
    const studentSection = [
      [`─────────────────────────────────────────────────────────────────`],
      [`Student: ${studentName} (ID: ${studentId})`],
      [`Form sent: ${new Date().toLocaleString()}`],
      [''],
      ['Timestamp', 'Teacher Name', 'Response 1', 'Response 2', 'Response 3', 'Additional Notes'],
      ['(Responses will appear here when teachers submit the form)'],
      ['']
    ];
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: `${tabName}!A${nextRow}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: studentSection
      }
    });
    
    console.log(`✅ Added student section for: ${studentName}`);
    
    return { studentName, existed: false };
    
  } catch (error) {
    console.error('Error adding student to tab:', error);
    throw new HttpsError('internal', 'Failed to add student section: ' + error.message);
  }
}

// ─── DUPLICATION FUNCTIONS ──────────────────────────────────────────────────




module.exports = {
  createGoogleSheet,
  createGoogleSheetWithUserAuth,
  checkServiceAccountStorage,
  getSpreadsheetData
}; 