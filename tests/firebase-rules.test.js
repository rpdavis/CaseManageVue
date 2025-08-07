import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getStorage, connectStorageEmulator } from 'firebase/storage'

// Mock Firebase app
const mockFirebaseApp = {
  name: '[DEFAULT]',
  options: {
    projectId: 'test-project'
  }
}

describe('Firebase Security Rules', () => {
  let testEnv
  let db
  let storage

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'test-project',
      firestore: {
        rules: `
          rules_version = '2';
          service cloud.firestore {
            match /databases/{database}/documents {
              // Users collection
                        match /users/{userId} {
            allow read: if request.auth != null &&
              request.auth.token.role in ['admin', 'school_admin', 'staff_view', 'staff_edit', 'admin_504', 'sped_chair', 'case_manager', 'teacher', 'service_provider', 'paraeducator'];
            allow write: if request.auth != null &&
              (request.auth.token.role == 'admin' ||
               request.auth.token.role == 'school_admin' ||
               request.auth.token.role == 'admin_504' ||
               request.auth.token.role == 'sped_chair');
          }
              
              // Students collection (simplified for testing)
              match /students/{studentId} {
                allow read: if request.auth != null &&
                  request.auth.token.role in ['admin', 'school_admin', 'staff_view', 'staff_edit', 'admin_504', 'sped_chair', 'case_manager', 'teacher', 'service_provider', 'paraeducator'];
                allow write: if request.auth != null && 
                  (request.auth.token.role == 'admin' ||
                   request.auth.token.role == 'school_admin' ||
                   request.auth.token.role == 'admin_504' ||
                   request.auth.token.role == 'sped_chair' ||
                   request.auth.token.role == 'case_manager' ||
                   request.auth.token.role == 'service_provider' ||
                   request.auth.token.role == 'staff_edit');
              }
              
              // App settings
              match /appSettings/{docId} {
                allow read: if request.auth != null;
                allow write: if request.auth != null && 
                  (request.auth.token.role == 'admin' || 
                   request.auth.token.role == 'school_admin');
              }
            }
          }
        `,
        host: 'localhost',
        port: 8080
      }
    })

    db = getFirestore(mockFirebaseApp)
    storage = getStorage(mockFirebaseApp)
    
    // Connect to emulators
    connectFirestoreEmulator(db, 'localhost', 8080)
    connectStorageEmulator(storage, 'localhost', 9199)
  })

  afterAll(async () => {
    await testEnv.cleanup()
  })

  beforeEach(async () => {
    await testEnv.clearFirestore()
  })

  describe('Users Collection', () => {
    test('admin can read users', async () => {
      const adminUser = testEnv.authenticatedContext('admin-user', {
        role: 'admin'
      })

      await assertSucceeds(
        adminUser.firestore().collection('users').get()
      )
    })

    test('admin can write users', async () => {
      const adminUser = testEnv.authenticatedContext('admin-user', {
        role: 'admin'
      })

      await assertSucceeds(
        adminUser.firestore().collection('users').doc('test-user').set({
          name: 'Test User',
          email: 'test@example.com',
          role: 'teacher'
        })
      )
    })

    test('teacher cannot write users', async () => {
      const teacherUser = testEnv.authenticatedContext('teacher-user', {
        role: 'teacher'
      })

      await assertFails(
        teacherUser.firestore().collection('users').doc('test-user').set({
          name: 'Test User',
          email: 'test@example.com',
          role: 'admin'
        })
      )
    })

    test('unauthenticated user cannot read users', async () => {
      const unauthenticatedUser = testEnv.unauthenticatedContext()

      await assertFails(
        unauthenticatedUser.firestore().collection('users').get()
      )
    })
  })

  describe('Students Collection', () => {
    test('teacher can read students', async () => {
      const teacherUser = testEnv.authenticatedContext('teacher-user', {
        role: 'teacher'
      })

      await assertSucceeds(
        teacherUser.firestore().collection('students').get()
      )
    })

    test('teacher can write students', async () => {
      const teacherUser = testEnv.authenticatedContext('teacher-user', {
        role: 'teacher'
      })

      await assertSucceeds(
        teacherUser.firestore().collection('students').doc('test-student').set({
          name: 'Test Student',
          grade: '10th',
          iep: true
        })
      )
    })

    test('staff_view cannot write students', async () => {
      const staffViewUser = testEnv.authenticatedContext('staff-view-user', {
        role: 'staff_view'
      })

      await assertFails(
        staffViewUser.firestore().collection('students').doc('test-student').set({
          name: 'Test Student',
          grade: '10th',
          iep: true
        })
      )
    })

    test('case_manager can write students', async () => {
      const caseManagerUser = testEnv.authenticatedContext('case-manager-user', {
        role: 'case_manager'
      })

      await assertSucceeds(
        caseManagerUser.firestore().collection('students').doc('test-student').set({
          name: 'Test Student',
          grade: '10th',
          iep: true
        })
      )
    })
  })

  describe('App Settings', () => {
    test('admin can read app settings', async () => {
      const adminUser = testEnv.authenticatedContext('admin-user', {
        role: 'admin'
      })

      await assertSucceeds(
        adminUser.firestore().collection('appSettings').get()
      )
    })

    test('admin can write app settings', async () => {
      const adminUser = testEnv.authenticatedContext('admin-user', {
        role: 'admin'
      })

      await assertSucceeds(
        adminUser.firestore().collection('appSettings').doc('general').set({
          schoolName: 'Test School',
          academicYear: '2024-2025'
        })
      )
    })

    test('teacher cannot write app settings', async () => {
      const teacherUser = testEnv.authenticatedContext('teacher-user', {
        role: 'teacher'
      })

      await assertFails(
        teacherUser.firestore().collection('appSettings').doc('general').set({
          schoolName: 'Test School',
          academicYear: '2024-2025'
        })
      )
    })

    test('teacher can read app settings', async () => {
      const teacherUser = testEnv.authenticatedContext('teacher-user', {
        role: 'teacher'
      })

      await assertSucceeds(
        teacherUser.firestore().collection('appSettings').get()
      )
    })
  })
}) 