// functions/modules/testingSync.js
// Cloud Function to sync testing accommodations data

const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const db = getFirestore();

/**
 * Sync testing accommodations data when student documents change
 * Creates a secure, filtered collection with only testing-relevant data
 */
exports.syncTestingAccommodations = onDocumentWritten(
  'students/{studentId}',
  async (event) => {
    const studentId = event.params.studentId;
    const before = event.data?.before?.exists ? event.data.before.data() : null;
    const after = event.data?.after?.exists ? event.data.after.data() : null;

    console.log(`🔄 Testing Sync: Processing student ${studentId}`);

    try {
      // If student was deleted, remove from testing collection
      if (!after) {
        console.log(`🗑️ Testing Sync: Deleting testing data for ${studentId}`);
        await db.collection('testingAccommodations').doc(studentId).delete();
        return;
      }

      // Extract only testing-relevant data (no sensitive information)
      // Structure data to match getDisplayValue expectations
      const testingData = {
        id: studentId,
        ssid: after.ssid || null,
        
        // App structure to match getDisplayValue field resolution
        app: {
          studentData: {
            firstName: after.app?.studentData?.firstName || null,
            lastName: after.app?.studentData?.lastName || null,
            grade: after.app?.studentData?.grade || null,
            plan: after.app?.studentData?.plan || null,
            caseManagerId: after.app?.studentData?.caseManagerId || null
          },
          accommodations: {
            // Testing accommodations only (NO custom flags as requested)
            assessment: after.app?.accommodations?.assessment || null
          },
          flags: {
            separateSetting: after.app?.flags?.separateSetting || after.app?.flags?.flag2 || false,
            flag2: after.app?.flags?.flag2 || false
          },
          schedule: {
            // Schedule - EXACT same structure as student object (preserving co-teaching)
            periods: after.app?.schedule?.periods || {}
          }
        },
        
        // Metadata
        lastUpdated: FieldValue.serverTimestamp(),
        source: 'students'
      };

      // Only sync if student has separate setting flag (testing relevant)
      if (testingData.app.flags.separateSetting) {
        console.log(`✅ Testing Sync: Updating testing data for ${testingData.app.studentData.firstName} ${testingData.app.studentData.lastName}`);
        await db.collection('testingAccommodations').doc(studentId).set(testingData);
      } else {
        // Remove from testing collection if no longer has separate setting
        console.log(`❌ Testing Sync: Removing ${testingData.app.studentData.firstName} ${testingData.app.studentData.lastName} (no separate setting)`);
        await db.collection('testingAccommodations').doc(studentId).delete();
      }

      console.log(`🎯 Testing Sync: Successfully processed ${studentId}`);
      
    } catch (error) {
      console.error(`❌ Testing Sync Error for ${studentId}:`, error);
      throw error;
    }
  }
);
