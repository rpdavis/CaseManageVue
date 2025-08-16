# Firestore Rules Documentation
## Complete Guide to Each Rule and Security Model

---

## 🔐 **ROLE-BASED ACCESS CONTROL (RBAC)**

### **`role()` Function** - ✅ **CORE FUNCTION**
**Purpose**: Extracts the user's role from Firebase Auth custom claims
**Usage**: Called by all role-checking functions
**Returns**: String role name (e.g., 'admin', 'teacher', 'sped_chair')
**Security**: Relies on Firebase Auth custom claims set by Cloud Functions

### **`hasValidRole()` Function** - ✅ **VALIDATION**
**Purpose**: Validates that the user has a recognized role in the system
**Roles Supported**: 
- `admin`, `school_admin`, `staff_view`, `staff_edit`, `admin_504`, `sped_chair`
- `case_manager`, `teacher`, `service_provider`, `paraeducator`
**Usage**: Called by all collection rules to ensure valid authentication
**Security**: Prevents access by users with unrecognized roles

---

## 👑 **ADMIN ROLE FUNCTIONS**

### **`isAdmin()` Function** - ✅ **SYSTEM ADMIN**
**Purpose**: Checks if user is the system administrator
**Role**: `admin`
**Access Level**: Full system access
**Usage**: Used for super-admin operations like user deletion

### **`isSchoolAdmin()` Function** - ✅ **SCHOOL ADMIN**
**Purpose**: Checks if user is a school administrator
**Role**: `school_admin`
**Access Level**: School-level administrative access
**Usage**: Used for school management operations

### **`isAdmin504()` Function** - ✅ **504 COORDINATOR**
**Purpose**: Checks if user is a 504 plan coordinator
**Role**: `admin_504`
**Access Level**: 504 plan management access
**Usage**: Used for 504-specific operations

### **`isAnyAdmin()` Function** - ✅ **COMBINED ADMIN**
**Purpose**: Checks if user has any administrative role
**Roles**: `admin`, `school_admin`, `admin_504`, `sped_chair`
**Access Level**: Administrative access to all students
**Usage**: Used for admin panel access and broad student access

### **`isSuperAdmin()` Function** - ✅ **SUPER ADMIN**
**Purpose**: Checks if user has super admin privileges
**Roles**: `admin`, `school_admin`
**Access Level**: Highest level administrative access
**Usage**: Used for dangerous operations like user deletion

---

## 👥 **STAFF ROLE FUNCTIONS**

### **`isStaffView()` Function** - ✅ **STAFF VIEWER**
**Purpose**: Checks if user is a staff viewer (read-only access)
**Role**: `staff_view`
**Access Level**: Read-only access to all students
**Usage**: Used for viewing student data without edit permissions

### **`isStaffEdit()` Function** - ✅ **STAFF EDITOR**
**Purpose**: Checks if user is a staff editor (read/write access)
**Role**: `staff_edit`
**Access Level**: Read/write access to all students
**Usage**: Used for editing student data

### **`isStaffViewOrEdit()` Function** - ✅ **COMBINED STAFF**
**Purpose**: Checks if user has staff view or edit permissions
**Roles**: `staff_view`, `staff_edit`
**Access Level**: Full access to all students (view or edit)
**Usage**: Used for determining broad student access

### **`isCaseManager()` Function** - ✅ **CASE MANAGER**
**Purpose**: Checks if user is a case manager
**Role**: `case_manager`
**Access Level**: Access only to students assigned to them
**Usage**: Used for case manager specific access control

### **`isTeacher()` Function** - ✅ **TEACHER**
**Purpose**: Checks if user is a teacher
**Role**: `teacher`
**Access Level**: Access only to students in their `staffIds`
**Usage**: Used for teacher-specific access control

### **`isServiceProvider()` Function** - ✅ **SERVICE PROVIDER**
**Purpose**: Checks if user is a service provider
**Role**: `service_provider`
**Access Level**: Access only to students in their `staffIds`
**Usage**: Used for service provider access control

### **`isParaeducator()` Function** - ✅ **PARAEDUCATOR**
**Purpose**: Checks if user is a paraeducator
**Role**: `paraeducator`
**Access Level**: Access only to students in their `staffIds` or aideSchedules
**Usage**: Used for paraeducator access control

### **`isStaffRole()` Function** - ✅ **RESTRICTED STAFF**
**Purpose**: Checks if user has a restricted staff role (requires filtering)
**Roles**: `case_manager`, `teacher`, `service_provider`, `paraeducator`
**Access Level**: Access only to assigned students
**Usage**: Used for query validation and access control

---

## 🔓 **ACCESS CONTROL FUNCTIONS**

