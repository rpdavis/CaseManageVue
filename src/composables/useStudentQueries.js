// src/composables/useStudentQueries.js
// Role-based database queries for secure student data access

import { ref, computed } from 'vue'
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  doc, 
  getDoc,
  limit,
  startAfter
} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { db } from '@/firebase'
import { useAuthStore } from '@/store/authStore'

export function useStudentQueries() {
  const authStore = useAuthStore()
  const loading = ref(false)
  const error = ref(null)
  const students = ref([])
  const totalCount = ref(0)
  
  // Get current user info
  const currentUser = computed(() => authStore.user)
  const currentRole = computed(() => authStore.user?.role)
  const currentUserId = computed(() => authStore.user?.uid)
  
  // ─── ROLE-BASED DATABASE QUERIES ─────────────────────────────────────────────
  
  // Admin roles - can access all students
  const getAdminStudents = async () => {
    try {
      const q = query(
        collection(db, 'students'),
        orderBy('app.studentData.lastName', 'asc')
      )
      const snapshot = await getDocs(q)
      const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      return students
    } catch (error) {
      console.error('🔴 Admin query error:', error)
      console.error('🔴 Admin query error details:', error.message, error.code)
      // Try fallback query without ordering
      try {
        const fallbackQuery = query(collection(db, 'students'))
        const fallbackSnapshot = await getDocs(fallbackQuery)
        const fallbackStudents = fallbackSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        return fallbackStudents
      } catch (fallbackError) {
        console.error('🔴 Fallback query also failed:', fallbackError)
        console.error('🔴 Fallback query error details:', fallbackError.message, fallbackError.code)
        return []
      }
    }
  }
  
  // 504 Coordinator role - can view all students but only edit 504 plan students
  const getAdmin504Students = async () => {
    try {
      const q = query(
        collection(db, 'students'),
        orderBy('app.studentData.lastName', 'asc')
      )
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.error('🔴 504 Admin query error:', error)
      // Fallback without ordering
      try {
        const fallbackQuery = query(collection(db, 'students'))
        const fallbackSnapshot = await getDocs(fallbackQuery)
        return fallbackSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      } catch (fallbackError) {
        console.error('🔴 504 Admin fallback query failed:', fallbackError)
        return []
      }
    }
  }
  
  // SPED Chair role - can view only IEP plan students
  const getSpedChairStudents = async () => {
    try {
      const q = query(
        collection(db, 'students'),
        where('app.studentData.plan', '==', 'IEP'),
        orderBy('app.studentData.lastName', 'asc')
      )
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.error('🔴 SPED Chair query error:', error)
      // Fallback without ordering
      try {
        const fallbackQuery = query(
          collection(db, 'students'),
          where('app.studentData.plan', '==', 'IEP')
        )
        const fallbackSnapshot = await getDocs(fallbackQuery)
        return fallbackSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      } catch (fallbackError) {
        console.error('🔴 SPED Chair fallback query failed:', fallbackError)
        return []
      }
    }
  }
  
  const getCaseManagerStudents = async (userId) => {
    try {
      // Case managers need access to students they case manage AND students they provide services to
      // We need to run two separate queries and combine the results
      
      // Query 1: Students where they are the case manager
      const cmQuery = query(
        collection(db, 'students'),
        where('app.studentData.caseManagerId', '==', userId)
      )
      const cmSnapshot = await getDocs(cmQuery)
      const cmStudents = cmSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      
      // Query 2: Students where they provide services (in staffIds)
      const spQuery = query(
        collection(db, 'students'),
        where('app.staffIds', 'array-contains', userId)
      )
      const spSnapshot = await getDocs(spQuery)
      const spStudents = spSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      
      // Combine and deduplicate students
      const allStudents = [...cmStudents]
      spStudents.forEach(spStudent => {
        if (!allStudents.find(student => student.id === spStudent.id)) {
          allStudents.push(spStudent)
        }
      })
      
      // Sort by last name
      allStudents.sort((a, b) => {
        const lastNameA = a.app?.studentData?.lastName || ''
        const lastNameB = b.app?.studentData?.lastName || ''
        return lastNameA.localeCompare(lastNameB)
      })
      
      return allStudents
    } catch (error) {
      console.error('🔒 Security: Error loading case manager students:', error)
      return []
    }
  }
  
  // Teachers use staffIds filter for secure database-level filtering
  const getTeacherStudents = async (userId) => {
    try {
      // Use required staffIds filter for Firestore security rules
      const q = query(
        collection(db, 'students'),
        where('app.staffIds', 'array-contains', userId),
        orderBy('app.studentData.lastName', 'asc')
      )
      
      const snapshot = await getDocs(q)
      
      // Database filtering ensures only authorized students are returned
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      
    } catch (error) {
      console.error('🔒 Security: Error loading teacher students:', error)
      return []
    }
  }
  
  // Service Provider query - uses staffIds array for security compliance
  const getServiceProviderStudents = async (userId) => {
    console.log('🔍 Service Provider query: Loading students for provider', userId)
    console.log('🔍 Service Provider query: userId type:', typeof userId)
    console.log('🔍 Service Provider query: userId value:', JSON.stringify(userId))
    
    try {
      // Use staffIds array-contains query (required by Firestore security rules)
      const q = query(
        collection(db, 'students'),
        where('app.staffIds', 'array-contains', userId)
      )
      console.log('🔍 Service Provider query: Executing staffIds query...')
      const snapshot = await getDocs(q)
      console.log('🔍 Service Provider query: Success! Found', snapshot.size, 'students')
      const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      
      // Sort client-side
      students.sort((a, b) => {
        const aName = a.app?.studentData?.lastName || ''
        const bName = b.app?.studentData?.lastName || ''
        return aName.localeCompare(bName)
      })
      
      return students
    } catch (error) {
      console.error('🔴 Service Provider query FAILED:', error)
      
      // Security: Check auth state for debugging
      const auth = getAuth()
      console.error('🔴 Service Provider auth mismatch - userId:', userId, 'authUid:', auth.currentUser?.uid)
      
      return []
    }
  }
  
  // Paraeducator query - uses aideSchedules collection for student access
  const getParaeducatorStudents = async (userId) => {
    try {
      // First, check if aide has staffIds access (preferred method)
      try {
        const staffIdsQuery = query(
          collection(db, 'students'),
          where('app.staffIds', 'array-contains', userId),
          orderBy('app.studentData.lastName', 'asc')
        )
        const staffIdsSnapshot = await getDocs(staffIdsQuery)
        
        if (staffIdsSnapshot.size > 0) {
          const students = staffIdsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
          return students
        }
      } catch (staffIdsError) {
        // Fall through to aideSchedules approach
      }
      
      // Fallback: Get aide's assigned students from aideSchedules
      
      // Get aide schedule document
      const aideDoc = await getDoc(doc(db, 'aideSchedules', userId))
      if (!aideDoc.exists()) {
        return []
      }
      
      const aideData = aideDoc.data()
      
      // Get student IDs from the aide's document
      let studentIds = []
      
      // Primary: Use studentIds array if available
      if (aideData.studentIds && Array.isArray(aideData.studentIds)) {
        studentIds = aideData.studentIds
      }
      // Fallback: Use directAssignment if studentIds not available
      else if (aideData.directAssignment) {
        studentIds = Array.isArray(aideData.directAssignment) 
          ? aideData.directAssignment 
          : [aideData.directAssignment]
      }
      
      if (studentIds.length === 0) {
        return []
      }
      
      // Query students individually to avoid Firestore rule issues
      const studentPromises = studentIds.map(async (studentId) => {
        try {
          const studentDoc = await getDoc(doc(db, 'students', studentId))
          if (studentDoc.exists()) {
            return { id: studentDoc.id, ...studentDoc.data() }
          }
          return null
        } catch (error) {
          console.warn('Failed to fetch student', studentId, ':', error.message)
          return null
        }
      })
      
      const studentResults = await Promise.all(studentPromises)
      const validStudents = studentResults.filter(student => student !== null)
      
      // Sort by last name
      validStudents.sort((a, b) => {
        const aName = a.app?.studentData?.lastName || ''
        const bName = b.app?.studentData?.lastName || ''
        return aName.localeCompare(bName)
      })
      
      return validStudents
      
    } catch (error) {
      console.error('🔴 Paraeducator query FAILED:', error)
      
      // Security: Check auth state for debugging
      const auth = getAuth()
      console.error('🔴 Paraeducator auth mismatch - userId:', userId, 'authUid:', auth.currentUser?.uid)
      
      return []
    }
  }
  
  // Testing view - students with testing flags
  const getTestingStudents = async () => {
    
    // Query for flag2 (primary field)
    const q1 = query(
      collection(db, 'students'),
      where('app.flags.flag2', '==', true),
      orderBy('app.studentData.lastName', 'asc')
    )
    
    // Query for separateSetting (backward compatibility)
    const q2 = query(
      collection(db, 'students'),
      where('app.flags.separateSetting', '==', true),
      orderBy('app.studentData.lastName', 'asc')
    )
    
    const [snapshot1, snapshot2] = await Promise.all([
      getDocs(q1),
      getDocs(q2)
    ])
    
    // Combine results and remove duplicates
    const students1 = snapshot1.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    const students2 = snapshot2.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    
    const combinedStudents = [...students1]
    students2.forEach(student => {
      if (!combinedStudents.find(s => s.id === student.id)) {
        combinedStudents.push(student)
      }
    })
    
    return combinedStudents.sort((a, b) => {
      const lastNameA = a.app?.studentData?.lastName || ''
      const lastNameB = b.app?.studentData?.lastName || ''
      return lastNameA.localeCompare(lastNameB)
    })
  }
  
  // ─── MAIN QUERY FUNCTION ─────────────────────────────────────────────────────
  
  const loadStudents = async (options = {}) => {
    if (!currentUserId.value || !currentRole.value) {
      console.error('🔴 No authenticated user or role - FAILING AUTH CHECK')
      error.value = 'Authentication required'
      return []
    }
    
    loading.value = true
    error.value = null
    
    try {
      let studentData = []
      

      
      // Route to appropriate query based on role
      switch (currentRole.value) {
        case 'admin':
        case 'school_admin':
        case 'staff_view':
        case 'staff_edit':
        // Legacy roles for backward compatibility
        case 'administrator':
          studentData = await getAdminStudents()
          break
        case 'sped_chair':
          // SPED Chair: Only see IEP students in table
          studentData = await getSpedChairStudents()
          break
        case 'admin_504':
          // 504 Coordinator: See all students, edit restrictions applied at form level
          studentData = await getAdmin504Students()
          break
        case 'case_manager':
          studentData = await getCaseManagerStudents(currentUserId.value)
          break
          
        case 'teacher':
          studentData = await getTeacherStudents(currentUserId.value)
          break
          
        case 'service_provider':
          studentData = await getServiceProviderStudents(currentUserId.value)
          break
          
        case 'paraeducator':
          studentData = await getParaeducatorStudents(currentUserId.value)
          break
          
        default:
          console.error('🔴 Unknown role:', currentRole.value)
          error.value = 'Invalid user role'
          return []
      }
      
      // Apply additional filters if provided
      if (options.testingOnly) {
        studentData = await getTestingStudents()
      }
      
      students.value = studentData
      totalCount.value = studentData.length
      
      return studentData
      
    } catch (err) {
      console.error('🔴 Error loading students:', err)
      error.value = err.message || 'Failed to load students'
      return []
    } finally {
      loading.value = false
    }
  }
  
  // ─── INDIVIDUAL STUDENT ACCESS ───────────────────────────────────────────────
  
  const getStudent = async (studentId) => {
    if (!studentId) {
      throw new Error('Student ID is required')
    }
    
    if (!currentUserId.value || !currentRole.value) {
      throw new Error('Authentication required')
    }
    
    loading.value = true
    error.value = null
    
    try {
      const studentDoc = await getDoc(doc(db, 'students', studentId))
      
      if (!studentDoc.exists()) {
        throw new Error('Student not found')
      }
      
      const studentData = { id: studentDoc.id, ...studentDoc.data() }
      
      // Verify user has access to this student
      const hasAccess = await verifyStudentAccess(studentData, currentUserId.value, currentRole.value)
      
      if (!hasAccess) {
        throw new Error('Access denied to this student')
      }
      
      return studentData
      
    } catch (err) {
      console.error('🔴 Error getting student:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }
  
  // ─── ACCESS VERIFICATION ─────────────────────────────────────────────────────
  
  const verifyStudentAccess = async (student, userId, role) => {
    if (!student || !userId || !role) {
      return false
    }
    
    // Admin roles have full access
    if (['admin', 'school_admin', 'admin_504', 'sped_chair'].includes(role)) {
      return true
    }
    
    // Case manager access
    if (role === 'case_manager') {
      return student.app?.studentData?.caseManagerId === userId
    }
    
    // Teacher access
    if (role === 'teacher') {
      if (!student.app?.schedule?.periods) return false
      
      const periods = student.app.schedule.periods
      const periodValues = Object.values(periods)
      
      // Check simple string format
      if (periodValues.includes(userId)) {
        return true
      }
      
      // Check complex object format
      return periodValues.some(periodData => {
        if (typeof periodData === 'object' && periodData !== null) {
          return periodData.teacherId === userId || 
                 periodData.coTeaching?.caseManagerId === userId
        }
        return false
      })
    }
    
    // Service provider access
    if (role === 'service_provider') {
      // Check providers list
      if (student.app?.providers && Object.values(student.app.providers).includes(userId)) {
        return true
      }
      
      // Check schedule (service providers can also be teachers)
      if (student.app?.schedule?.periods) {
        const periods = student.app.schedule.periods
        const periodValues = Object.values(periods)
        
        // Check simple string format
        if (periodValues.includes(userId)) {
          return true
        }
        
        // Check complex object format
        return periodValues.some(periodData => {
          if (typeof periodData === 'object' && periodData !== null) {
            return periodData.teacherId === userId || 
                   periodData.coTeaching?.caseManagerId === userId
          }
          return false
        })
      }
    }
    
    // Paraeducator access
    if (role === 'paraeducator') {
      // This would need to check aide assignments
      // For now, return false - implement based on aide assignment logic
      return false
    }
    
    return false
  }
  
  // ─── PAGINATION SUPPORT ──────────────────────────────────────────────────────
  
  const loadStudentsPaginated = async (pageSize = 50, lastDoc = null) => {
    if (!currentUserId.value || !currentRole.value) {
      throw new Error('Authentication required')
    }
    
    loading.value = true
    error.value = null
    
    try {
      let q = query(
        collection(db, 'students'),
        orderBy('app.studentData.lastName', 'asc'),
        limit(pageSize)
      )
      
      if (lastDoc) {
        q = query(q, startAfter(lastDoc))
      }
      
      // Apply role-based filtering
      if (currentRole.value === 'case_manager') {
        q = query(
          collection(db, 'students'),
          where('app.studentData.caseManagerId', '==', currentUserId.value),
          orderBy('app.studentData.lastName', 'asc'),
          limit(pageSize)
        )
        
        if (lastDoc) {
          q = query(q, startAfter(lastDoc))
        }
      }
      
      const snapshot = await getDocs(q)
      const studentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      
      // For complex roles (teacher, service_provider), we need client-side filtering
      // This is a simplified version - full implementation would need more complex logic
      
      return {
        students: studentData,
        lastDoc: snapshot.docs[snapshot.docs.length - 1],
        hasMore: snapshot.docs.length === pageSize
      }
      
    } catch (err) {
      console.error('🔴 Error loading paginated students:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }
  
  return {
    // State
    students: computed(() => students.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    totalCount: computed(() => totalCount.value),
    
    // Methods
    loadStudents,
    getStudent,
    verifyStudentAccess,
    loadStudentsPaginated,
    
    // Role-specific queries (for testing/debugging)
    getAdminStudents,
    getAdmin504Students,
    getCaseManagerStudents,
    getTeacherStudents,
    getServiceProviderStudents,
    getParaeducatorStudents,
    getTestingStudents
  }
}