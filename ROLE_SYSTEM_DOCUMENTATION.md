# CaseManageVue Role System Documentation

## Overview

The role system in CaseManageVue is complex with multiple layers of view functions that handle different aspects of user permissions, student filtering, and UI behavior. This document breaks down each component and how they interact.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    StudentsView.vue                         │
│                 (Main UI Component)                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                useRoleBasedView                             │
│              (Entry Point/Router)                          │
│  • Routes admin_504 → useAdministrator504View              │
│  • Routes all others → useUnifiedRoleView                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
┌───────▼──────────┐    ┌───────────▼──────────┐
│useAdministrator  │    │   useUnifiedRoleView │
│    504View       │    │  (All Other Roles)   │
│ (admin_504 only) │    │                      │
└───────┬──────────┘    └───────────┬──────────┘
        │                           │
        └─────────────┬─────────────┘
                      │
            ┌─────────▼─────────┐
            │  useBaseRoleView  │
            │ (Core Functions)  │
            │ • Student queries │
            │ • Period grouping │
            │ • Permissions     │
            └───────────────────┘
```

## 📁 File Breakdown

### 1. `useRoleBasedView.js` - **Entry Point Router**

**Purpose:** Main entry point that routes different roles to their appropriate view functions.

**Key Logic:**
```javascript
switch (role) {
  case 'admin_504':
    return useAdministrator504View(studentData, filterData)
  default:
    return useUnifiedRoleView(studentData, filterData)
}
```

**What it does:**
- ✅ Routes `admin_504` to custom view with provider filtering
- ✅ Routes all other roles to unified view system
- ✅ Provides legacy permission checks for backward compatibility

**Roles handled:** ALL (but only admin_504 gets special treatment)

---

### 2. `useAdministrator504View.js` - **Admin_504 Custom View**

**Purpose:** Special custom view ONLY for admin_504 role with provider filtering.

**Provider View Options:**
- `CM` (case_manager) - Shows students they case manage
- `*` (iep_504_all) - Shows all IEP/504 students

**Key Functions:**

#### `visibleStudents` (List View)
```javascript
switch (providerView) {
  case 'case_manager':
    return getProviderViewStudents(baseStudents, currentUserId, 'case_manager')
  case 'iep_504_all':
    return baseStudents.filter(student => plan === 'IEP' || plan === '504')
}
```

#### `studentsByPeriod` (Class View) - **THE PROBLEM AREA**
```javascript
// CURRENT ISSUE: Uses baseView.visibleStudents (all students)
// but should use different logic for class view
const allStudents = baseView.visibleStudents.value

if (selectedTeacher && selectedTeacher !== 'all') {
  return baseView.groupStudentsByPeriod(allStudents, selectedTeacher)
}
```

**The Issue:** Class view tries to use "all students" but still gets filtered by the base view, not truly bypassing provider filtering.

---

### 3. `useUnifiedRoleView.js` - **All Other Roles**

**Purpose:** Handles ALL roles except admin_504 using configuration-driven approach.

**Roles handled:**
- `admin`, `school_admin`, `administrator` - Full access
- `sped_chair` - IEP focus with provider views
- `staff_view`, `staff_edit` - Staff access
- `case_manager` - Caseload focus
- `teacher`, `service_provider` - Teaching focus
- `paraeducator` - Student assistance focus

**Provider View Logic:**
```javascript
// Gets options from roleConfig.js
const providerViewOptions = RoleUtils.getProviderViewOptions(currentRole)

// Applies filtering based on provider view
switch (providerView) {
  case 'case_manager': // Students they case manage
  case 'service_provider': // Students they teach
  case 'all': // All accessible students
  case 'iep_all': // All IEP students (sped_chair)
}
```

**Class View Logic:**
```javascript
const studentsByPeriod = computed(() => {
  return baseView.groupStudentsByPeriod(visibleStudents.value, currentUserId.value)
})
```

---

### 4. `useBaseRoleView.js` - **Core Foundation**

**Purpose:** Provides core functionality used by all role views.

**Key Functions:**

#### `visibleStudents`
- Base student filtering before role-specific filtering
- Applies name, grade, teacher, paraeducator filters
- Returns filtered student list

#### `groupStudentsByPeriod(students, userId)`
- Groups students by class periods for class view
- Uses the provided `userId` to determine which teacher's schedule to use
- Returns object like: `{ "1": [student1, student2], "2": [student3] }`

#### `isClassViewDisabled`
- **CRITICAL LOGIC** - Determines when class view is available
- Different rules for different roles:

```javascript
// Teachers and paraeducators - always available
if (['teacher', 'paraeducator'].includes(role)) {
  return false
}

