# Production Deployment Guide
## Testing Accommodations System + DHH Service Provider Fix

**Date:** January 2025  
**Features:** 
- ✅ Secure Testing Accommodations Access System
- ✅ DHH Service Provider Display Fix
- ✅ User Management Testing Access Controls

---

## 🚀 **Deployment Steps**

### **1. Deploy Cloud Functions**
```bash
firebase deploy --only functions
```
**What this deploys:**
- `syncTestingAccommodations` function for automatic data sync
- Triggers on student document changes
- Creates filtered testing data in `testingAccommodations` collection

### **2. Deploy Firestore Security Rules**
```bash
firebase deploy --only firestore:rules
```
**What this deploys:**
- New `hasTestingAccess()` helper function
- Security rules for `testingAccommodations` collection
- Hierarchical access control logic

### **3. Build and Deploy Frontend**
```bash
npm run build
firebase deploy --only hosting
```
**What this deploys:**
- Testing accommodations UI and logic
- DHH service provider display fix
- User management testing access controls
- Test Proctor view for paraeducators

---

## 📁 **Files Being Deployed**

### **🆕 NEW FILES (2)**

1. **`functions/modules/testingSync.js`** (70 lines)
   - Cloud Function for automatic data synchronization
   - Creates filtered testing records

2. **`src/composables/useTestingAccommodations.js`** (82 lines)
   - Frontend composable for secure testing data access
   - Handles permissions and data fetching

### **🔧 MODIFIED FILES (8)**

1. **`firestore.rules`** (+15 lines)
   - Added `hasTestingAccess()` function
   - Added `testingAccommodations` collection rules

2. **`functions/index.js`** (+3 lines)
   - Export for `syncTestingAccommodations` function

3. **`src/composables/useStudentViews.js`** (~45 lines modified)
   - Hierarchical testing access logic
   - Search functionality for testing data

4. **`src/views/StudentsView.vue`** (+65 lines)
   - Test Proctor header UI
   - Testing data fetch logic
   - Restored tooltip CSS

5. **`src/components/UserAddForm.vue`** (+15 lines)
   - Testing access checkbox for new users

6. **`src/components/UserTable.vue`** (~35 lines modified)
   - Removed "Title" column
   - Added "Testing Access" column with hierarchical display

7. **`src/components/students/StudentTable.vue`** (+5 lines) **[DHH FIX]**
   - Added `appSettings` prop definition

8. **`src/components/students/table/StudentServicesCell.vue`** (+8 lines) **[DHH FIX]**
   - Added DHH to fallback provider list
   - Added all missing service providers to hardcoded fallback

---

## 🔐 **Security Features Being Deployed**

### **Database-Level Security:**
- ✅ New `testingAccommodations` collection with filtered data only
- ✅ Firestore rules prevent unauthorized access
- ✅ Cloud Functions handle data synchronization securely

### **Hierarchical Access Control:**
- ✅ **Full Access Roles:** `admin`, `school_admin`, `staff_view`, `staff_edit`, `admin_504`, `sped_chair`
  - Always have complete access (ignore `testingAccess` field)
- ✅ **Limited Roles:** `case_manager`, `teacher`, `service_provider`, `paraeducator`
  - Need `testingAccess: true` to access filtered testing data

### **Data Minimization:**
- ✅ Testing users only see: basic info, assessment accommodations, schedule, separate setting flag
- ✅ No access to: custom flags, sensitive IEP data, services, personal information

---

## 🎯 **User Experience After Deployment**

### **For Administrators:**
- ✅ Can grant testing access via User Management table
- ✅ "Testing Access" column replaces "Title" column
- ✅ Full access roles show green checkmark + "Always" (read-only)
- ✅ Limited roles show editable Yes/No dropdown

### **For Users with Testing Access:**
- ✅ See "Test Proctor View" header in testing mode
- ✅ Access filtered testing data only
- ✅ Search functionality works in testing view
- ✅ Assessment accommodations display correctly

### **For Full Access Users:**
- ✅ See complete testing view with all student data
- ✅ No "Test Proctor" label (maintains admin experience)
- ✅ DHH service providers display correctly

---

## 🧪 **Post-Deployment Testing Checklist**

### **✅ Test Testing Accommodations System:**
1. **Grant testing access to a paraeducator user**
   - Go to User Management
   - Edit a paraeducator user
   - Set "Testing Access" to "Yes"
   - Save changes

2. **Test paraeducator experience:**
   - Log in as the paraeducator
   - Go to Students view
   - Switch to "Testing" view mode
   - Verify "Test Proctor View" header appears
   - Confirm only testing students with separate settings are visible
   - Test search functionality

3. **Test admin experience:**
   - Log in as admin
   - Go to Students view, Testing mode
   - Verify no "Test Proctor" header (should see all students)
   - Confirm full access to all testing data

### **✅ Test DHH Service Provider Fix:**
1. **Find a student with DHH provider**
   - Look for students with `dhhId` in their providers
   - Check the Services column in student table

2. **Verify DHH displays correctly**
   - Should see "DHH (Provider Name)" in Related Services
   - Should work in all views (list, class, testing)

### **✅ Test User Management:**
1. **Test existing users:**
   - Full access roles should show green checkmark + "Always"
   - Limited roles should show current Yes/No status

2. **Test adding new users:**
   - Individual add form should have "Testing Access" checkbox
   - Checkbox should save correctly to database

---

## 🚨 **Rollback Plan (If Needed)**

If issues occur, rollback in reverse order:

1. **Rollback Frontend:**
   ```bash
   git checkout HEAD~1  # or specific commit
   npm run build
   firebase deploy --only hosting
   ```

2. **Rollback Firestore Rules:**
   ```bash
   git checkout HEAD~1 firestore.rules
   firebase deploy --only firestore:rules
   ```

3. **Rollback Cloud Functions:**
   ```bash
   git checkout HEAD~1 functions/
   firebase deploy --only functions
   ```

---

## 📊 **Expected Impact**

### **Positive Changes:**
- ✅ Enhanced security for testing accommodations
- ✅ FERPA-compliant data access controls
- ✅ Fixed DHH service provider display issue
- ✅ Improved user management interface
- ✅ Better paraeducator workflow for testing

### **No Breaking Changes:**
- ✅ Existing admin workflows unchanged
- ✅ Student data structure preserved
- ✅ All existing functionality maintained
- ✅ Session timeout system unaffected

---

## 🎉 **Deployment Complete**

After successful deployment, the system will provide:
- **Secure testing accommodations access** for designated staff
- **Fixed DHH service provider display** in student tables
- **Enhanced user management** with testing access controls
- **Database-level security** with hierarchical access control

**Production URL:** https://casemangervue.web.app  
**Firebase Console:** https://console.firebase.google.com/project/casemangervue/overview

---

## 📞 **Support**

If you encounter any issues during deployment:
1. Check the Firebase Console for function logs
2. Verify Firestore rules deployment in Firebase Console
3. Test with a non-admin user account first
4. Check browser console for any JavaScript errors

**Remember:** Full access roles (admin, staff_view, etc.) always have complete access regardless of their `testingAccess` field value.
