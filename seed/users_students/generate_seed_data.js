import fs from 'fs';

// Read Aeries IDs from bulk_users.csv to ensure consistency
function loadAeriesIdsFromCSV() {
  try {
    const csvContent = fs.readFileSync('./bulk_users.csv', 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const aeriesIds = [];
    
    // Skip header row, extract aeriesId column (last column)
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length >= 5 && parts[4].trim()) {
        aeriesIds.push(parts[4].trim());
      }
    }
    
    console.log(`📊 Loaded ${aeriesIds.length} Aeries IDs from bulk_users.csv`);
    return aeriesIds;
  } catch (error) {
    console.warn('⚠️ Could not load Aeries IDs from bulk_users.csv, using hardcoded values');
    return [
      'T000008170', 'T000002783', 'T000008708', 'T000003124', 'T000005528', 'T000005043', 'T000007213', 'T000009047',
      'T000005663', 'T000003145', 'T000001259', 'T000008402', 'T000004238', 'T000003232', 'T000004834', 'T000003782'
    ];
  }
}

// Helper function to generate random dates
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function to format date as YYYY-MM-DD
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Helper function to generate realistic accommodation combinations
function generateAccommodationList(accommodations, minCount, maxCount) {
  const count = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
  const shuffled = [...accommodations].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, count);
  return selected.join('; ');
}

