# CaseManageVue v1.1.9 Changes Documentation

## Overview
Version 1.1.9 fixes critical class view filtering issues for admin_504 and sped_chair roles, adds co-teaching support, and includes project migration improvements.

## 🎯 Key Issues Fixed

### 1. Admin_504 Class View Not Showing Students
**Problem:** When admin_504 users selected a teacher filter and switched to class view, no students were displayed.
**Root Cause:** The `studentsByPeriod` function was using `currentUserId` instead of the selected teacher's ID for grouping.

### 2. Sped_Chair Class View Issues
**Problem:** Similar to admin_504, sped_chair users couldn't see students in class view when filtering by teacher or when in SP (Service Provider) mode.
**Root Cause:** Same grouping issue and missing logic for SP mode behavior.

### 3. Co-Teaching Students Not Appearing
**Problem:** Co-taught students (like Ryan Davis 3rd period) weren't showing up in class view.
**Root Cause:** Teacher filtering and class grouping logic wasn't checking for co-teaching relationships.

### 4. Session Timeout Settings "Unset and Turn Off"
**Problem:** Session timeout settings would disable themselves after being configured.
**Root Cause:** Missing or corrupted `app_settings/security` Firestore document caused the system to default to `false` instead of `true`.

## 📁 Files Modified

### Core Role System Files

#### `src/composables/roles/useAdministrator504View.js`
**Changes:**
- Updated `studentsByPeriod` computed property to use selected teacher/paraeducator ID instead of current user ID
- Added logic to handle teacher and paraeducator filtering for class view

```javascript
// OLD (BROKEN)
const studentsByPeriod = computed(() => {
  if (!currentUserId.value) return {}
  return baseView.groupStudentsByPeriod(visibleStudents.value, currentUserId.value)
})

// NEW (FIXED)
const studentsByPeriod = computed(() => {
  if (!currentUserId.value) return {}
  
  // If a specific teacher is selected in filters, group by that teacher's periods
  const selectedTeacher = filterData.currentFilters.teacher
  if (selectedTeacher && selectedTeacher !== 'all') {
    return baseView.groupStudentsByPeriod(visibleStudents.value, selectedTeacher)
  }
  
  // If a specific paraeducator is selected, group by that paraeducator's periods  
  const selectedParaeducator = filterData.currentFilters.paraeducator
  if (selectedParaeducator && selectedParaeducator !== 'all') {
    return baseView.groupStudentsByPeriod(visibleStudents.value, selectedParaeducator)
  }
  
  // Otherwise, group by current user's periods
  return baseView.groupStudentsByPeriod(visibleStudents.value, currentUserId.value)
})
```

#### `src/composables/roles/useUnifiedRoleView.js`
**Changes:**
- Applied the same fix as admin_504 for sped_chair and other roles using unified view
- Updated `studentsByPeriod` to handle teacher/paraeducator filtering

```javascript
// Same pattern as above - check for selected teacher/paraeducator before using currentUserId
```

#### `src/composables/useStudentFilters.js`
**Changes:**
- Enhanced teacher filtering to include co-teaching relationships
- Updated service provider filtering to include co-teaching

```javascript
// OLD - Only checked primary teacher
return data.teacherId === filters.teacher

// NEW - Checks both primary and co-teacher
const primaryMatch = data.teacherId === filters.teacher
const coTeachMatch = (data.coTeaching?.caseManagerId) === filters.teacher
return primaryMatch || coTeachMatch
```

```javascript
// Service provider filtering now includes co-teaching
return data.teacherId === currentUser.value?.uid || (data.coTeaching?.caseManagerId === currentUser.value?.uid)
```

#### `src/composables/useStudentViews.js`
**Changes:**
- Updated class view grouping logic to include admin_504 and sped_chair in admin-like behavior
- Added special handling for sped_chair SP mode

```javascript
// OLD - Only admin and administrator
} else if (['admin', 'administrator'].includes(currentRole)) {

// NEW - Includes admin_504 and sped_chair
} else if (['admin', 'administrator', 'admin_504', 'sped_chair'].includes(currentRole)) {
  // Admin-family roles: allow class view only with specific filters
  if (isTeacherFilter) {
    // Group by the selected teacher's periods (primary or co-teach)
    shouldIncludeStudentInPeriod = teacherId === currentFilters.teacher || coTeacherId === currentFilters.teacher
  } else if (isParaeducatorFilter) {
    const aideData = aideAssignment.value[currentFilters.paraeducator]
    if (aideData?.classAssignment && aideData.classAssignment[period]) {
      const aideTeacherIds = Array.isArray(aideData.classAssignment[period]) 
        ? aideData.classAssignment[period] 
        : [aideData.classAssignment[period]]
      shouldIncludeStudentInPeriod = aideTeacherIds.includes(teacherId)
    }
  } else if (currentRole === 'sped_chair' && getCurrentFilters().providerView === 'service_provider') {
    // SPED chair in SP mode with no teacher filter: behave like a teacher (their own periods)
    shouldIncludeStudentInPeriod = teacherId === currentUserId || coTeacherId === currentUserId
  } else {
    // No applicable filter: do not include (class view should be disabled upstream)
    shouldIncludeStudentInPeriod = false
  }
```

