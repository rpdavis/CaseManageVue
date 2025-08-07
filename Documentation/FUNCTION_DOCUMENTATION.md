# Firebase Functions Documentation
## Complete Guide to Each Function and App Integration

---

## 🔐 **USER MANAGEMENT FUNCTIONS**

### **`addUserWithRole`** - ✅ **ACTIVELY USED**
**Purpose**: Creates new users with specific roles in the system
**Trigger**: Admin calls from User Management interface
**App Integration**: 
- **Frontend**: `src/views/AdminView.vue` - User creation form
- **Composables**: `src/composables/useUsers.js` - User management logic
- **Store**: `src/store/authStore.js` - User state management
**Functionality**: 
- Validates email format and role permissions
- Creates Firebase Auth user with custom claims
- Returns user UID for frontend confirmation
**Security**: Admin-only access, input sanitization, threat detection

### **`deleteUserAuth`** - ✅ **ACTIVELY USED**
**Purpose**: Permanently deletes user accounts from Firebase Auth
**Trigger**: Admin calls from User Management interface
**App Integration**:
- **Frontend**: `src/components/UserTable.vue` - Delete user buttons
- **Composables**: `src/composables/useUsers.js` - User deletion logic
**Functionality**: 
- Removes user from Firebase Authentication
- Cleans up associated Firestore data
- Returns success confirmation
**Security**: Admin-only access, proper error handling

### **`deleteAllUsers`** - ⚠️ **ADMIN UTILITY (Use with caution)**
**Purpose**: Bulk deletion of all users (emergency/admin utility)
**Trigger**: Admin calls from admin interface
**App Integration**: 
- **Frontend**: Admin dashboard (emergency function)
- **Composables**: `src/composables/useUsers.js` - Bulk operations
**Functionality**: 
- Deletes all users from Firebase Auth
- Returns count of deleted users
**Security**: Admin-only access, dangerous operation

### **`migrateUserRoles`** - ✅ **ACTIVELY USED**
**Purpose**: Migrates legacy role names to new standardized roles
**Trigger**: Admin calls during system updates
**App Integration**:
- **Frontend**: Admin dashboard migration tools
- **Composables**: `src/composables/useUsers.js` - Role migration
**Functionality**: 
- Maps old roles (administrator → admin, administrator_504_CM → admin_504)
- Updates custom claims for all users
- Returns migration results
**Security**: Admin-only access, preserves user data

---

## 🔄 **BACKGROUND TRIGGER FUNCTIONS**

### **`syncUserClaims`** - ✅ **CRITICAL - AUTOMATIC**
**Purpose**: Automatically syncs user role claims when user documents change
**Trigger**: Firestore document changes in `users/{uid}` collection
**App Integration**:
- **Database**: `users` collection in Firestore
- **Frontend**: All user-related components automatically benefit
- **Security**: Ensures role consistency across the app
**Functionality**: 
- Monitors user document changes
- Updates Firebase Auth custom claims automatically
- Handles user deletion by removing claims
**Security**: Automatic background process, no manual intervention needed

### **`cleanupDeletedUser`** - ✅ **CRITICAL - AUTOMATIC**
**Purpose**: Cleans up user data when user documents are deleted
**Trigger**: Firestore document deletion in `users/{uid}` collection
**App Integration**:
- **Database**: `users` collection cleanup
- **Frontend**: Automatic data consistency
**Functionality**: 
- Removes user data from related collections
- Ensures data integrity after user deletion
- Prevents orphaned data
**Security**: Automatic background process