// Case managers - only in SP mode or when filtering by teacher
if (role === 'case_manager') {
  return filters.providerView !== 'service_provider' && filters.teacher === 'all'
}

// Sped chairs - only in SP mode or when filtering by teacher  
if (['sped_chair'].includes(role)) {
  return filters.providerView !== 'service_provider' && filters.teacher === 'all'
}

// Admin roles - only when filtering by teacher or paraeducator
if (['admin', 'school_admin', 'staff_view', 'staff_edit', 'administrator', 'admin_504'].includes(role)) {
  return filters.teacher === 'all' && filters.paraeducator === 'all'
}
```

---

### 5. `roleConfig.js` - **Configuration Engine**

**Purpose:** Centralized configuration for all role behaviors, permissions, and access patterns.

**Key Exports:**
- `ROLES` - Role constants
- `PERMISSIONS` - Permission constants  
- `ROLE_PERMISSIONS` - Which permissions each role has
- `PROVIDER_VIEW_OPTIONS` - Available provider views per role
- `ACCESS_PATTERN_FUNCTIONS` - How each role accesses students

## 🐛 The Admin_504 Class View Problem

### Current Flow (BROKEN):

1. **User selects teacher filter** → `filterData.currentFilters.teacher = "teacher123"`
2. **Switches to class view** → Calls `studentsByPeriod`
3. **studentsByPeriod logic:**
   ```javascript
   const allStudents = baseView.visibleStudents.value  // ❌ Still filtered by base view
   if (selectedTeacher !== 'all') {
     return baseView.groupStudentsByPeriod(allStudents, selectedTeacher)  // ❌ Wrong students
   }
   ```
4. **Result:** Empty or wrong students because `baseView.visibleStudents` is still applying base filters

### Root Cause:

The issue is that `baseView.visibleStudents` in `useBaseRoleView.js` applies **base filtering** (name, grade, etc.) but admin_504's `studentsByPeriod` needs **truly unfiltered students** for class view to work like admin view.

### Potential Solutions:

#### Option 1: Access Raw Students
```javascript
// In useAdministrator504View.js
const studentsByPeriod = computed(() => {
  // Use raw students, not baseView.visibleStudents
  const rawStudents = studentData.students.value
  
  if (selectedTeacher && selectedTeacher !== 'all') {
    return baseView.groupStudentsByPeriod(rawStudents, selectedTeacher)
  }
})
```

#### Option 2: Create Admin-Like Class View Mode
```javascript
// In useAdministrator504View.js
const studentsByPeriod = computed(() => {
  // When in class view, behave like admin (no provider filtering)
  const isClassView = filterData.currentFilters.viewMode === 'class'
  const studentsToUse = isClassView 
    ? studentData.students.value  // Raw students for class view
    : visibleStudents.value       // Filtered students for list view
    
  if (selectedTeacher && selectedTeacher !== 'all') {
    return baseView.groupStudentsByPeriod(studentsToUse, selectedTeacher)
  }
})
```

#### Option 3: Bypass Provider Filtering in Base View
Modify `useBaseRoleView.js` to have a "class view mode" that bypasses certain filters.

## 🎯 Recommended Fix

The cleanest solution is **Option 2** - make admin_504 class view behave like admin view by using raw students when in class view mode, but keep provider filtering for list view.

This maintains the intended behavior:
- **List View:** Respects provider filtering (CM vs *)  
- **Class View:** Shows full classroom context like admin roles

## 🔍 Testing Strategy

1. **Login as admin_504**
2. **Set provider view to "*" (all IEP/504)**
3. **Select specific teacher in filter**
4. **Switch to Class View**
5. **Expected:** See ALL students in that teacher's class periods (not just IEP/504)
6. **Switch back to List View** 
7. **Expected:** See only IEP/504 students (provider filtering active)
