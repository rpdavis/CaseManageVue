# Firebase Functions Transfer Guide

## 🚀 **Easy App Transfer System**

This guide explains how to transfer the Firebase Cloud Functions to a new app with minimal configuration changes.

## 📋 **What's Included**

### **1. Centralized Configuration (`config/app-config.js`)**
- **Firebase Project Settings**: Project ID, regions, storage bucket
- **Function Configuration**: Memory, timeout, instance limits
- **Collection Names**: All Firestore collection paths
- **Storage Paths**: File storage organization
- **Roles & Permissions**: User role definitions
- **Student Configuration**: Plan types, periods, grades
- **Email Settings**: Provider, templates, from addresses
- **Google Drive**: Service account, scopes, permissions
- **Security**: Token refresh, session timeout, threat detection
- **Logging**: Debug levels, prefixes, environment settings

### **2. Configuration Helper (`utils/config-helper.js`)**
- **Easy Access**: Simple methods to get any configuration
- **Validation**: Role validation, path checking
- **Logging**: Standardized logging with prefixes
- **Environment**: Development vs production settings
- **Function Options**: Pre-configured function settings

### **3. Setup Script (`scripts/setup-new-app.js`)**
- **Interactive Setup**: Guided configuration process
- **Automatic Updates**: Updates all necessary files
- **Environment Files**: Creates `.env` with proper settings
- **Deployment Script**: Creates `deploy.sh` for easy deployment

## 🔧 **Quick Transfer Process**

### **Step 1: Run Setup Script**
```bash
cd functions
node scripts/setup-new-app.js
```

The script will ask for:
- Firebase Project ID
- Preferred regions
- Storage bucket name
- Email configuration
- Google Drive settings
- Student data settings

### **Step 2: Update Configuration (Optional)**
If you need custom settings, edit `config/app-config.js`:

```javascript
module.exports = {
  firebase: {
    projectId: 'your-new-project-id',
    region: 'us-central1',
    storageRegion: 'us-west1',
    storageBucket: 'your-new-project.appspot.com'
  },
  // ... other settings
};
```

### **Step 3: Deploy**
```bash
# Use the generated deployment script
./deploy.sh

# Or deploy manually
firebase use your-new-project-id
firebase deploy --only functions
firebase deploy --only firestore:rules,storage
```

## 📁 **Configuration Structure**

### **Firebase Settings**
```javascript
firebase: {
  projectId: 'your-project-id',
  region: 'us-central1',
  storageRegion: 'us-west1',
  storageBucket: 'your-project.appspot.com'
}
```

### **Function Settings**
```javascript
functions: {
  defaultRegion: 'us-central1',
  memory: '256MB',
  maxInstances: 10,
  timeoutSeconds: 540
}
```

### **Collection Names**
```javascript
collections: {
  students: 'students',
  users: 'users',
  appSettings: 'app_settings',
  // ... all collection paths
}
```

### **Storage Paths**
```javascript
storage: {
  studentsPath: 'students',
  sensitivePath: 'students/{studentId}/sensitive',
  downloadTokenExpiry: 15 * 60 * 1000, // 15 minutes
  signedUrlExpiry: 5 * 60 * 1000 // 5 minutes
}
```

### **Roles & Permissions**
```javascript
roles: {
  validRoles: ['admin', 'school_admin', 'sped_chair', ...],
  adminRoles: ['admin', 'school_admin', 'admin_504', 'sped_chair'],
  superAdminRoles: ['admin', 'school_admin'],
  staffRoles: ['case_manager', 'teacher', 'service_provider', 'paraeducator']
}
```

## 🔄 **Using Configuration in Functions**

### **Before (Hardcoded)**
```javascript
exports.myFunction = onCall({
  region: "us-central1",
  maxInstances: 10
}, async (request) => {
  const bucket = getStorage().bucket();
  const file = bucket.file(`students/${fileName}`);
  // ... hardcoded paths and settings
});
```

### **After (Configurable)**
```javascript
const config = require('./utils/config-helper');

exports.myFunction = onCall(
  config.createFunctionOptions(), 
  async (request) => {
    const bucket = getStorage().bucket();
    const filePath = config.getStoragePathWithParams('studentsPath', { fileName });
    const file = bucket.file(filePath);
    
    config.success('Function executed successfully');
    // ... configurable and logged
  }
);
```

## 🌍 **Environment Variables**

The system supports environment variables for sensitive configuration:

```bash
# .env file
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_REGION=us-central1
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=/path/to/service-account.json
EMAIL_PROVIDER=sendgrid
LOG_LEVEL=info
NODE_ENV=production
```

