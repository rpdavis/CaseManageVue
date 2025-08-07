#!/usr/bin/env node

/**
 * Configuration verification script for CaseManageVue-Jepson
 * Run this before deploying to ensure all configurations are correct
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 Verifying Jepson configuration...\n');

// Check Firebase configuration
const firebaseConfigPath = './src/firebase.js';
if (fs.existsSync(firebaseConfigPath)) {
  const firebaseConfig = fs.readFileSync(firebaseConfigPath, 'utf8');
  
  if (firebaseConfig.includes('YOUR_JEPSON_API_KEY_HERE')) {
    console.log('❌ Firebase configuration not updated in src/firebase.js');
    console.log('   Please update the Firebase config values with your Jepson project settings\n');
  } else if (firebaseConfig.includes('casemanagevue-jepson')) {
    console.log('✅ Firebase configuration points to Jepson project');
  } else {
    console.log('⚠️  Firebase configuration may not be correct');
  }
} else {
  console.log('❌ Firebase configuration file not found');
}

// Check .firebaserc
const firebasercPath = './.firebaserc';
if (fs.existsSync(firebasercPath)) {
  const firebaserc = JSON.parse(fs.readFileSync(firebasercPath, 'utf8'));
  
  if (firebaserc.projects?.default === 'casemanagevue-jepson') {
    console.log('✅ .firebaserc points to casemanagevue-jepson project');
  } else {
    console.log('❌ .firebaserc does not point to casemanagevue-jepson project');
  }
} else {
  console.log('❌ .firebaserc file not found');
}

// Check for removed development files
const devFiles = [
  './data/seed',
  './functions/set_custom_claims.js',
  './src/components/testing',
  './src/views/TestingView.vue'
];

let devFilesFound = 0;
devFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`⚠️  Development file still exists: ${file}`);
    devFilesFound++;
  }
});

if (devFilesFound === 0) {
  console.log('✅ Development files successfully removed');
}

// Check package.json
const packagePath = './package.json';
if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  if (packageJson.name === 'CaseManageVue-Jepson') {
    console.log('✅ Package name updated to CaseManageVue-Jepson');
  } else {
    console.log('⚠️  Package name not updated');
  }
  
  if (!packageJson.scripts.emulators) {
    console.log('✅ Emulator scripts removed from package.json');
  } else {
    console.log('⚠️  Emulator scripts still present in package.json');
  }
}

console.log('\n📋 Next Steps:');
console.log('1. Update Firebase config values in src/firebase.js');
console.log('2. Run: firebase login');
console.log('3. Run: npm run deploy');
console.log('4. Verify deployment at: https://casemanagevue-jepson.web.app');

console.log('\n🎉 Configuration verification complete!');