### **`updateStudentStaffIds`** - ✅ **CRITICAL - CO-TEACHING SYSTEM**
**Purpose**: Automatically generates and updates the staff ID array for student assignments, handling co-teaching relationships
**Trigger**: Firestore document changes in `students/{studentId}` collection
**App Integration**:
- **Frontend**: `src/views/AdminStudents.vue` - Student management
- **Composables**: `src/composables/useStudents.js` - Student data
- **Database**: `students` collection with staffIds array
**Functionality**: 
- **CRITICAL**: Generates and maintains the `staffIds` array that tracks which users are connected to each student
- **Co-Teaching Solution**: Handles co-teaching assignments by creating nested arrays in the schedule
- **Workaround Implementation**: Includes co-teachers as assigned to the student through this array system
- **Staff Tracking**: The app uses this array to determine which staff members have access to student data
- **Automatic Updates**: Monitors student document changes and updates staff assignments automatically
- **Data Consistency**: Ensures the staff ID array always reflects current assignments
**Security**: Automatic background process, critical for role-based access control

### **`syncParaeducatorStudentAssignments`** - ✅ **ACTIVELY USED**
**Purpose**: Syncs paraeducator-student assignments when student data changes
**Trigger**: Firestore document changes in `students/{studentId}` collection
**App Integration**:
- **Frontend**: `src/views/AdminAideAssignment.vue` - Aide assignments
- **Composables**: `src/composables/useAideAssignment.js` - Assignment logic
- **Database**: `paraeducatorAssignments` collection
**Functionality**: 
- Creates assignment records in separate collection
- Maintains paraeducator-student relationships
- Enables efficient querying of assignments
**Security**: Automatic background process

### **`rebuildParaeducatorStudentIds`** - ✅ **ACTIVELY USED**
**Purpose**: Rebuilds paraeducator student ID references when assignments change
**Trigger**: Firestore document changes in `students/{studentId}` collection
**App Integration**:
- **Frontend**: `src/views/AdminAideAssignment.vue` - Assignment display
- **Composables**: `src/composables/useAideAssignment.js` - Assignment data
- **Database**: `students` collection updates
**Functionality**: 
- Updates student documents with paraeducator IDs
- Maintains bidirectional relationships
- Enables efficient student-paraeducator queries
**Security**: Automatic background process

---

## 📁 **FILE SECURITY FUNCTIONS**

### **`removeDownloadTokens`** - ✅ **CRITICAL - FERPA COMPLIANCE**
**Purpose**: Removes public download tokens from student files for security
**Trigger**: Manual admin calls or automatic triggers
**App Integration**:
- **Frontend**: `src/components/students/form/StudentDocuments.vue` - File uploads
- **Composables**: `src/composables/useStorage.js` - File management
- **Security**: Prevents public file access
**Functionality**: 
- Removes `firebaseStorageDownloadTokens` from file metadata
- Prevents unauthorized file access
- Ensures FERPA compliance
**Security**: Critical security function, prevents data breaches

### **`removeDownloadTokensOnFinalize`** - ✅ **CRITICAL - AUTOMATIC**
**Purpose**: Automatically removes download tokens when files are uploaded
**Trigger**: Firebase Storage file upload completion
**App Integration**:
- **Frontend**: `src/components/students/form/StudentDocuments.vue` - File uploads
- **Storage**: Firebase Storage bucket
- **Security**: Automatic FERPA compliance
**Functionality**: 
- Triggers on file upload completion
- Only processes student files (`students/` prefix)
- Automatically removes public access tokens
**Security**: Automatic security enforcement

### **`removeDownloadTokensOnMetadata`** - ✅ **CRITICAL - AUTOMATIC**
**Purpose**: Removes download tokens when file metadata is updated
**Trigger**: Firebase Storage metadata updates
**App Integration**:
- **Frontend**: File management operations
- **Storage**: Firebase Storage bucket
- **Security**: Comprehensive token removal
**Functionality**: 
- Catches token additions through metadata updates
- Only processes student files
- Ensures no public access tokens remain
**Security**: Automatic security enforcement

---

## 📄 **FILE ACCESS FUNCTIONS**

