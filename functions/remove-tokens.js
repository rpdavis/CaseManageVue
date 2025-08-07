const { onObjectFinalized, onObjectMetadataUpdated } = require("firebase-functions/v2/storage");
const { getStorage } = require("firebase-admin/storage");

// Use configuration helper for bucket and region
const config = require("./utils/config-helper");

// Trigger 1: Remove token on file finalization
exports.removeDownloadTokensOnFinalize = onObjectFinalized(
  config.createStorageTriggerOptions({
    bucket: config.getStorageBucket()
  }),
  async (event) => {
  const object = event.data;
  config.info(`File finalized: ${object.name}`);
  
  if (!object.name?.startsWith(config.getStoragePath('studentsPath'))) {
    config.info(`Skipping non-student file: ${object.name}`);
    return;
  }

  await removeTokenFromFile(object);
});

// Trigger 2: Remove token when metadata is updated (catches token addition)
exports.removeDownloadTokensOnMetadata = onObjectMetadataUpdated(
  config.createStorageTriggerOptions({
    bucket: config.getStorageBucket()
  }),
  async (event) => {
  const object = event.data;
  config.info(`Metadata updated: ${object.name}`);
  
  if (!object.name?.startsWith(config.getStoragePath('studentsPath'))) {
    config.info(`Skipping non-student file: ${object.name}`);
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
      config.info(`Found token in event data for: ${object.name}`);
      await file.setMetadata({ 
        metadata: { firebaseStorageDownloadTokens: null } 
      });
      config.success(`Token removed from: ${object.name}`);
      return;
    }
    
    // If not in event data, fetch current metadata
    const [metadata] = await file.getMetadata();
    if (metadata.metadata?.firebaseStorageDownloadTokens) {
      config.info(`Found token in file metadata for: ${object.name}`);
      await file.setMetadata({ 
        metadata: { firebaseStorageDownloadTokens: null } 
      });
      config.success(`Token removed from: ${object.name}`);
    } else {
      config.info(`No download tokens found for: ${object.name}`);
    }
  } catch (error) {
    config.error(`Error processing ${object.name}:`, error);
  }
}

// Export the main function for backward compatibility
exports.removeDownloadTokens = exports.removeDownloadTokensOnFinalize; 