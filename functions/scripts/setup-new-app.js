#!/usr/bin/env node

/**
 * Setup script for transferring functions to a new Firebase app
 * This script helps configure the functions for a new project
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupNewApp() {
  console.log('🚀 Firebase Functions Setup for New App');
  console.log('=====================================\n');

  try {
    // Get project details
    const projectId = await question('Enter your Firebase Project ID: ');
    const region = await question('Enter your preferred region (default: us-central1): ') || 'us-central1';
    const storageRegion = await question('Enter your storage region (default: us-west1): ') || 'us-west1';
    
    // Get storage bucket
    const storageBucket = await question(`Enter your storage bucket (default: ${projectId}.appspot.com): `) || `${projectId}.appspot.com`;
    
    // Get app name
    const appName = await question('Enter your app name (for email templates): ') || projectId;
    
    // Get email configuration
    const emailProvider = await question('Enter email provider (sendgrid/mailgun/firebase-extensions): ') || 'sendgrid';
    const emailFrom = await question(`Enter default from email (default: noreply@${projectId}.web.app): `) || `noreply@${projectId}.web.app`;
    
    // Get Google Drive configuration
    const useGoogleDrive = await question('Will you use Google Drive integration? (y/n): ') === 'y';
    const serviceAccountPath = useGoogleDrive ? 
      await question('Enter path to service account key file (optional): ') : '';
    
    // Get student configuration
    const defaultPeriods = await question('Enter default number of periods (default: 7): ') || '7';
    const grades = await question('Enter default grades (comma-separated, default: 7,8,9): ') || '7,8,9';
    
    // Create configuration
    const config = {
      firebase: {
        projectId: projectId,
        region: region,
        storageRegion: storageRegion,
        storageBucket: storageBucket
      },
      email: {
        provider: emailProvider,
        defaultFrom: emailFrom,
        templates: {
          studentNotification: 'student-notification',
          adminNotification: 'admin-notification'
        }
      },
      googleDrive: {
        enabled: useGoogleDrive,
        serviceAccountKeyPath: serviceAccountPath
      },
      students: {
        defaultPeriods: parseInt(defaultPeriods),
        defaultGrades: grades.split(',').map(g => g.trim())
      }
    };

    // Update app-config.js
    await updateAppConfig(config);
    
    // Update package.json
    await updatePackageJson(projectId);
    
    // Create environment file
    await createEnvironmentFile(config);
    
    // Create deployment script
    await createDeploymentScript(projectId);
    
    console.log('\n✅ Setup complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Run: npm install');
    console.log('2. Set up your Firebase project: firebase use ' + projectId);
    console.log('3. Deploy functions: firebase deploy --only functions');
    console.log('4. Deploy security rules: firebase deploy --only firestore:rules,storage');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    rl.close();
  }
}

async function updateAppConfig(config) {
  console.log('\n📝 Updating app configuration...');
  
  const configPath = path.join(__dirname, '../config/app-config.js');
  let configContent = fs.readFileSync(configPath, 'utf8');
  
  // Update Firebase configuration
  configContent = configContent.replace(
    /projectId: process\.env\.FIREBASE_PROJECT_ID \|\| 'casemangervue'/,
    `projectId: process.env.FIREBASE_PROJECT_ID || '${config.firebase.projectId}'`
  );
  
  configContent = configContent.replace(
    /region: process\.env\.FIREBASE_REGION \|\| 'us-central1'/,
    `region: process.env.FIREBASE_REGION || '${config.firebase.region}'`
  );
  
  configContent = configContent.replace(
    /storageRegion: process\.env\.FIREBASE_STORAGE_REGION \|\| 'us-west1'/,
    `storageRegion: process.env.FIREBASE_STORAGE_REGION || '${config.firebase.storageRegion}'`
  );
  
  configContent = configContent.replace(
    /storageBucket: process\.env\.FIREBASE_STORAGE_BUCKET \|\| 'casemangervue\.appspot\.com'/,
    `storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '${config.firebase.storageBucket}'`
  );
  
  // Update email configuration
  configContent = configContent.replace(
    /provider: 'sendgrid'/,
    `provider: '${config.email.provider}'`
  );
  
  configContent = configContent.replace(
    /defaultFrom: 'noreply@casemangervue\.web\.app'/,
    `defaultFrom: '${config.email.defaultFrom}'`
  );
  
  // Update student configuration
  configContent = configContent.replace(
    /defaultPeriods: 7/,
    `defaultPeriods: ${config.students.defaultPeriods}`
  );
  
  configContent = configContent.replace(
    /defaultGrades: \['7', '8', '9'\]/,
    `defaultGrades: [${config.students.defaultGrades.map(g => `'${g}'`).join(', ')}]`
  );
  
  fs.writeFileSync(configPath, configContent);
  console.log('✅ App configuration updated');
}

async function updatePackageJson(projectId) {
  console.log('📝 Updating package.json...');
  
  const packagePath = path.join(__dirname, '../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  // Update package name
  packageJson.name = `${projectId}-functions`;
  
  // Update description
  packageJson.description = `Firebase Cloud Functions for ${projectId}`;
  
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
  console.log('✅ Package.json updated');
}

async function createEnvironmentFile(config) {
  console.log('📝 Creating environment file...');
  
  const envContent = `# Firebase Configuration
FIREBASE_PROJECT_ID=${config.firebase.projectId}
FIREBASE_REGION=${config.firebase.region}
FIREBASE_STORAGE_REGION=${config.firebase.storageRegion}
FIREBASE_STORAGE_BUCKET=${config.firebase.storageBucket}

# Google Service Account (if using Google Drive)
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=${config.googleDrive.serviceAccountKeyPath || ''}

# Email Configuration
EMAIL_PROVIDER=${config.email.provider}
EMAIL_FROM=${config.email.defaultFrom}

# Logging
LOG_LEVEL=info
NODE_ENV=production

# Security
TOKEN_REFRESH_INTERVAL=1800000
SESSION_TIMEOUT=1800000
`;

  const envPath = path.join(__dirname, '../.env');
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Environment file created');
}

async function createDeploymentScript(projectId) {
  console.log('📝 Creating deployment script...');
  
  const scriptContent = `#!/bin/bash

# Deployment script for ${projectId}
# This script helps deploy the functions to your Firebase project

echo "🚀 Deploying Firebase Functions for ${projectId}"

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the functions directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Set Firebase project
echo "🔧 Setting Firebase project to ${projectId}..."
firebase use ${projectId}

# Deploy functions
echo "🚀 Deploying functions..."
firebase deploy --only functions

# Deploy security rules
echo "🔒 Deploying security rules..."
firebase deploy --only firestore:rules,storage

echo "✅ Deployment complete!"
echo "🌐 Your app should be available at: https://${projectId}.web.app"
`;

  const scriptPath = path.join(__dirname, '../deploy.sh');
  fs.writeFileSync(scriptPath, scriptContent);
  fs.chmodSync(scriptPath, '755');
  console.log('✅ Deployment script created');
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupNewApp();
}

module.exports = { setupNewApp };
