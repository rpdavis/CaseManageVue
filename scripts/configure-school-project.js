#!/usr/bin/env node

/**
 * Configure School Project Script
 * 
 * This script updates all hardcoded project references to use the correct
 * Firebase project for a new school deployment.
 * 
 * Usage: node scripts/configure-school-project.js <school-project-id>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function updateProjectConfiguration(schoolProjectId) {
  console.log(`🔧 Configuring project for: ${schoolProjectId}`);
  
  // Calculate service account email and storage bucket
  const serviceAccountEmail = `firebase-adminsdk-fbsvc@${schoolProjectId}.iam.gserviceaccount.com`;
  const storageBucket = `${schoolProjectId}.firebasestorage.app`;
  
  console.log(`📧 Service Account: ${serviceAccountEmail}`);
  console.log(`🗄️  Storage Bucket: ${storageBucket}`);
  
  // Files to update
  const filesToUpdate = [
    // Storage bucket configuration
    {
      file: 'functions/remove-tokens.js',
      find: /const BUCKET_NAME = "[^"]+";/,
      replace: `const BUCKET_NAME = "${storageBucket}";`
    },
    
    // Service account configurations
    {
      file: 'functions/setup-shared-drive.js',
      find: /emailAddress: '[^']+'/,
      replace: `emailAddress: '${serviceAccountEmail}'`
    },
    
    {
      file: 'functions/create-shared-drive.js',
      find: /"   Email: [^"]+",/,
      replace: `"   Email: ${serviceAccountEmail}",`
    },
    
    {
      file: 'functions/create-shared-drive.js',
      find: /serviceAccountEmail: "[^"]+",/,
      replace: `serviceAccountEmail: "${serviceAccountEmail}",`
    },
    
    {
      file: 'functions/teacherFeedback/index.js',
      find: /serviceAccount: "[^"]+"/,
      replace: `serviceAccount: "${serviceAccountEmail}"`
    },
    
    // Firebase configuration
    {
      file: 'firebase.json',
      find: /"serviceAccount": "[^"]+"/,
      replace: `"serviceAccount": "${serviceAccountEmail}"`
    },
    
    {
      file: '.firebaserc',
      find: /"default": "[^"]+"/,
      replace: `"default": "${schoolProjectId}"`
    }
  ];
  
  // Update each file
  filesToUpdate.forEach(({ file, find, replace }) => {
    const filePath = path.join(projectRoot, file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${file}`);
      return;
    }
    
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      
      if (content.match(find)) {
        content = content.replace(find, replace);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Updated: ${file}`);
      } else {
        console.log(`⚠️  Pattern not found in: ${file}`);
      }
    } catch (error) {
      console.error(`❌ Error updating ${file}:`, error.message);
    }
  });
  
  console.log(`\n🎉 Project configuration complete for ${schoolProjectId}`);
  console.log(`\n📋 Next steps:`);
  console.log(`1. Deploy functions: firebase deploy --only functions`);
  console.log(`2. Test all functionality`);
  console.log(`3. Create initial admin user`);
}

// Get project ID from command line
const schoolProjectId = process.argv[2];

if (!schoolProjectId) {
  console.error('❌ Please provide a school project ID');
  console.error('Usage: node scripts/configure-school-project.js <school-project-id>');
  process.exit(1);
}

updateProjectConfiguration(schoolProjectId);