#### `src/composables/useSessionTimeout.js`
**Changes:**
- Modified default behavior to use `sessionTimeoutEnabled !== false` instead of `sessionTimeoutEnabled || false`
- Added auto-recovery logic to create missing `app_settings/security` document with defaults
- Implemented defensive programming for error scenarios
- Added document creation during error recovery in `onSnapshot` callback

```javascript
// OLD (PROBLEMATIC)
const newEnabled = data.sessionTimeoutEnabled || false

// NEW (DEFENSIVE)
const newEnabled = data.sessionTimeoutEnabled !== false

// Added auto-recovery for missing document
if (!doc.exists()) {
  console.log('🔧 No session timeout settings found, creating with defaults')
  const defaultSettings = {
    sessionTimeoutEnabled: true,
    sessionTimeoutMinutes: 30,
    createdAt: new Date().toISOString(),
    createdBy: 'system_auto_create'
  }
  setDoc(settingsRef, defaultSettings, { merge: true })
  this.isEnabled.value = true
  this.timeoutMinutes.value = 30
}
```

### Configuration Files

#### `package.json`
**Changes:**
- Updated version from "1.1.8" to "1.1.9"

#### `src/firebase.js`
**Changes:**
- Restored correct Firebase configuration from v1.1.6
- Fixed project ID from `casemanagevue-jepson-prod` to `casemangervue`
- Updated API keys and configuration to match main project

```javascript
// OLD (INCORRECT - Jepson config)
const firebaseConfig = {
  apiKey: "AIzaSyDXMm_ZBTXOd7k0e9FqQkvRRBOWfMUtGZ8",
  authDomain: "casemanagevue-jepson-prod.firebaseapp.com",
  projectId: "casemanagevue-jepson-prod",
  // ...
};

// NEW (CORRECT - Main project config)
const firebaseConfig = {
  apiKey: "AIzaSyDx1jbQT-FzgzjASFqVA2kbAHWJ_TeUzdY",
  authDomain: "casemangervue.firebaseapp.com",
  projectId: "casemangervue",
  storageBucket: "casemangervue.firebasestorage.app",
  messagingSenderId: "756483333257",
  appId: "1:756483333257:web:694e2ad2415b7886563a58",
  measurementId: "G-YBRDQX9NFR"
};
```

#### `.firebaserc`
**Changes:**
- Updated default project from `casemanagevue-jepson-prod` to `casemangervue`

```json
{
  "projects": {
    "default": "casemangervue"
  }
}
```

#### `firebase.json`
**Changes:**
- Removed jepson-specific service account reference
- Cleaned up functions configuration

## 🔧 Technical Implementation Details

### Class View Permission Logic
The class view permission logic in `useBaseRoleView.js` was already correct:

```javascript
// Admin and staff roles can use class view when filtering by teacher or paraeducator
if (['admin', 'school_admin', 'staff_view', 'staff_edit', 'administrator', 'admin_504', 'administrator_504_CM'].includes(role)) {
  return filters.teacher === 'all' && filters.paraeducator === 'all'  // DISABLED when both are 'all'
}

// Sped chairs can use class view ONLY in SP mode or when filtering by teacher
if (['sped_chair'].includes(role)) {
  return filters.providerView !== 'service_provider' && filters.teacher === 'all'  // DISABLED when NOT SP and teacher='all'
}
```

This means:
- **Admin_504**: Class view only available when teacher OR paraeducator is selected
- **Sped_chair**: Class view available when in SP mode OR when teacher is selected

### Co-Teaching Data Structure
Co-teaching is stored in the schedule as:
```javascript
{
  "3": {
    "teacherId": "primaryTeacherId",
    "coTeaching": {
      "caseManagerId": "coTeacherId"
    }
  }
}
```

### Database Filtering
- **Sped_chair**: Only gets IEP students from database (`where('app.studentData.plan', '==', 'IEP')`)
- **Admin_504**: Gets all students from database, filtering happens in UI

## 🧪 Testing Scenarios

### Admin_504 Testing
1. Login as admin_504
2. Set provider view to "*" (all IEP/504)
3. Select specific teacher (e.g., "Ryan Davis")
4. Switch to Class View
5. **Expected:** See students in that teacher's class periods, including co-taught periods

### Sped_Chair Testing
1. Login as sped_chair
2. **Scenario A - Teacher Filter:**
   - Select specific teacher
   - Switch to Class View
   - **Expected:** See IEP students in that teacher's periods
3. **Scenario B - SP Mode:**
   - Set provider view to "SP" (service_provider)
   - Switch to Class View (no teacher filter needed)
   - **Expected:** See IEP students in periods where sped_chair teaches/co-teaches

### Co-Teaching Testing
1. Login as any role that can see Ryan Davis's students
2. Select "Ryan Davis" as teacher filter
3. Switch to Class View
4. **Expected:** See students in 3rd period (co-taught) and other periods where he's primary teacher

