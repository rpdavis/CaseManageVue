// Configuration helper utility
// Provides easy access to app configuration throughout functions

const appConfig = require('../config/app-config');

class ConfigHelper {
  constructor() {
    this.config = appConfig.getConfig();
  }

  // ─── FIREBASE CONFIGURATION ────────────────────────────────────────────────
  getFirebaseConfig() {
    return this.config.firebase;
  }

  getProjectId() {
    return this.config.firebase.projectId;
  }

  getRegion() {
    return this.config.firebase.region;
  }

  getStorageRegion() {
    return this.config.firebase.storageRegion;
  }

  getStorageBucket() {
    return this.config.firebase.storageBucket;
  }

  // ─── FUNCTION CONFIGURATION ────────────────────────────────────────────────
  getFunctionConfig() {
    return this.config.functions;
  }

  getDefaultRegion() {
    return this.config.functions.defaultRegion;
  }

  getMemory() {
    return this.config.functions.memory;
  }

  getMaxInstances() {
    return this.config.functions.maxInstances;
  }

  getTimeoutSeconds() {
    return this.config.functions.timeoutSeconds;
  }

  // ─── COLLECTION NAMES ──────────────────────────────────────────────────────
  getCollections() {
    return this.config.collections;
  }

  getCollection(name) {
    return this.config.collections[name];
  }

  // ─── STORAGE CONFIGURATION ────────────────────────────────────────────────
  getStorageConfig() {
    return this.config.storage;
  }

  getStoragePath(pathName) {
    return this.config.storage[pathName];
  }

  getDownloadTokenExpiry() {
    return this.config.storage.downloadTokenExpiry;
  }

  getSignedUrlExpiry() {
    return this.config.storage.signedUrlExpiry;
  }

  // ─── ROLES AND PERMISSIONS ────────────────────────────────────────────────
  getRoles() {
    return this.config.roles;
  }

  getValidRoles() {
    return this.config.roles.validRoles;
  }

  getAdminRoles() {
    return this.config.roles.adminRoles;
  }

  getSuperAdminRoles() {
    return this.config.roles.superAdminRoles;
  }

  getStaffRoles() {
    return this.config.roles.staffRoles;
  }

  getFullReadAccessRoles() {
    return this.config.roles.fullReadAccessRoles;
  }

  // ─── STUDENT CONFIGURATION ────────────────────────────────────────────────
  getStudentConfig() {
    return this.config.students;
  }

  getPlanTypes() {
    return this.config.students.planTypes;
  }

  getDefaultPeriods() {
    return this.config.students.defaultPeriods;
  }

  getDefaultGrades() {
    return this.config.students.defaultGrades;
  }

  // ─── AERIES API CONFIGURATION ─────────────────────────────────────────────
  getAeriesConfig() {
    return this.config.aeries;
  }

  // ─── EMAIL CONFIGURATION ──────────────────────────────────────────────────
  getEmailConfig() {
    return this.config.email;
  }

  // ─── GOOGLE DRIVE CONFIGURATION ───────────────────────────────────────────
  getGoogleDriveConfig() {
    return this.config.googleDrive;
  }

  // ─── SECURITY CONFIGURATION ───────────────────────────────────────────────
  getSecurityConfig() {
    return this.config.security;
  }

  getTokenRefreshInterval() {
    return this.config.security.tokenRefreshInterval;
  }

  getSessionTimeout() {
    return this.config.security.sessionTimeout;
  }

  // ─── LOGGING CONFIGURATION ────────────────────────────────────────────────
  getLoggingConfig() {
    return this.config.logging;
  }

  getLogPrefix(type) {
    return this.config.logging.prefixes[type] || 'ℹ️';
  }

  // ─── ENVIRONMENT CONFIGURATION ────────────────────────────────────────────
  getEnvironment() {
    return this.config.currentEnvironment;
  }

  isDevelopment() {
    return this.config.currentEnvironment === 'development';
  }

  isProduction() {
    return this.config.currentEnvironment === 'production';
  }

  // ─── HELPER METHODS ────────────────────────────────────────────────────────
  
  // Create function options with default configuration
  createFunctionOptions(options = {}) {
    return {
      region: this.getDefaultRegion(),
      memory: this.getMemory(),
      maxInstances: this.getMaxInstances(),
      timeoutSeconds: this.getTimeoutSeconds(),
      ...options
    };
  }

  // Create HTTP function options
  createHttpFunctionOptions(options = {}) {
    return {
      region: this.getDefaultRegion(),
      allowUnauthenticated: this.config.functions.allowUnauthenticated,
      cors: this.config.functions.cors,
      ...options
    };
  }

  // Create document trigger options
  createDocumentTriggerOptions(document, options = {}) {
    return {
      document: document,
      region: this.getDefaultRegion(),
      ...options
    };
  }

  // Create storage trigger options
  createStorageTriggerOptions(options = {}) {
    return {
      region: this.getStorageRegion(),
      ...options
    };
  }

  // Validate role
  isValidRole(role) {
    return this.getValidRoles().includes(role);
  }

  // Check if user has admin role
  isAdminRole(role) {
    return this.getAdminRoles().includes(role);
  }

  // Check if user has super admin role
  isSuperAdminRole(role) {
    return this.getSuperAdminRoles().includes(role);
  }

  // Check if user has staff role
  isStaffRole(role) {
    return this.getStaffRoles().includes(role);
  }

  // Check if user has full read access
  hasFullReadAccess(role) {
    return this.getFullReadAccessRoles().includes(role);
  }

  // Get collection path with proper formatting
  getCollectionPath(collectionName) {
    const collection = this.getCollection(collectionName);
    if (!collection) {
      throw new Error(`Collection '${collectionName}' not found in configuration`);
    }
    return collection;
  }

  // Get storage path with proper formatting
  getStoragePathWithParams(pathName, params = {}) {
    let path = this.getStoragePath(pathName);
    
    // Replace parameters in path
    Object.keys(params).forEach(key => {
      path = path.replace(`{${key}}`, params[key]);
    });
    
    return path;
  }

  // Log with proper prefix
  log(type, message, data = null) {
    const prefix = this.getLogPrefix(type);
    const timestamp = new Date().toISOString();
    
    if (data) {
      console.log(`${prefix} [${timestamp}] ${message}`, data);
    } else {
      console.log(`${prefix} [${timestamp}] ${message}`);
    }
  }

  // Error logging
  error(message, error = null) {
    this.log('error', message, error);
  }

  // Success logging
  success(message, data = null) {
    this.log('success', message, data);
  }

  // Info logging
  info(message, data = null) {
    this.log('info', message, data);
  }

  // Warning logging
  warning(message, data = null) {
    this.log('warning', message, data);
  }

  // Debug logging
  debug(message, data = null) {
    if (this.isDevelopment()) {
      this.log('debug', message, data);
    }
  }

  // Security logging
  security(message, data = null) {
    this.log('security', message, data);
  }
}

// Create singleton instance
const configHelper = new ConfigHelper();

module.exports = configHelper;
