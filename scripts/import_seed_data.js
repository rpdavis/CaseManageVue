#!/usr/bin/env node

/**
 * Import seed data into Firebase Emulator
 * This script imports users and students from database_seed_data.json into the running Firestore emulator
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function importSeedData() {
  try {
    console.log('🌱 Starting seed data import...');
    
    // Read seed data
    const seedDataPath = path.join(__dirname, '../data/seed/database_seed_data.json');
    if (!fs.existsSync(seedDataPath)) {
      throw new Error(`Seed data file not found: ${seedDataPath}`);
    }
    
    const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf8'));
    console.log(`📊 Found ${seedData.users?.length || 0} users and ${seedData.students?.length || 0} students in seed data`);
    
    // Import users
    if (seedData.users && seedData.users.length > 0) {
      console.log('👥 Importing users...');
      let userCount = 0;
      
      for (const user of seedData.users) {
        try {
          const response = await fetch(`http://127.0.0.1:8080/v1/projects/casemangervue/databases/(default)/documents/users/${user.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fields: {
                email: { stringValue: user.email },
                name: { stringValue: user.name },
                role: { stringValue: user.role },
                aeriesId: { stringValue: user.aeriesId },
                provider: { stringValue: user.provider || '' },
                createdAt: { timestampValue: user.createdAt }
              }
            })
          });
          
          if (response.ok) {
            userCount++;
            if (userCount % 10 === 0) {
              process.stdout.write(`\r   ✅ Imported ${userCount} users...`);
            }
          } else {
            console.error(`\n❌ Failed to import user ${user.id}:`, await response.text());
          }
        } catch (error) {
          console.error(`\n❌ Error importing user ${user.id}:`, error.message);
        }
      }
      
      console.log(`\n✅ Successfully imported ${userCount} users`);
    }
    
    // Import students
    if (seedData.students && seedData.students.length > 0) {
      console.log('🎓 Importing students...');
      let studentCount = 0;
      
      for (const student of seedData.students) {
        try {
          const response = await fetch(`http://127.0.0.1:8080/v1/projects/casemangervue/databases/(default)/documents/students/${student.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fields: {
                name: { stringValue: student.name },
                grade: { stringValue: student.grade || '' },
                teacher: { stringValue: student.teacher || '' },
                caseManager: { stringValue: student.caseManager || '' },
                aeriesId: { stringValue: student.aeriesId || '' },
                createdAt: { timestampValue: student.createdAt }
              }
            })
          });
          
          if (response.ok) {
            studentCount++;
            if (studentCount % 50 === 0) {
              process.stdout.write(`\r   ✅ Imported ${studentCount} students...`);
            }
          } else {
            console.error(`\n❌ Failed to import student ${student.id}:`, await response.text());
          }
        } catch (error) {
          console.error(`\n❌ Error importing student ${student.id}:`, error.message);
        }
      }
      
      console.log(`\n✅ Successfully imported ${studentCount} students`);
    }
    
    console.log('🎉 Seed data import completed!');
    console.log('\n📋 Available admin users:');
    
    // Show admin users
    const adminUsers = seedData.users?.filter(user => user.role === 'administrator' || user.role === 'admin') || [];
    adminUsers.slice(0, 5).forEach(user => {
      console.log(`   • ${user.name} (${user.email}) - Role: ${user.role}`);
    });
    
    if (adminUsers.length > 5) {
      console.log(`   ... and ${adminUsers.length - 5} more admin users`);
    }
    
  } catch (error) {
    console.error('❌ Failed to import seed data:', error.message);
    process.exit(1);
  }
}

// Check if emulator is running
async function checkEmulator() {
  try {
    const response = await fetch('http://127.0.0.1:8080/');
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log('🔍 Checking if Firestore emulator is running...');
  
  if (!(await checkEmulator())) {
    console.error('❌ Firestore emulator is not running on port 8080');
    console.log('   Please start the emulators with: npm run emulators');
    process.exit(1);
  }
  
  console.log('✅ Firestore emulator is running');
  await importSeedData();
}

main().catch(console.error);