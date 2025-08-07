#!/usr/bin/env node

/**
 * Batch School Onboarding Script
 * CSV format: schoolId,name,district,address,phone,principalEmail,adminName,adminEmail,adminPassword
 */

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import csv from 'csv-parser';

const app = initializeApp({ projectId: 'casemanage-jepson-prod' });
const auth = getAuth(app);
const db = getFirestore(app);

const onboardSingleSchool = async (schoolData) => {
  // Create school document
  await db.collection('schools').doc(schoolData.schoolId).set({
    schoolId: schoolData.schoolId,
    name: schoolData.name,
    district: schoolData.district,
    address: schoolData.address,
    phone: schoolData.phone,
    principalEmail: schoolData.principalEmail,
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true
  });

  // Create admin user
  const userRecord = await auth.createUser({
    email: schoolData.adminEmail,
    password: schoolData.adminPassword,
    displayName: schoolData.adminName,
    emailVerified: true
  });

  await auth.setCustomUserClaims(userRecord.uid, {
    role: 'admin',
    schoolId: schoolData.schoolId,
    permissions: ['full_access']
  });

  await db.collection('users').doc(userRecord.uid).set({
    email: schoolData.adminEmail,
    name: schoolData.adminName,
    role: 'admin',
    schoolId: schoolData.schoolId,
    title: 'Administrator',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Setup collections
  await db.collection('schools').doc(schoolData.schoolId).collection('settings').doc('system').set({
    theme: 'default',
    sessionTimeout: 30,
    allowGoogleAuth: true,
    createdAt: new Date()
  });
};

const batchOnboardSchools = async (csvFilePath) => {
  const schools = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => schools.push(row))
      .on('end', async () => {
        console.log(`📊 Found ${schools.length} schools to onboard`);
        
        for (let i = 0; i < schools.length; i++) {
          const school = schools[i];
          console.log(`\n🏫 Onboarding school ${i + 1}/${schools.length}: ${school.name}`);
          
          try {
            await onboardSingleSchool(school);
            console.log(`✅ Successfully onboarded: ${school.name}`);
          } catch (error) {
            console.error(`❌ Failed to onboard ${school.name}:`, error.message);
          }
        }
        
        console.log('\n🎉 Batch onboarding completed!');
        resolve();
      })
      .on('error', reject);
  });
};

const csvFile = process.argv[2];
if (!csvFile) {
  console.error('Usage: node batch-onboard-schools.js <csv-file>');
  console.error('CSV format: schoolId,name,district,address,phone,principalEmail,adminName,adminEmail,adminPassword');
  process.exit(1);
}

batchOnboardSchools(csvFile).catch(console.error);