### **`getStudentFileUrl`** - ✅ **ACTIVELY USED**
**Purpose**: Generates secure, time-limited URLs for student file access
**Trigger**: Client calls when users need to view files
**App Integration**:
- **Frontend**: `src/components/students/form/StudentDocuments.vue` - File viewing
- **Composables**: `src/composables/useStorage.js` - File access logic
- **Security**: Secure file access with expiration
**Functionality**: 
- Creates signed URLs with 15-minute expiration
- Validates user authentication
- Prevents direct file access
**Security**: Authentication required, time-limited access

### **`downloadStudentFile`** - ✅ **ACTIVELY USED**
**Purpose**: HTTP endpoint for secure file downloads
**Trigger**: HTTP requests to function URL
**App Integration**:
- **Frontend**: File download links
- **Security**: HTTP-based file access
**Functionality**: 
- HTTP endpoint for file downloads
- 5-minute signed URL expiration
- Returns file metadata and download URL
**Security**: HTTP endpoint with query parameter validation

---

## 🏫 **SCHOOL MANAGEMENT FUNCTIONS**

### **`getOrCreateSchool`** - ✅ **ACTIVELY USED**
**Purpose**: Creates or retrieves school records in the system
**Trigger**: Admin calls during school onboarding
**App Integration**:
- **Frontend**: School onboarding process
- **Composables**: `src/composables/useSchools.js` - School management
- **Database**: `schools` collection
**Functionality**: 
- Creates new school records if they don't exist
- Returns existing school data
- Maintains school hierarchy
**Security**: Admin access required

### **`addSchoolAdmin`** - ✅ **ACTIVELY USED**
**Purpose**: Assigns admin roles to users for specific schools
**Trigger**: Admin calls during school setup
**App Integration**:
- **Frontend**: School admin assignment interface
- **Composables**: `src/composables/useSchools.js` - School admin logic
- **Database**: `schoolAdmins` collection
**Functionality**: 
- Creates school-admin relationships
- Enables school-specific permissions
- Maintains admin hierarchy
**Security**: Admin access required

### **`getSchoolTemplates`** - ✅ **ACTIVELY USED**
**Purpose**: Retrieves feedback form templates for schools
**Trigger**: Admin calls when setting up feedback systems
**App Integration**:
- **Frontend**: Teacher feedback setup
- **Composables**: `src/composables/useTeacherFeedback.js` - Template management
- **Database**: `schoolTemplates` collection
**Functionality**: 
- Returns available templates for schools
- Enables template customization
- Supports school-specific feedback forms
**Security**: Admin access required

### **`createSchoolTemplate`** - ✅ **ACTIVELY USED**
**Purpose**: Creates custom feedback templates for schools
**Trigger**: Admin calls during feedback system setup
**App Integration**:
- **Frontend**: Template creation interface
- **Composables**: `src/composables/useTeacherFeedback.js` - Template creation
- **Database**: `schoolTemplates` collection
**Functionality**: 
- Creates new feedback templates
- Associates templates with schools
- Enables custom feedback forms
**Security**: Admin access required

### **`getUserSchool`** - ✅ **ACTIVELY USED**
**Purpose**: Retrieves the school associated with a user
**Trigger**: Client calls for school-specific data
**App Integration**:
- **Frontend**: School-specific views and data
- **Composables**: `src/composables/useSchools.js` - School data
- **Database**: `users` and `schools` collections
**Functionality**: 
- Returns user's school information
- Enables school-specific functionality
- Supports multi-school deployments
**Security**: Authenticated user access

---

## 📊 **TEACHER FEEDBACK FUNCTIONS**

### **`createFeedbackFormSheet`** - ✅ **ACTIVELY USED**
**Purpose**: Creates Google Sheets for teacher feedback collection
**Trigger**: Admin calls when setting up feedback systems
**App Integration**:
- **Frontend**: `src/views/AdminTeacherFeedback.vue` - Feedback setup
- **Composables**: `src/composables/useTeacherFeedback.js` - Feedback logic
- **Google APIs**: Sheets and Drive integration
**Functionality**: 
- Creates Google Sheets for feedback collection
- Sets up form responses tracking
- Enables automated feedback processing
**Security**: Admin access required, Google API integration

