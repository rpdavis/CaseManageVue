#!/usr/bin/env node

/**
 * Import student seed data into Firebase Emulator
 * This script imports students from firestore_seed_data.json into the running Firestore emulator
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set emulator environment variables
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

initializeApp({ projectId: 'casemangervue' });
const db = getFirestore();

async function importStudentSeedData() {
  try {
    console.log('🌱 Starting student seed data import...');
    
    // Read seed data
    const seedDataPath = path.join(__dirname, '../seed/users_students/firestore_seed_data.json');
    if (!fs.existsSync(seedDataPath)) {
      throw new Error(`Seed data file not found: ${seedDataPath}`);
    }
    
    const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf8'));
    console.log(`📊 Found ${seedData.students?.length || 0} students in seed data`);
    
    // Import students
    if (seedData.students && seedData.students.length > 0) {
      console.log('👨‍🎓 Importing students...');
      
      const batch = db.batch();
      let batchCount = 0;
      const BATCH_SIZE = 500; // Firestore batch limit
      
      for (let i = 0; i < seedData.students.length; i++) {
        const student = seedData.students[i];
        
        // Use SSID as document ID
        const studentRef = db.collection('students').doc(student.ssid);
        batch.set(studentRef, student);
        batchCount++;
        
        // Commit batch when we reach the limit or at the end
        if (batchCount === BATCH_SIZE || i === seedData.students.length - 1) {
          await batch.commit();
          console.log(`✅ Imported batch of ${batchCount} students (${i + 1}/${seedData.students.length})`);
          
          // Create new batch for next iteration
          if (i < seedData.students.length - 1) {
            const newBatch = db.batch();
            batchCount = 0;
          }
        }
      }
      
      console.log(`✅ Successfully imported ${seedData.students.length} students`);
    } else {
      console.log('⚠️ No students found in seed data');
    }
    
    console.log('🎉 Student seed data import complete!');
    
    // Verify import
    const studentsSnapshot = await db.collection('students').limit(5).get();
    console.log(`📊 Verification: Found ${studentsSnapshot.size} students in Firestore (showing first 5)`);
    
    studentsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${data.app?.studentData?.firstName} ${data.app?.studentData?.lastName} (Grade ${data.app?.studentData?.grade}, ${data.app?.studentData?.plan})`);
    });
    
  } catch (error) {
    console.error('❌ Error importing seed data:', error);
    process.exit(1);
  }
}

importStudentSeedData();