// Generate student seed data matching the form structure
function generateStudentSeedData() {
  const students = [];
  const aeriesIds = loadAeriesIdsFromCSV();
  
  // Realistic student names for variety
  const firstNames = [
    'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'William',
    'Mia', 'James', 'Charlotte', 'Benjamin', 'Amelia', 'Lucas', 'Harper', 'Henry', 'Evelyn', 'Alexander',
    'Abigail', 'Michael', 'Emily', 'Elijah', 'Elizabeth', 'Daniel', 'Mila', 'Matthew', 'Ella', 'Jackson',
    'Madison', 'David', 'Scarlett', 'Sebastian', 'Victoria', 'Joseph', 'Sofia', 'Samuel', 'Grace', 'Carter',
    'Chloe', 'Owen', 'Camila', 'Wyatt', 'Penelope', 'John', 'Riley', 'Jack', 'Layla', 'Luke',
    'Zoey', 'Jayden', 'Nora', 'Dylan', 'Lily', 'Grayson', 'Eleanor', 'Levi', 'Hannah', 'Isaac',
    'Lillian', 'Gabriel', 'Addison', 'Julian', 'Aubrey', 'Mateo', 'Ellie', 'Anthony', 'Stella', 'Jaxon'
  ];
  
  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
    'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
    'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
    'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'
  ];
  const grades = ['6', '7', '8', '9', '10', '11', '12'];
  
  const classServices = [
    ['SDC: English', 'SDC: Math'],
    ['RSP: Reading', 'RSP: Math'],
    ['Co-teach: English', 'RSP: English'],
    ['SDC: History', 'SDC: Science', 'Co-teach: English'],
    ['Speech Therapy', 'OT Services'],
    ['RSP: English', 'RSP: Math', 'RSP: Science']
  ];
  
  // Assessment accommodation bank
  const assessmentAccommodations = [
    'Extended time for assessments (time and a half)',
    'Allow for test re-takes if the score is below average (less than 2 on a 4-point scale, less than 70%)',
    'Separate setting for assessments (RSP room or other smaller setting)',
    'Access to notes',
    'Directions to be read, clarified, or simplified as needed',
    'Access to notes during tests when necessary',
    'Simplify instructions or allow verbal clarification of math assessment items',
    'Option to clarify or rephrase directions for tests',
    'Shortened Assessments: (when appropriate and does not compromise the integrity of the learning objectives)',
    'Use of calculator to check for computation accuracy when calculations are not the primary focus of the assessment'
  ];
  
  // Instructional accommodation bank
  const instructionAccommodations = [
    'Use of multiplication chart and calculator (when not assessing computational skills)',
    'Access to multiplication chart and number line as needed',
    'Use of calculator to check for computation accuracy when calculations are not the primary focus of the assessment',
    'Preferential seating (near the point of instructions, near a positive peer, or an area with the least distractions)',
    'Simplified, repeated, or rephrased directions as needed',
    'Access to notes or cloze notes',
    'Shortened assignments: when appropriate and when they do not compromise the integrity of the learning objectives, ensuring the student can demonstrate understanding as determined by the teacher',
    'Use of graphic organizer checklist for organizing larger writing assignments',
    'Access to word bank as needed',
    'Access to audiobooks or other audio supports (teacher read aloud) for longer reading materials, as needed',
    'Extended time on assignments (up to 2 weeks, not to exceed the grading period)',
    'Check for understanding and work completion',
    'Divide larger projects or assignments into manageable parts with incremental deadlines',
    'Chunk instructions/visual checklists as needed',
    'Allow for short breaks',
    'Allow for breaks when needed',
    'Allow use of sensory tools (e.g., fidgets, stress balls) if they help regulate focus'
  ];

  for (let i = 1; i <= 110; i++) {
    const ssid = String(1000000000 + i).padStart(10, '0');
    
    // Use different indices to avoid same first/last name combinations
    const firstName = firstNames[(i * 7) % firstNames.length];
    const lastName = lastNames[(i * 11) % lastNames.length];
    const grade = grades[i % grades.length];
    
    // 70% IEP (77 students), 30% 504 (33 students) out of 110 total
    const plan = i <= 77 ? 'IEP' : '504';
    
    // Generate random dates
    const baseDate = new Date('2025-01-01');
    const endDate = new Date('2025-12-31');
    const reviewDate = formatDate(randomDate(baseDate, endDate));
    const reevalDate = formatDate(randomDate(baseDate, endDate));
    const meetingDate = formatDate(randomDate(baseDate, endDate));
    

    
    // Use loaded Aeries IDs from CSV - filter for teachers only
    const teacherAeriesIds = aeriesIds.filter(id => id.startsWith('T000'));
    const maxTeachers = teacherAeriesIds.length;
    
    const teacherIds = {
      1: teacherAeriesIds[((i * 2) % maxTeachers)],
      2: teacherAeriesIds[((i * 3) % maxTeachers)],
      3: teacherAeriesIds[((i * 5) % maxTeachers)],
      4: teacherAeriesIds[((i * 7) % maxTeachers)],
      5: teacherAeriesIds[((i * 11) % maxTeachers)],
      6: teacherAeriesIds[((i * 13) % maxTeachers)],
      7: teacherAeriesIds[((i * 17) % maxTeachers)]
    };
    
    // Case manager from available teachers
    const caseManagerId = teacherAeriesIds[(i * 19) % maxTeachers];
    
    // Service providers with Aeries IDs from bulk_users.csv:
    const providers = {
      speechId: i % 4 === 0 ? (i % 2 === 0 ? "T000009123" : "T000005432") : "", // Rachel Smith or David Johnson (SLP)
      otId: i % 3 === 0 ? "T000003394" : "", // Victoria Kim (OT)
      mhId: i % 5 === 0 ? (i % 2 === 0 ? "T000004298" : "T000008413") : "", // Alexander Garcia or Alexander Young (MH)
      ptId: i % 7 === 0 ? "T000003456" : "", // James Taylor (PT)
      scId: i % 8 === 0 ? "T000001339" : "", // Skylar Anderson (SC)
      trId: i % 6 === 0 ? "T000005827" : "", // Theodore Garcia (TR)
      audId: i % 9 === 0 ? (i % 2 === 0 ? "T000002072" : "T000003243") : "", // Emily Cook or Jayden Gonzalez (AUD)
      viId: i % 10 === 0 ? "T000007890" : "", // Patricia Anderson (VI)
      atId: i % 11 === 0 ? (i % 2 === 0 ? "T000001801" : "T000003401") : "", // Brooklyn Bailey or Mason Hernandez (AT)
      dhhId: i % 12 === 0 ? "T000002053" : "", // Jack Roberts (DHH)
      omId: i % 13 === 0 ? "T000002345" : "", // Thomas Thomas (O&M)
      bisId: i % 14 === 0 ? "T000006789" : "", // Michelle Jackson (BIS)
      hnId: i % 15 === 0 ? "T000004567" : "", // Daniel White (HN)
      swId: i % 16 === 0 ? "T000008901" : "" // Amanda Harris (SW)
    };

    const student = {
      ssid: ssid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      app: {
        studentData: {
          firstName: firstName,
          lastName: lastName,
          grade: grade,
          plan: plan,
          caseManagerId: caseManagerId,
          ssid: ssid
        },
        dates: {
          meetingDate: meetingDate,
          reevalDate: reevalDate,
          reviewDate: reviewDate
        },
        schedule: {
          periods: teacherIds,
          classServices: classServices[i % classServices.length]
        },
        providers: providers,
        flags: {
          flag1: i % 3 === 0,
          flag2: i % 4 === 0
        },
        documents: {
          ataglancePdfUrl: null,
          bipPdfUrl: null
        },
        accommodations: {
          instruction: generateAccommodationList(instructionAccommodations, 2, 4),
          assessment: generateAccommodationList(assessmentAccommodations, 2, 3)
        }
      },
      aeries: {},
      seis: {}
    };

    students.push(student);
  }

  return { students };
}