### **`createFeedbackFormSheetWithUserAuth`** - ✅ **ACTIVELY USED**
**Purpose**: Creates feedback sheets with user authentication
**Trigger**: Admin calls with user-specific authentication
**App Integration**:
- **Frontend**: `src/views/AdminTeacherFeedback.vue` - Auth-enabled setup
- **Composables**: `src/composables/useTeacherFeedback.js` - Auth logic
- **Google APIs**: Sheets with user authentication
**Functionality**: 
- Creates sheets with user's Google account
- Enables user-specific permissions
- Supports personalized feedback systems
**Security**: Admin access with user authentication

### **`checkServiceAccountStorage`** - ✅ **ACTIVELY USED**
**Purpose**: Validates Google service account configuration
**Trigger**: Admin calls during system setup
**App Integration**:
- **Frontend**: Admin dashboard configuration checks
- **Composables**: `src/composables/useTeacherFeedback.js` - Service validation
- **Google APIs**: Service account verification
**Functionality**: 
- Validates service account permissions
- Checks Google API access
- Ensures proper configuration
**Security**: Admin access required

### **`getStudentFeedback`** - ✅ **ACTIVELY USED**
**Purpose**: Retrieves feedback responses for specific students
**Trigger**: Client calls when viewing student feedback
**App Integration**:
- **Frontend**: Student feedback viewing interface
- **Composables**: `src/composables/useTeacherFeedback.js` - Feedback retrieval
- **Database**: `feedbackResponses` collection
**Functionality**: 
- Returns feedback responses for students
- Orders by sync timestamp
- Enables feedback review
**Security**: Authenticated user access

---

## 🔗 **API INTEGRATION FUNCTIONS**

### **`getAeriesToken`** - ✅ **ACTIVELY USED**
**Purpose**: Gets authentication tokens for Aeries student information system
**Trigger**: Admin calls for data integration
**App Integration**:
- **Frontend**: `src/views/AdminAeriesIntegration.vue` - API setup
- **Composables**: `src/composables/useAeriesAPI.js` - API integration
- **External**: Aeries API integration
**Functionality**: 
- Authenticates with Aeries API
- Returns access tokens for API calls
- Enables student data synchronization
**Security**: Admin access required, secure credential handling

---

## 🛠️ **UTILITY FUNCTIONS**

### **`healthCheck`** - ✅ **ACTIVELY USED**
**Purpose**: Monitors system health and function availability
**Trigger**: Client calls for system monitoring
**App Integration**:
- **Frontend**: Admin dashboard health monitoring
- **Composables**: `src/composables/useSystemHealth.js` - Health checks
- **Monitoring**: System status tracking
**Functionality**: 
- Returns system status and timestamp
- Monitors function availability
- Enables system monitoring
**Security**: Public access for monitoring

---

## 🗂️ **SHARED DRIVE FUNCTIONS**

### **`setupSharedDrive`** - ✅ **ACTIVELY USED**
**Purpose**: Initializes Google Shared Drives for school data
**Trigger**: Admin calls during school setup
**App Integration**:
- **Frontend**: School setup interface
- **Composables**: `src/composables/useSharedDrive.js` - Drive management
- **Google APIs**: Drive API integration
**Functionality**: 
- Creates shared drives for schools
- Sets up proper permissions
- Enables collaborative file management
**Security**: Admin access required

### **`createSharedDrive`** - ✅ **ACTIVELY USED**
**Purpose**: Creates new Google Shared Drives
**Trigger**: Admin calls for drive creation
**App Integration**:
- **Frontend**: Drive management interface
- **Composables**: `src/composables/useSharedDrive.js` - Drive creation
- **Google APIs**: Drive API
**Functionality**: 
- Creates new shared drives
- Configures drive settings
- Returns drive information
**Security**: Admin access required

