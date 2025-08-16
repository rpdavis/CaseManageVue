const { onCall } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");
const config = require("./utils/config-helper");

const db = getFirestore();

exports.testSchools = onCall(
  config.createFunctionOptions(),
  async (request) => {
  try {
    const schoolsSnapshot = await db.collection(config.getCollection("schools")).get();
    const schools = [];
    
    schoolsSnapshot.forEach(doc => {
      schools.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return {
      success: true,
      count: schools.length,
      schools: schools
    };
    
  } catch (error) {
    config.error('Error testing schools:', error);
    return {
      success: false,
      error: error.message
    };
  }
});