## 🔒 **Security Configuration**

### **Token Refresh**
```javascript
security: {
  tokenRefreshInterval: 30 * 60 * 1000, // 30 minutes
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  warningTime: 5 * 60 * 1000 // 5 minutes before timeout
}
```

### **Threat Detection**
```javascript
security: {
  maxInputLength: 1000,
  allowedCharacters: /^[a-zA-Z0-9\s\-_@.]+$/,
  dataRetentionDays: 7 * 365, // 7 years
  auditLogRetentionDays: 10 * 365 // 10 years
}
```

## 📊 **Logging System**

### **Standardized Logging**
```javascript
const config = require('./utils/config-helper');

// Different log types with prefixes
config.success('Operation completed', { userId: '123' });
config.error('Operation failed', error);
config.warning('Deprecated function called');
config.info('User logged in', { email: 'user@example.com' });
config.debug('Debug information', { data: 'value' });
config.security('Security event', { action: 'login' });
```

### **Log Output**
```
✅ [2024-01-15T10:30:00.000Z] Operation completed { userId: '123' }
❌ [2024-01-15T10:30:01.000Z] Operation failed Error: ...
⚠️ [2024-01-15T10:30:02.000Z] Deprecated function called
ℹ️ [2024-01-15T10:30:03.000Z] User logged in { email: 'user@example.com' }
🔧 [2024-01-15T10:30:04.000Z] Debug information { data: 'value' }
🔒 [2024-01-15T10:30:05.000Z] Security event { action: 'login' }
```

## 🚀 **Deployment Automation**

### **Generated deploy.sh Script**
```bash
#!/bin/bash
# Automatic deployment script

echo "🚀 Deploying Firebase Functions for your-project-id"

# Install dependencies
npm install

# Set Firebase project
firebase use your-project-id

# Deploy functions
firebase deploy --only functions

# Deploy security rules
firebase deploy --only firestore:rules,storage

echo "✅ Deployment complete!"
```

## 🔧 **Customization Options**

### **1. Collection Names**
Change collection names in `config/app-config.js`:
```javascript
collections: {
  students: 'your-students-collection',
  users: 'your-users-collection',
  // ... customize all collection names
}
```

### **2. Storage Paths**
Modify storage organization:
```javascript
storage: {
  studentsPath: 'your-students-path',
  sensitivePath: 'your-sensitive-path/{studentId}/secure',
  // ... customize all storage paths
}
```

### **3. Roles & Permissions**
Add or modify roles:
```javascript
roles: {
  validRoles: ['admin', 'your-custom-role', ...],
  adminRoles: ['admin', 'your-admin-role'],
  // ... customize all role definitions
}
```

### **4. Function Settings**
Adjust function performance:
```javascript
functions: {
  memory: '512MB', // Increase memory
  maxInstances: 20, // More instances
  timeoutSeconds: 900, // Longer timeout
  // ... customize all function settings
}
```

## 📋 **Migration Checklist**

### **Pre-Migration**
- [ ] Backup current configuration
- [ ] Document custom settings
- [ ] Plan new project structure

### **Migration**
- [ ] Run setup script
- [ ] Verify configuration
- [ ] Test in development
- [ ] Deploy to production

### **Post-Migration**
- [ ] Verify all functions work
- [ ] Check security rules
- [ ] Test user roles
- [ ] Monitor logs

## 🎯 **Benefits**

### **1. Easy Transfer**
- **Single Configuration File**: Change one file to transfer to new app
- **Automated Setup**: Interactive script handles configuration
- **Environment Support**: Development vs production settings

### **2. Maintainable Code**
- **Centralized Settings**: All configuration in one place
- **Type Safety**: Helper functions prevent errors
- **Standardized Logging**: Consistent logging across functions

### **3. Scalable Architecture**
- **Modular Design**: Easy to add new features
- **Environment Variables**: Secure configuration management
- **Performance Tuning**: Easy to adjust function settings

### **4. Developer Friendly**
- **Clear Documentation**: Comprehensive guides
- **Debug Support**: Development logging
- **Error Handling**: Standardized error responses

## 🚀 **Quick Start for New App**

1. **Clone Functions**
   ```bash
   git clone <functions-repo>
   cd functions
   ```

2. **Run Setup**
   ```bash
   node scripts/setup-new-app.js
   ```

3. **Deploy**
   ```bash
   ./deploy.sh
   ```

4. **Verify**
   - Check Firebase Console
   - Test user authentication
   - Verify function logs

**That's it! Your functions are now configured for the new app with minimal effort.**