### **`updateSharedDriveId`** - ✅ **ACTIVELY USED**
**Purpose**: Updates shared drive IDs in school records
**Trigger**: Admin calls when drive IDs change
**App Integration**:
- **Frontend**: Drive management interface
- **Composables**: `src/composables/useSharedDrive.js` - Drive updates
- **Database**: `schools` collection
**Functionality**: 
- Updates drive IDs in school records
- Maintains drive-school associations
- Enables drive tracking
**Security**: Admin access required

### **`testSharedDriveAccess`** - ✅ **ACTIVELY USED**
**Purpose**: Tests access permissions for shared drives
**Trigger**: Admin calls for drive testing
**App Integration**:
- **Frontend**: Drive testing interface
- **Composables**: `src/composables/useSharedDrive.js` - Access testing
- **Google APIs**: Drive API testing
**Functionality**: 
- Tests drive access permissions
- Validates drive configuration
- Returns access status
**Security**: Admin access required

### **`debugSharedDriveAccess`** - ✅ **ACTIVELY USED**
**Purpose**: Debugs shared drive access issues
**Trigger**: Admin calls for troubleshooting
**App Integration**:
- **Frontend**: Drive debugging interface
- **Composables**: `src/composables/useSharedDrive.js` - Debug logic
- **Google APIs**: Drive API debugging
**Functionality**: 
- Provides detailed drive access information
- Helps troubleshoot permission issues
- Returns debug information
**Security**: Admin access required

---

## 🧪 **TESTING FUNCTIONS**

### **`testSchools`** - ⚠️ **TESTING ONLY**
**Purpose**: Tests school data and configuration
**Trigger**: Admin calls for testing
**App Integration**:
- **Frontend**: Testing interface
- **Database**: School data testing
**Functionality**: 
- Tests school data integrity
- Validates school configuration
- Returns test results
**Security**: Admin access required

### **`testServiceAccountStorage`** - ⚠️ **TESTING ONLY**
**Purpose**: Tests Google service account storage configuration
**Trigger**: Admin calls for testing
**App Integration**:
- **Frontend**: Service account testing
- **Google APIs**: Service account testing
**Functionality**: 
- Tests service account configuration
- Validates API access
- Returns test results
**Security**: Admin access required

---

## 📋 **FUNCTION STATUS SUMMARY**

### **✅ ACTIVELY USED (Production Functions)**
- User management functions
- File security functions
- School management functions
- Teacher feedback functions
- API integration functions
- Shared drive functions
- Background trigger functions

### **⚠️ TESTING ONLY (Development Functions)**
- `testSchools`
- `testServiceAccountStorage`

### **🚨 ADMIN UTILITIES (Use with caution)**
- `deleteAllUsers` - Dangerous bulk operation
- `migrateUserRoles` - System migration utility

### **🔄 AUTOMATIC BACKGROUND FUNCTIONS**
- `syncUserClaims` - Critical for user management
- `cleanupDeletedUser` - Critical for data integrity
- `updateStudentStaffIds` - **CRITICAL for co-teaching system and staff tracking**
- `syncParaeducatorStudentAssignments` - Critical for assignments
- `rebuildParaeducatorStudentIds` - Critical for student data
- `removeDownloadTokensOnFinalize` - Critical for FERPA compliance
- `removeDownloadTokensOnMetadata` - Critical for FERPA compliance

---

## 🔒 **SECURITY CLASSIFICATION**

### **CRITICAL SECURITY FUNCTIONS**
- `removeDownloadTokens*` - FERPA compliance
- `getStudentFileUrl` - Secure file access
- `downloadStudentFile` - Secure file access

### **ADMIN-ONLY FUNCTIONS**
- All user management functions
- All school management functions
- All shared drive functions
- All testing functions

### **AUTHENTICATED USER FUNCTIONS**
- `getStudentFeedback` - User feedback access
- `getUserSchool` - User school data

### **PUBLIC FUNCTIONS**
- `healthCheck` - System monitoring

---

**Note**: This documentation reflects the current state of the Firebase functions. All functions are properly integrated with the Vue.js frontend and maintain security best practices for FERPA compliance.