// Generate CSV data for bulk importer
function generateStudentCSV(students) {
  const csvHeader = 'ssid,firstName,lastName,grade,plan,caseManagerId,reviewDate,reevalDate,meetingDate,period1Teacher,period2Teacher,period3Teacher,period4Teacher,period5Teacher,period6Teacher,shTeacher,classServices,speechProvider,otProvider,ptProvider,atProvider,audiologist,bisProvider,dhhProvider,hnProvider,mhProvider,omProvider,scProvider,swProvider,trProvider,viProvider,flag1,flag2,instruction,assessment';
  
  const csvRows = students.map(student => {
    const app = student.app;
    return [
      app.studentData.ssid,
      app.studentData.firstName,
      app.studentData.lastName,
      app.studentData.grade,
      app.studentData.plan,
      app.studentData.caseManagerId,
      app.dates.reviewDate,
      app.dates.reevalDate,
      app.dates.meetingDate,
      app.schedule.periods[1] || '',
      app.schedule.periods[2] || '',
      app.schedule.periods[3] || '',
      app.schedule.periods[4] || '',
      app.schedule.periods[5] || '',
      app.schedule.periods[6] || '',
      app.schedule.periods[7] || '',
      `"${Array.isArray(app.schedule.classServices) ? app.schedule.classServices.join(',') : app.schedule.classServices}"`,
      app.providers.speechId || '',
      app.providers.otId || '',
      app.providers.ptId || '',
      app.providers.atId || '',
      app.providers.audId || '',
      app.providers.bisId || '',
      app.providers.dhhId || '',
      app.providers.hnId || '',
      app.providers.mhId || '',
      app.providers.omId || '',
      app.providers.scId || '',
      app.providers.swId || '',
      app.providers.trId || '',
      app.providers.viId || '',
      app.flags.flag1,
      app.flags.flag2,
      `"${app.accommodations.instruction}"`,
      `"${app.accommodations.assessment}"`
    ].join(',');
  });
  
  return [csvHeader, ...csvRows].join('\n');
}

// Generate and save the seed data
const seedData = generateStudentSeedData();

// Save JSON format
fs.writeFileSync('firestore_seed_data.json', JSON.stringify(seedData, null, 2));

// Save CSV format for bulk importer
const csvData = generateStudentCSV(seedData.students);
fs.writeFileSync('./generated_students_seed.csv', csvData);

console.log('✅ Seed data generated successfully!');
console.log(`📊 Generated ${seedData.students.length} students`);
console.log('📁 JSON saved to: firestore_seed_data.json');
console.log('📁 CSV saved to: generated_students_seed.csv');
console.log('');
console.log('🔧 Structure matches:');
console.log('   - StudentForm.vue saving format');
console.log('   - StudentBulkImporter expected format');
console.log('   - Complete app.* nested structure');
console.log('   - All provider fields included');
console.log('   - Proper accommodations.instruction/assessment format');
console.log('   - Uses actual Aeries IDs from bulk_users.csv');
console.log('');
console.log('📂 All files are now in seed/users_students/ directory'); 