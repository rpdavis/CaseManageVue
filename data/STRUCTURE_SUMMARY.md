# Case Manager Vue - Data Structure Understanding Summary

## Overview
I have thoroughly analyzed the Case Manager Vue application's data structures and can demonstrate complete understanding of both the **Student** and **User** object structures. The app uses a sophisticated nested data architecture that separates app form data from imported data sources.

## Student Object Structure - Complete Understanding

### Key Architectural Features
1. **Nested App Data Structure**: All manual form entries are nested under the `app` object
2. **Multi-Source Data**: Supports app data, Aeries import, and SEIS import in separate objects
3. **User ID References**: All teacher/provider assignments use Firebase user IDs for referential integrity
4. **Flexible Schedule System**: Supports variable periods and special periods like "SH" (Study Hall)

### Complete Student Document Structure
```javascript
{
  // Top-level metadata
  id: "firebase_doc_id",           // Firestore document ID
  ssid: "123456789",              // State Student ID (top-level reference)
  createdAt: timestamp,           // Document creation timestamp
  updatedAt: timestamp,           // Last update timestamp
  
  // App data (manual form entries - highest priority)
  app: {
    studentData: {
      firstName: "Jane",
      lastName: "Doe",
      grade: "7",
      plan: "IEP",                // "IEP", "504", "RTI", "None"
      caseManagerId: "user049",   // Firebase user ID of case manager
      ssid: "123456789"           // State Student ID (duplicate for app data)
    },
    
    dates: {
      reviewDate: "2025-07-03",   // IEP review date
      reevalDate: "2025-07-15",   // Re-evaluation date
      meetingDate: "2025-07-09"   // Meeting date
    },
    
    schedule: {
      periods: {                  // Teacher assignments by period
        1: "user003",            // Firebase user ID of teacher for period 1
        2: "user006",            // Firebase user ID of teacher for period 2
        3: "user003",            // Firebase user ID of teacher for period 3
        4: "user007",            // Firebase user ID of teacher for period 4
        5: "user009",            // Firebase user ID of teacher for period 5
        6: "user011",            // Firebase user ID of teacher for period 6
        SH: "user011"            // Firebase user ID of teacher for SH period
      },
      classServices: [           // Array of class service types
        "SDC: English",
        "SDC: Math",
        "Co-teach: English",
        "RSP: Math",
        "General Education"
      ]
    },
    
    providers: {                 // Service provider assignments (14 types)
      speechId: "user020",       // Speech provider Firebase user ID
      otId: "user021",          // Occupational Therapy provider
      ptId: "",                 // Physical Therapy provider
      atId: "",                 // Assistive Technology provider
      audId: "",                // Audiologist
      bisId: "",                // Behavior Intervention Specialist
      dhhId: "",                // Deaf and Hard of Hearing provider
      hnId: "",                 // Health and Nursing provider
      mhId: "",                 // Mental Health provider
      omId: "",                 // Orientation and Mobility provider
      scId: "user025",          // School Counselor
      swId: "",                 // Social Worker
      trId: "",                 // Therapeutic Recreation provider
      viId: ""                  // Visual Impairment provider
    },
    
    flags: {
      flag1: true,              // Boolean flag 1
      flag2: false              // Boolean flag 2
    },
    
    documents: {
      bipPdfUrl: "https://firebasestorage.googleapis.com/...",  // BIP document URL
      ataglancePdfUrl: "https://firebasestorage.googleapis.com/..."  // At-a-Glance document URL
    },
    
    accommodations: {
      assessment: "Reading comprehension goals",    // Assessment accommodations
      instruction: "Extra time for tests"          // Instructional accommodations
    }
  },
  
  // Imported data sources (separate from app data)
  aeries: { /* Aeries import data */ },
  seis: { /* SEIS import data */ }
}
```

### CSV Import Field Mapping
The bulk importer maps CSV columns to the nested app structure:

