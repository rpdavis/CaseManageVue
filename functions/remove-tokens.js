const { onObjectFinalized, onObjectMetadataUpdated } = require("firebase-functions/v2/storage");
const { getStorage } = require("firebase-admin/storage");

// Use the correct bucket name from Firebase config
const BUCKET_NAME = "casemangervue.firebasestorage.app";
const REGION = "us-west1"; // Bucket region for storage triggers

// Trigger 1: Remove token on file finalization
exports.removeDownloadTokensOnFinalize = onObjectFinalized({
  bucket: BUCKET_NAME,
  region: REGION
}, async (event) => {
  const object = event.data;
  console.log(`🔧 File finalized: ${object.name}`);
  
  if (!object.name?.startsWith('students/')) {
    console.log(`⏭️ Skipping non-student file: ${object.name}`);
    return;
  }

  await removeTokenFromFile(object);
});

// Trigger 2: Remove token when metadata is updated (catches token addition)
exports.removeDownloadTokensOnMetadata = onObjectMetadataUpdated({
  bucket: BUCKET_NAME, 
  region: REGION
}, async (event) => {
  const object = event.data;
  console.log(`🔧 Metadata updated: ${object.name}`);
  
  if (!object.name?.startsWith('students/')) {
    console.log(`⏭️ Skipping non-student file: ${object.name}`);
    return;
  }

  await removeTokenFromFile(object);
});

// Shared function to remove download tokens
async function removeTokenFromFile(object) {
  try {
    const file = getStorage().bucket(object.bucket).file(object.name);
    
    // Check if token exists in the event data first
    if (object.metadata?.firebaseStorageDownloadTokens) {
      console.log(`🔍 Found token in event data for: ${object.name}`);
      await file.setMetadata({ 
        metadata: { firebaseStorageDownloadTokens: null } 
      });
      console.log(`✅ Token removed from: ${object.name}`);
      return;
    }
    
    // If not in event data, fetch current metadata
    const [metadata] = await file.getMetadata();
    if (metadata.metadata?.firebaseStorageDownloadTokens) {
      console.log(`🔍 Found token in file metadata for: ${object.name}`);
      await file.setMetadata({ 
        metadata: { firebaseStorageDownloadTokens: null } 
      });
      console.log(`✅ Token removed from: ${object.name}`);
    } else {
      console.log(`ℹ️ No download tokens found for: ${object.name}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${object.name}:`, error);
  }
}

// Export the main function for backward compatibility
exports.removeDownloadTokens = exports.removeDownloadTokensOnFinalize; 