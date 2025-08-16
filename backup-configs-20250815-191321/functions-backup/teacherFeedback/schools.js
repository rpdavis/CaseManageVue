/* eslint-disable */
// functions/teacherFeedback/schools.js

const { HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { google } = require("googleapis");
const { createDriveClient, requireAuth, sanitizeString, validateEmail, validateRequired } = require("./helpers");

const db = getFirestore();

// ─── SCHOOL MANAGEMENT FUNCTIONS ─────────────────────────────────────────────

// Get or create school based on user's email domain
async function getOrCreateSchool(userEmail, userName) {
  try {
    const domain = userEmail.split('@')[1];
    if (!domain) {
      throw new HttpsError('invalid-argument', 'Invalid email format');
    }

    // Check if school already exists for this domain
    const schoolQuery = await db.collection('schools')
      .where('domain', '==', domain)
      .limit(1)
      .get();

    if (!schoolQuery.empty) {
      const schoolDoc = schoolQuery.docs[0];
      const schoolData = schoolDoc.data();
      
      console.log(`✅ Found existing school: ${schoolData.name} (${domain})`);
      return {
        schoolId: schoolDoc.id,
        ...schoolData,
        isNew: false
      };
    }

    // Create new school
    console.log(`🔄 Creating new school for domain: ${domain}`);
    const schoolId = await createNewSchool(domain, userName, userEmail);
    
    const newSchool = await db.collection('schools').doc(schoolId).get();
    return {
      schoolId: schoolId,
      ...newSchool.data(),
      isNew: true
    };

  } catch (error) {
    console.error('Error in getOrCreateSchool:', error);
    throw new HttpsError('internal', 'Failed to get or create school: ' + error.message);
  }
}

// Create a new school (without Shared Drive - will be created manually)
async function createNewSchool(domain, schoolName, adminEmail) {
  try {
    // Store school data in Firestore (without Shared Drive initially)
    const schoolData = {
      name: schoolName,
      domain: domain,
      sharedDriveId: null, // Will be set later when Shared Drive is created manually
      templatesFolderId: null, // Will be set later
      adminEmails: [adminEmail],
      createdAt: new Date(),
      createdBy: adminEmail,
      active: true
    };

    const schoolRef = db.collection('schools').doc();
    await schoolRef.set(schoolData);

    console.log(`✅ Created school record: ${schoolRef.id} (Shared Drive will be created manually)`);
    return schoolRef.id;

  } catch (error) {
    console.error('Error creating new school:', error);
    throw new HttpsError('internal', 'Failed to create new school: ' + error.message);
  }
}

// Check if user is school admin
async function isSchoolAdmin(userEmail, schoolId) {
  try {
    const schoolDoc = await db.collection('schools').doc(schoolId).get();
    if (!schoolDoc.exists) {
      return false;
    }

    const schoolData = schoolDoc.data();
    return schoolData.adminEmails && schoolData.adminEmails.includes(userEmail);

  } catch (error) {
    console.error('Error checking school admin status:', error);
    return false;
  }
}

// Add new school admin
async function addSchoolAdmin(newAdminEmail, schoolId, currentUserEmail) {
  try {
    // Validate current user is admin
    const isAdmin = await isSchoolAdmin(currentUserEmail, schoolId);
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Only school admins can add new admins');
    }

    // Validate new admin email
    if (!validateEmail(newAdminEmail)) {
      throw new HttpsError('invalid-argument', 'Invalid email format');
    }

    // Check if new admin is from same domain
    const schoolDoc = await db.collection('schools').doc(schoolId).get();
    const schoolData = schoolDoc.data();
    const newAdminDomain = newAdminEmail.split('@')[1];
    
    if (newAdminDomain !== schoolData.domain) {
      throw new HttpsError('invalid-argument', 'New admin must be from the same school domain');
    }

    // Add to admin list
    await db.collection('schools').doc(schoolId).update({
      adminEmails: FieldValue.arrayUnion(newAdminEmail)
    });

    // Add admin to Shared Drive permissions
    const drive = await createDriveClient();
    await drive.permissions.create({
      fileId: schoolData.sharedDriveId,
      requestBody: {
        role: 'manager',
        type: 'user',
        emailAddress: newAdminEmail
      },
      supportsAllDrives: true
    });

    console.log(`✅ Added ${newAdminEmail} as school admin`);
    return { success: true, message: `Added ${newAdminEmail} as school admin` };

  } catch (error) {
    console.error('Error adding school admin:', error);
    throw new HttpsError('internal', 'Failed to add school admin: ' + error.message);
  }
}

// Get school templates
async function getSchoolTemplates(schoolId) {
  try {
    const templatesQuery = await db.collection('schools').doc(schoolId)
      .collection('templates')
      .where('active', '!=', false)
      .orderBy('createdAt', 'desc')
      .get();

    return templatesQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

  } catch (error) {
    console.error('Error getting school templates:', error);
    throw new HttpsError('internal', 'Failed to get school templates: ' + error.message);
  }
}

// Create school template
async function createSchoolTemplate(templateData, schoolId, userEmail) {
  try {
    // Validate user is school admin
    const isAdmin = await isSchoolAdmin(userEmail, schoolId);
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Only school admins can create templates');
    }

    // Validate template data
    validateRequired(templateData.name, 'Template name');
    validateRequired(templateData.formUrl, 'Form URL');

    const sanitizedName = sanitizeString(templateData.name, 100);
    const sanitizedDescription = sanitizeString(templateData.description || '', 500);

    // Get school data
    const schoolDoc = await db.collection('schools').doc(schoolId).get();
    const schoolData = schoolDoc.data();

    // Create template in school's Shared Drive
    const drive = await createDriveClient();
    const template = await drive.files.create({
      requestBody: {
        name: sanitizedName,
        mimeType: 'application/vnd.google-apps.form',
        parents: [schoolData.templatesFolderId]
      },
      supportsAllDrives: true
    });

    // Store template metadata
    const templateRef = db.collection('schools').doc(schoolId).collection('templates').doc();
    await templateRef.set({
      name: sanitizedName,
      description: sanitizedDescription,
      formId: template.data.id,
      formUrl: templateData.formUrl,
      createdBy: userEmail,
      createdAt: new Date(),
      active: true
    });

    console.log(`✅ Created template: ${sanitizedName} for school: ${schoolData.name}`);
    return {
      id: templateRef.id,
      formId: template.data.id,
      name: sanitizedName,
      success: true
    };

  } catch (error) {
    console.error('Error creating school template:', error);
    throw new HttpsError('internal', 'Failed to create school template: ' + error.message);
  }
}

// Get user's school information
async function getUserSchool(userEmail) {
  try {
    const domain = userEmail.split('@')[1];
    if (!domain) {
      return {
        success: false,
        error: 'Invalid email format'
      };
    }

    const schoolQuery = await db.collection('schools')
      .where('domain', '==', domain)
      .limit(1)
      .get();

    if (schoolQuery.empty) {
      return {
        success: false,
        error: 'No school found for this domain'
      };
    }

    const schoolDoc = schoolQuery.docs[0];
    const schoolData = schoolDoc.data();
    
    return {
      success: true,
      school: {
        schoolId: schoolDoc.id,
        ...schoolData,
        isAdmin: schoolData.adminEmails && schoolData.adminEmails.includes(userEmail)
      }
    };

  } catch (error) {
    console.error('Error getting user school:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  getOrCreateSchool,
  isSchoolAdmin,
  addSchoolAdmin,
  getSchoolTemplates,
  createSchoolTemplate,
  getUserSchool
}; 