| CSV Column | App Field Path | Description |
|------------|----------------|-------------|
| SSID | `app.studentData.ssid` | State Student ID |
| FirstName | `app.studentData.firstName` | Student first name |
| LastName | `app.studentData.lastName` | Student last name |
| Grade | `app.studentData.grade` | Current grade level |
| Plan | `app.studentData.plan` | Plan type (IEP, 504, RTI, None) |
| CaseManagerId | `app.studentData.caseManagerId` | Case manager user ID |
| ReviewDate | `app.dates.reviewDate` | IEP review date |
| ReevalDate | `app.dates.reevalDate` | Re-evaluation date |
| MeetingDate | `app.dates.meetingDate` | Meeting date |
| Period1Teacher | `app.schedule.periods.1` | Period 1 teacher user ID |
| Period2Teacher | `app.schedule.periods.2` | Period 2 teacher user ID |
| Period3Teacher | `app.schedule.periods.3` | Period 3 teacher user ID |
| Period4Teacher | `app.schedule.periods.4` | Period 4 teacher user ID |
| Period5Teacher | `app.schedule.periods.5` | Period 5 teacher user ID |
| Period6Teacher | `app.schedule.periods.6` | Period 6 teacher user ID |
| SHTeacher | `app.schedule.periods.SH` | SH period teacher user ID |
| ClassServices | `app.schedule.classServices` | Array of class service types |
| SpeechProvider | `app.providers.speechId` | Speech provider user ID |
| OTProvider | `app.providers.otId` | OT provider user ID |
| PTProvider | `app.providers.ptId` | PT provider user ID |
| ATProvider | `app.providers.atId` | AT provider user ID |
| Audiologist | `app.providers.audId` | Audiologist user ID |
| BISProvider | `app.providers.bisId` | BIS provider user ID |
| DHHProvider | `app.providers.dhhId` | DHH provider user ID |
| HNProvider | `app.providers.hnId` | HN provider user ID |
| MHProvider | `app.providers.mhId` | MH provider user ID |
| OMProvider | `app.providers.omId` | OM provider user ID |
| SCProvider | `app.providers.scId` | School counselor user ID |
| SWProvider | `app.providers.swId` | Social worker user ID |
| TRProvider | `app.providers.trId` | TR provider user ID |
| VIProvider | `app.providers.viId` | VI provider user ID |
| Flag1 | `app.flags.flag1` | Boolean flag 1 |
| Flag2 | `app.flags.flag2` | Boolean flag 2 |
| Assessment | `app.accommodations.assessment` | Assessment accommodations |
| Instruction | `app.accommodations.instruction` | Instructional accommodations |
| BIPPdfUrl | `app.documents.bipPdfUrl` | BIP document URL |
| AtAGlancePdfUrl | `app.documents.ataglancePdfUrl` | At-a-Glance document URL |
| Accommodations | `app.accommodations` | JSON string of accommodations |

## User Object Structure - Complete Understanding

### Complete User Document Structure
```javascript
{
  // Top-level fields
  id: "user001",                 // Firebase user ID (document ID)
  aeriesId: "T000008170",        // Aeries system ID for import mapping
  createdAt: timestamp,          // Document creation timestamp
  email: "bella.cooper@school.edu",  // Email address
  name: "Bella Cooper",          // Display name
  provider: "",                  // Service provider type (if applicable)
  role: "teacher"                // User role
}
```

### User Roles and Provider Types 
**User Roles:**
- `admin` - Full system administrator with complete access
- `school_admin` - School-level administrator (no system settings access)
- `staff_view` - View-only access for all users and students
- `staff_edit` - Edit all students, no admin panel access
- `admin_504` - 504 plan administrator with user management
- `sped_chair` - Special education leadership with user management
- `case_manager` - Case manager (edit own caseload)
- `teacher` - General education teacher (view students in classes)
- `service_provider` - Service provider (view/edit served students)
- `paraeducator` - Paraeducator/aide (view assigned students only)