### **`hasFullReadAccess()` Function** - ✅ **UNRESTRICTED ACCESS**
**Purpose**: Determines if user has unrestricted read access to all students
**Roles**: `admin`, `school_admin`, `admin_504`, `sped_chair`, `staff_view`, `staff_edit`
**Access Level**: Can read all students without filtering
**Usage**: Used for determining if query filtering is required

### **`hasStaffIdsAccess(doc)` Function** - ✅ **STAFF ASSIGNMENT**
**Purpose**: Checks if user is assigned to a student via `staffIds` array
**Parameters**: `doc` - Student document data
**Logic**: Checks if user's UID is in the student's `staffIds` array
**Usage**: Primary access control for staff-student relationships

### **`hasCaseManagerFallback(doc)` Function** - ✅ **CASE MANAGER FALLBACK**
**Purpose**: Fallback access for case managers via direct assignment
**Parameters**: `doc` - Student document data
**Logic**: Checks if user is the student's `caseManagerId`
**Usage**: Handles timing gaps in staff assignment updates

### **`hasParaFallback(studentId)` Function** - ✅ **PARAEDUCATOR FALLBACK**
**Purpose**: Fallback access for paraeducators via aideSchedules
**Parameters**: `studentId` - Student ID to check
**Logic**: Queries aideSchedules collection for student assignment
**Usage**: Provides access when `staffIds` is not yet updated

---

## 📋 **STUDENT ACCESS FUNCTIONS**

### **`canReadStudent(studentId)` Function** - ✅ **READ PERMISSIONS**
**Purpose**: Determines if user can read a specific student document
**Access Levels**:
- **Full Access**: `admin`, `school_admin`, `admin_504`, `staff_view`, `staff_edit`
- **IEP + Assigned**: `sped_chair` - All IEP students OR students in their `staffIds` (including 504 if assigned)
- **Assigned Only**: `case_manager`, `teacher`, `service_provider`, `paraeducator`
**Usage**: Called by student document read rules

### **`canEditStudent(studentId)` Function** - ✅ **EDIT PERMISSIONS**
**Purpose**: Determines if user can edit a specific student document
**Access Levels**:
- **Full Edit**: `admin`, `school_admin`
- **504 Only**: `admin_504` - Only 504 plan students
- **IEP + Assigned**: `sped_chair` - All IEP students OR students in their `staffIds` (including 504 if assigned)
- **Case Manager**: `case_manager` - Only students assigned to them
**Usage**: Called by student document update rules

---

## 🔍 **QUERY VALIDATION FUNCTIONS**

### **`validStudentQuery()` Function** - ✅ **QUERY PERMISSIONS**
**Purpose**: Validates that user queries are properly filtered
**Access Levels**:
- **Unrestricted**: `admin`, `school_admin`, `admin_504`, `sped_chair`, `staff_view`, `staff_edit`
- **Filtered**: `case_manager`, `teacher`, `service_provider`, `paraeducator`
**Usage**: Called by student collection list rules

### **`hasValidStaffQuery()` Function** - ✅ **STAFF QUERY FILTERS**
**Purpose**: Validates that staff queries include proper filters
**Required Filters**:
- `staffIds` array filter for general staff
- `caseManagerId` filter for case managers
**Usage**: Ensures restricted staff use proper query filters

### **`hasStaffIdsFilter()` Function** - ✅ **STAFF IDS FILTER**
**Purpose**: Checks if query includes `staffIds` array filter
**Logic**: Searches through all `where` clauses for `app.staffIds` filter
**Usage**: Validates that staff queries filter by assignment

### **`hasCaseManagerIdFilter()` Function** - ✅ **CASE MANAGER FILTER**
**Purpose**: Checks if query includes `caseManagerId` filter
**Logic**: Searches through `where` clauses for `app.studentData.caseManagerId` filter
**Usage**: Validates case manager query filtering

### **`hasValidTestingQuery()` Function** - ✅ **TESTING FILTERS**
**Purpose**: Validates testing-specific query filters
**Filters**: `app.flags.flag2` or `app.flags.separateSetting` == true
**Usage**: Allows testing queries with specific flags

---

## 📊 **DATA VALIDATION FUNCTIONS**

### **`validEncryptedFields()` Function** - ✅ **DATA STRUCTURE**
**Purpose**: Validates that student data structure is correct
**Checks**:
- `accommodations` field structure
- `schedule.classServices` array
- `studentData.plan` string
**Usage**: Called by create/update rules to ensure data integrity

---

## 🏗️ **COLLECTION RULES**

