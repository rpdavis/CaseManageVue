# Users & Students Seed Data

This directory contains all the active seed data files for users and students in the CaseManageVue application.

## Files

### 📊 **Data Generation**
- `generate_seed_data.js` - Script to generate student seed data with proper Aeries ID references
- `seed accommodations.md` - List of accommodations used in seed data generation

### 👥 **User Data**
- `bulk_users.csv` - User seed data for bulk import (87 users with updated roles)
  - Includes teachers, service providers, admins, case managers, paraeducators
  - Contains Speech Language Pathologists (SLP): Rachel Smith, David Johnson
  - Uses Aeries IDs for all users

### 🎓 **Student Data**
- `generated_students_seed.csv` - CSV format for bulk student importer (110 students)
- `firestore_seed_data.json` - JSON format for direct Firestore import (110 students)

## Generated Student Data Features
- **110 total students**: 77 IEP (70%) + 33 504 (30%)
- **Speech Services**: 37 students assigned to SLP providers
- **Complete Service Coverage**: All 14 service provider types included
- **Rich Accommodations**: Multiple accommodations per student, semicolon-separated
- **Real Aeries IDs**: All teacher/provider references use actual IDs from bulk_users.csv
- **Proper Structure**: Matches StudentForm.vue saving format with nested app.* structure

## Usage

### Generate New Seed Data
```bash
cd seed/users_students
node generate_seed_data.js
```

### Import Users
Use `bulk_users.csv` with the bulk user importer in the admin panel.

### Import Students
Use `generated_students_seed.csv` with the bulk student importer, or import `firestore_seed_data.json` directly to Firestore.

## Data Structure
All student data uses the app's internal structure with nested `app.*` fields:
- `app.studentData.*` - Basic student information
- `app.dates.*` - Important dates (review, reeval, meeting)
- `app.schedule.*` - Class schedule and services
- `app.providers.*` - Service provider assignments
- `app.accommodations.*` - Instruction and assessment accommodations
- `app.flags.*` - Student flags and indicators

## Dependencies
The generation script automatically reads Aeries IDs from `bulk_users.csv` to ensure data consistency between users and students.