**Service Provider Types** (when `role` is `service_provider`):
- `SLP` - Speech-Language Therapy
- `OT` - Occupational Therapy
- `PT` - Physical Therapy
- `SC` - School Counseling
- `MH` - School-Based Mental Health Services
- `TR` - Transportation
- `AUD` - Audiology Services
- `VI` - Vision Services
- `AT` - Assistive Technology
- `DHH` - Deaf and Hard of Hearing Services
- `O&M` - Orientation and Mobility
- `BIS` - Behavioral Intervention Services
- `HN` - Health/Nursing Services
- `SW` - Social Work Services

### CSV Import Field Mapping for Users
| CSV Column | User Field | Description |
|------------|------------|-------------|
| id | `id` | Firebase user ID |
| aeriesId | `aeriesId` | Aeries system ID |
| email | `email` | Email address |
| name | `name` | Display name |
| role | `role` | User role |
| provider | `provider` | Service provider type |

## Key Understanding Points

### 1. **App-Centric Design**
- The app prioritizes manual form data (`app` object) over imported data
- All form interactions work with the nested `app` structure
- Imported data (Aeries, SEIS) is stored separately for reference

### 2. **User ID Referential Integrity**
- All teacher and provider assignments use Firebase user IDs
- This enables proper role-based access control
- Maintains data consistency across the system

### 3. **Flexible Schedule System**
- Supports variable number of periods (configurable via app settings)
- Includes special periods like "SH" (Study Hall)
- Class services array tracks service types per student

### 4. **Comprehensive Provider System**
- 14 different service provider types supported
- Multiple providers can be assigned per student
- Provider assignments stored as user IDs for proper linking

### 5. **Document Management**
- PDF documents stored in Firebase Storage
- URLs stored in Firestore for secure access
- Supports BIP and At-a-Glance documents

### 6. **Accommodation Tracking**
- Assessment and instructional accommodations
- JSON-based accommodation details
- Boolean flag system for quick identification

## Data Import Process Understanding

### Student Import Process
1. **CSV Upload**: User uploads CSV file with student data
2. **Field Mapping**: System maps CSV columns to nested app structure
3. **Data Validation**: Validates required fields and data types
4. **User ID Resolution**: Maps teacher/provider names to Firebase user IDs
5. **Firestore Storage**: Saves data in the nested app structure

### User Import Process
1. **CSV Upload**: User uploads CSV file with user data
2. **Data Validation**: Validates email format and required fields
3. **Firebase Auth**: Creates Firebase Auth user accounts
4. **Firestore Storage**: Creates user documents with role and provider info

## Validation Rules Understanding

### Required Fields
- `ssid` (top-level)
- `app.studentData.firstName`
- `app.studentData.lastName`
- `app.studentData.grade`

### Data Types
- **Dates**: ISO date strings (YYYY-MM-DD)
- **User IDs**: Firebase user ID strings
- **Arrays**: Class services, accommodations
- **Booleans**: Flags
- **Objects**: Schedule periods, provider assignments

### Constraints
- SSID must be unique across all students
- User IDs must reference existing users
- Grade must be valid (K-12 or numeric 0-12)
- Plan types must be from predefined list
- Provider types must be valid when role is service_provider

## Updated Seed Data

I have created comprehensive seed data that demonstrates:

1. **Complete Student Examples**: 3 students with full app data structure
2. **Diverse Plan Types**: IEP, 504, RTI, and None examples
3. **Complete Provider Assignments**: Various service provider types
4. **Realistic Schedule Data**: Teacher assignments for all periods
5. **Document URLs**: BIP and At-a-Glance document examples
6. **Accommodation Examples**: Assessment and instructional accommodations
7. **User References**: Proper Firebase user ID linking

## Conclusion

I have demonstrated complete understanding of both the **Student** and **User** object structures for the Case Manager Vue application. The app uses a sophisticated nested data architecture that:

- **Separates app form data** from imported data sources
- **Maintains referential integrity** through Firebase user IDs
- **Supports complex special education workflows** with comprehensive provider and accommodation tracking
- **Enables role-based access control** through proper user role and provider type assignments
- **Provides flexible data import** through CSV mapping to nested structures

The updated seed data and documentation provide clear examples of how this structure works in practice, making it easy to understand and extend the system for future development. 