### **Students Collection** - ✅ **CORE DATA**
**Path**: `/students/{studentId}`
**Rules**:
- **Read**: `canReadStudent(studentId)` - Role-based access control
- **List**: `validStudentQuery()` - Query validation
- **Create**: `isAnyAdmin()` + `validEncryptedFields()` - Admin only
- **Update**: `canEditStudent(studentId)` + `validEncryptedFields()` - Role-based
- **Delete**: `isSuperAdmin()` - Super admin only

### **Users Collection** - ✅ **USER MANAGEMENT**
**Path**: `/users/{userId}`
**Rules**:
- **Read**: `hasValidRole()` - All authenticated users
- **Create**: `isAnyAdmin()` - Admin only
- **Update**: `isAnyAdmin()` OR `isOwner(userId)` - Admin or self
- **Delete**: `isAnyAdmin()` - Admin only

### **App Settings Collection** - ✅ **SYSTEM CONFIG**
**Path**: `/app_settings/{document}`
**Rules**:
- **Read**: `hasValidRole()` - All authenticated users
- **Write**: `isAnyAdmin()` - Admin only

### **Security Settings** - ✅ **SECURITY CONFIG**
**Path**: `/app_settings/security`
**Rules**:
- **Read**: `hasValidRole()` - All users need timeout settings
- **Write**: `isAnyAdmin()` - Admin only

### **Theme Settings** - ✅ **UI CONFIG**
**Path**: `/app_settings/theme`
**Rules**:
- **Read**: `hasValidRole()` - All users need theme settings
- **Write**: `isAnyAdmin()` - Admin only

### **Aide Schedules Collection** - ✅ **PARAEDUCATOR DATA**
**Path**: `/aideSchedules/{aideId}`
**Rules**:
- **Read**: `isAnyAdmin()` OR `isOwner(aideId)` - Admin or assigned paraeducator
- **Write**: `isAnyAdmin()` - Admin only

### **Feedback Forms Collection** - ✅ **TEACHER FEEDBACK**
**Path**: `/feedbackForms/{formId}`
**Rules**:
- **Read**: `isAnyAdmin()` OR `isCaseManager()` - Admin or case managers
- **Create/Update**: `isAnyAdmin()` OR `isCaseManager()` - Admin or case managers
- **Delete**: `isSuperAdmin()` - Super admin only

### **Feedback Responses Collection** - ✅ **FEEDBACK DATA**
**Path**: `/feedbackResponses/{responseId}`
**Rules**:
- **Read**: `isAnyAdmin()` OR `isCaseManager()` - Admin or case managers
- **Write**: `false` - Cloud Functions only

### **Feedback Send Log Collection** - ✅ **FEEDBACK LOGS**
**Path**: `/feedbackSendLog/{logId}`
**Rules**:
- **Read**: `isAnyAdmin()` OR `isCaseManager()` - Admin or case managers
- **Write**: `false` - Cloud Functions only

---

## 🔒 **SECURITY MODEL SUMMARY**

### **🔓 FULL ACCESS ROLES**
- `admin` - System administrator (all operations)
- `school_admin` - School administrator (all operations)
- `staff_view` - Staff viewer (read-only access to all students)
- `staff_edit` - Staff editor (read/write access to all students)

### **🎯 SPECIALIZED ADMIN ROLES**
- `admin_504` - 504 coordinator (504 students only)
- `sped_chair` - SPED chair (all IEP students + assigned students including 504 if assigned)

### **🔒 RESTRICTED STAFF ROLES**
- `case_manager` - Only assigned students
- `teacher` - Only students in `staffIds`
- `service_provider` - Only students in `staffIds`
- `paraeducator` - Only students in `staffIds` or aideSchedules

### **📋 QUERY RESTRICTIONS**
- **Unrestricted Queries**: Full access roles
- **Filtered Queries**: Restricted staff roles must use `staffIds` or `caseManagerId` filters
- **Testing Queries**: Special flags for development/testing

### **🔐 DATA PROTECTION**
- **FERPA Compliance**: Role-based access control
- **Data Validation**: Structure validation on create/update
- **Audit Trail**: All operations logged
- **Secure File Access**: Time-limited signed URLs

---

## 🚨 **CRITICAL SECURITY FEATURES**

### **✅ FERPA COMPLIANCE**
- Role-based access control prevents unauthorized data access
- Staff can only access students they work with
- SPED Chair restricted to IEP students only
- All access attempts are logged

### **✅ DATA INTEGRITY**
- Input validation prevents malformed data
- Encrypted fields ensure sensitive data protection
- Automatic cleanup prevents orphaned data

### **✅ QUERY SECURITY**
- Filtered queries prevent data leakage
- Testing queries isolated from production data
- All queries validated before execution

---

**Note**: This documentation reflects the current Firestore rules implementation. All rules are designed to maintain FERPA compliance while providing appropriate access levels for different user roles.
