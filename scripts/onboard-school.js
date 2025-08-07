#!/usr/bin/env node

/**
 * School Onboarding Script for CaseManageVue - Jepson Production
 */

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import readline from 'readline';

const app = initializeApp({ projectId: 'casemanage-jepson-prod' });
const auth = getAuth(app);
const db = getFirestore(app);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

const createAdminUser = async (userInfo, schoolId) => {
  const userRecord = await auth.createUser({
    email: userInfo.email,
    password: userInfo.password,
    displayName: userInfo.name,
    emailVerified: true
  });

  await auth.setCustomUserClaims(userRecord.uid, {
    role: 'admin',
    schoolId: schoolId,
    permissions: ['full_access']
  });

  await db.collection('users').doc(userRecord.uid).set({
    email: userInfo.email,
    name: userInfo.name,
    role: 'admin',
    schoolId: schoolId,
    title: userInfo.title || 'Administrator',
    phone: userInfo.phone || '',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  console.log(`✅ Created admin user: ${userInfo.email}`);
  return userRecord.uid;
};

const onboardSchool = async () => {
  console.log('🏫 School Onboarding Script for CaseManageVue');
  console.log('='.repeat(50));
  
  try {
    console.log('\n📋 School Information:');
    const schoolInfo = {
      schoolId: await question('School ID (unique identifier): '),
      name: await question('School Name: '),
      district: await question('District Name: '),
      address: await question('School Address: '),
      phone: await question('School Phone: '),
      principalEmail: await question('Principal Email: ')
    };

    console.log('\n👤 Primary Administrator:');
    const adminInfo = {
      name: await question('Admin Full Name: '),
      email: await question('Admin Email: '),
      password: await question('Admin Password (min 6 chars): '),
      title: await question('Admin Title (default: Administrator): ') || 'Administrator',
      phone: await question('Admin Phone (optional): ')
    };

    if (!schoolInfo.schoolId || !schoolInfo.name || !adminInfo.name || !adminInfo.email || !adminInfo.password) {
      throw new Error('Missing required fields');
    }

    if (adminInfo.password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    console.log('\n🚀 Starting school onboarding...');

    // Create school document
    await db.collection('schools').doc(schoolInfo.schoolId).set({
      ...schoolInfo,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    });
    console.log(`✅ School record created: ${schoolInfo.name}`);

    // Create admin user
    await createAdminUser(adminInfo, schoolInfo.schoolId);

    // Setup collections
    await db.collection('schools').doc(schoolInfo.schoolId).collection('settings').doc('system').set({
      theme: 'default',
      sessionTimeout: 30,
      allowGoogleAuth: true,
      createdAt: new Date()
    });

    console.log('\n🎉 School onboarding completed successfully!');
    console.log(`Web App: https://casemanage-jepson-prod.web.app`);

  } catch (error) {
    console.error('\n❌ Onboarding failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
};

onboardSchool();