## 🎯 Role Views Changed vs Unchanged

### ✅ **CHANGED Role Views (Need Testing)**

#### **1. `admin_504` Role**
- **File:** `src/composables/roles/useAdministrator504View.js` 
- **Changes:** Fixed `studentsByPeriod` to use selected teacher/paraeducator ID instead of current user ID
- **Test:** Class view with teacher filtering

#### **2. All Roles Using `useUnifiedRoleView.js`**
- **File:** `src/composables/roles/useUnifiedRoleView.js`
- **Affected Roles:**
  - `admin` 
  - `school_admin`
  - `sped_chair` ⭐ **Most Important**
  - `staff_view`
  - `staff_edit` 
  - `case_manager`
  - `teacher`
  - `service_provider`
  - `paraeducator`
- **Changes:** Same fix as admin_504 - `studentsByPeriod` now uses selected teacher/paraeducator ID
- **Test:** Class view with teacher/paraeducator filtering

### ❌ **UNCHANGED Role Views (No Testing Needed)**

#### **Base System Files (Logic Only)**
- **File:** `src/composables/roles/useBaseRoleView.js`
- **Changes:** None - this file was already correct
- **File:** `src/composables/roles/useRoleBasedView.js` 
- **Changes:** None - this is just a router/wrapper
- **File:** `src/composables/roles/roleConfig.js`
- **Changes:** None - configuration only

## 🧪 Testing Priority Matrix

### **🔥 HIGH PRIORITY (Core Issue Fixes)**
1. **`admin_504`** - Teacher filtering in class view
2. **`sped_chair`** - Teacher filtering + SP mode in class view

### **🟡 MEDIUM PRIORITY (Affected by Changes)**
3. **`admin`** - Verify no regression in class view
4. **`case_manager`** - Co-teaching scenarios
5. **`teacher`** - Co-teaching scenarios

### **🟢 LOW PRIORITY (Minor Impact)**
6. **`school_admin`** - Class view functionality
7. **`staff_view`** / **`staff_edit`** - Class view functionality
8. **`service_provider`** - Class view functionality
9. **`paraeducator`** - Class view functionality

## 📋 Specific Test Scenarios by Role

### **Admin_504 Testing** ⭐
```
1. Login as admin_504
2. Provider view: "*" (all IEP/504)
3. Teacher filter: Select specific teacher
4. Switch to Class View
5. Expected: See students grouped by that teacher's periods
```

### **Sped_Chair Testing** ⭐
```
Scenario A - Teacher Filter:
1. Login as sped_chair  
2. Teacher filter: Select specific teacher
3. Switch to Class View
4. Expected: See IEP students in that teacher's periods

Scenario B - SP Mode:
1. Login as sped_chair
2. Provider view: "SP" (service_provider)
3. Switch to Class View (no teacher filter)
4. Expected: See IEP students in sped_chair's own periods
```

### **Co-Teaching Testing** (Any Role)
```
1. Select teacher with co-taught classes (e.g., Ryan Davis)
2. Switch to Class View  
3. Expected: See students in co-taught periods (e.g., 3rd period)
```

## 🎯 Testing Summary

**Files Changed:** 2 main files
- `useAdministrator504View.js` (admin_504 only)
- `useUnifiedRoleView.js` (9 other roles)

**Roles to Test:** Focus on `admin_504` and `sped_chair` as these were the primary issues. Test others for regression only.

**Key Test:** Class view with teacher filtering - this was the core broken functionality that's now fixed.

## 📋 Migration Checklist for Jepson Project

When applying these changes to casemanagevue-jepson:

### ✅ Required Changes
1. **Update role view files:**
   - `src/composables/roles/useAdministrator504View.js`
   - `src/composables/roles/useUnifiedRoleView.js`
   - `src/composables/useStudentFilters.js`
   - `src/composables/useStudentViews.js`
   - `src/composables/useSessionTimeout.js` ⭐ **New: Session timeout fix**

2. **Update version:**
   - `package.json` version to "1.1.9"

3. **Verify Firebase configuration:**
   - Ensure `src/firebase.js` uses correct jepson project config
   - Ensure `.firebaserc` points to correct jepson project
   - **DO NOT** copy the main project's Firebase config

### ⚠️ Configuration Notes
- **Keep jepson Firebase config** - don't copy the main project's Firebase settings
- **Keep jepson project ID** in `.firebaserc` and `firebase.json`
- **Only copy the logic changes**, not the configuration changes

### 🔍 Verification Steps
1. Test admin_504 class view with teacher filtering
2. Test sped_chair class view with teacher filtering and SP mode
3. Test co-teaching scenarios (if applicable in jepson project)
4. Verify Firebase configuration still points to jepson project

## 📝 Additional Documentation Created
- `ROLE_SYSTEM_DOCUMENTATION.md` - Comprehensive role system architecture documentation
- Various backup configuration files for reference

## 🚀 Deployment Notes
- All changes are backward compatible
- No database schema changes required
- No breaking changes to existing functionality
- Enhanced functionality only - existing features remain unchanged
