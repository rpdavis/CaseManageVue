import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import useStudents from '@/composables/useStudents.js'
import useUsers from '@/composables/useUsers.js'
import useAideAssignment from '@/composables/useAideAssignment.js'
import { useAuthStore } from '@/store/authStore'
import { useTeacherFeedback } from '@/composables/useTeacherFeedback.js'
import { useStudentQueries } from '@/composables/useStudentQueries.js'
import { quickSecurityTest } from '@/utils/securityTest.js'
import { 
  getTeacherIdFromPeriod, 
  getCoTeachingCaseManagerFromPeriod,
  getAllTeacherIdsFromSchedule,
  getCoTeachingCaseManagersFromSchedule,
  isCoTeachingCaseManager 
} from '@/utils/scheduleUtils.js'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/firebase'

export function useStudentData() {
  // External dependencies
  const router = useRouter()
  const authStore = useAuthStore()
  
  // Composables
  const { students, setStudents } = useStudents()
  const { users: userMap, userList, fetchUsers, caseManagers, teacherList, userRoles } = useUsers()
  const { 
    loadAideAssignment,
    loadAideAssignments, 
    shouldAideSeeStudent, 
    getStudentsForAide,
    aideAssignment
  } = useAideAssignment()
  const { 
    feedbackForms,
    formsLoading
  } = useTeacherFeedback()
  const { loadStudents } = useStudentQueries()

  // Loading state
  const isLoading = ref(false)
  const error = ref(null)

  // Computed properties
  // Use computed 'user' from auth store for correct reactive user object
  const currentUser = computed(() => authStore.currentUser)
  
  const isAdmin = computed(() => {
    const role = currentUser.value?.role
    return ['admin', 'school_admin', 'admin_504', 'sped_chair'].includes(role)
  })

  const showProviderView = computed(() => {
    return ['case_manager', 'admin_504', 'sped_chair'].includes(currentUser.value?.role)
  })

  const userMapObj = computed(() => userMap.value || {})

  // Get paraeducators for filter dropdown
  const paraeducators = computed(() => {
    return userList.value?.filter(user => user.role === 'paraeducator')
      .sort((a, b) => {
        // Extract last names for sorting
        const getLastName = (user) => {
          const fullName = user.name || user.email || user.id
          const nameParts = fullName.split(' ')
          return nameParts.length > 1 ? nameParts[nameParts.length - 1] : fullName
        }
        return getLastName(a).localeCompare(getLastName(b))
      }) || []
  })

  // Get service providers for filter dropdown
  const serviceProviders = computed(() => {
    return userList.value?.filter(user => user.role === 'service_provider')
      .sort((a, b) => {
        // Extract last names for sorting
        const getLastName = (user) => {
          const fullName = user.name || user.email || user.id
          const nameParts = fullName.split(' ')
          return nameParts.length > 1 ? nameParts[nameParts.length - 1] : fullName
        }
        return getLastName(a).localeCompare(getLastName(b))
      }) || []
  })

  // Get case managers with student counts for filter dropdown (preserves fallback logic)
  const caseManagersWithCounts = computed(() => {
    if (!students.value?.length || !caseManagers.value?.length) return []
    
    return caseManagers.value.map(cm => {
      const studentCount = students.value.filter(student => 
        getCaseManagerId(student) === cm.id
      ).length
      
      // Keep the same fallback logic as the original template
      const displayName = cm.name || cm.email || cm.id
      
      return {
        ...cm,
        displayName: `${displayName} (${studentCount})`,
        count: studentCount
      }
    }).sort((a, b) => a.displayName.localeCompare(b.displayName))
  })

  // Data fetching with role-based security
  const fetchData = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      // First, fetch users (needed for role-based student queries)
      await fetchUsers()
      
      // Then fetch students based on user role (SECURITY: Database-level filtering)
      const user = currentUser.value
      
      if (user) {
        const roleBasedStudents = await loadStudents()
        setStudents(roleBasedStudents)
        
        // Run security test to verify access control
        const securityTest = quickSecurityTest(roleBasedStudents, user)
        if (!securityTest.isSecure) {
          console.error('🚨 SECURITY VIOLATION DETECTED:', securityTest.violations)
        }
      } else {
        setStudents([])
      }
      
      // Load aide assignments based on user role and permissions
      const userRole = currentUser.value?.role
      if (['admin', 'school_admin', 'admin_504', 'sped_chair'].includes(userRole)) {
        // Admin roles can load all aide assignments
        await loadAideAssignments()
      } else if (userRole === 'paraeducator' && currentUser.value.uid) {
        // Paraeducators can only load their own aide assignment
        await loadAideAssignment(currentUser.value.uid)
        
        // Listen for changes to their own aideSchedules document for real-time updates
        const aideDocRef = doc(db, 'aideSchedules', currentUser.value.uid)
        const unsubscribe = onSnapshot(aideDocRef, async snap => {
          if (snap.exists()) {
            // Update the aide assignment data
            await loadAideAssignment(currentUser.value.uid)
            // Re-fetch role-based students (will use updated studentIds)
            const updated = await loadStudents()
            setStudents(updated)
          }
        })
        // Clean up on unmount
        onUnmounted(() => unsubscribe())
      }
      

      
    } catch (err) {
      console.error('Error fetching data:', err)
      error.value = err.message || 'Failed to load data'
    } finally {
      isLoading.value = false
    }
  }

  // Helper functions
  const getStudentById = (studentId) => {
    return students.value.find(s => s.id === studentId) || {}
  }

  const getUserName = (userId) => {
    const user = userMap.value[userId]
    return user ? (user.name || user.email || userId) : userId
  }

  const getCaseManagerName = (caseManagerId) => {
    if (!caseManagerId) return 'N/A'
    const user = userMap.value[caseManagerId]
    return user ? (user.name || user.email || caseManagerId) : caseManagerId
  }

  // Helper function to get case manager ID from nested structure
  const getCaseManagerId = (student) => {
    return student.app?.studentData?.caseManagerId || 
           student.caseManagerId || 
           student.casemanager_id
  }

  // Helper function to get schedule data from nested structure
  const getSchedule = (student) => {
    // Check Aeries schedule structure first (direct schedule object)
    if (student.schedule) {
      return student.schedule
    }
    
    // Check new nested structure
    if (student.app?.schedule?.periods) {
      return student.app.schedule.periods
    }
    
    // Check Aeries schedule.periods structure (your current format)
    if (student.aeries?.schedule?.periods) {
      return student.aeries.schedule.periods
    }
    
    // Check legacy Aeries schedule structure
    if (student.aeries?.schedule) {
      return student.aeries.schedule
    }
    
    return null
  }

  // Auto-load data on mount
  onMounted(() => {
    fetchData()
  })

  // Watch for user role changes and reload data accordingly
  watch(
    () => currentUser.value?.role,
    async (newRole, oldRole) => {
      if (newRole && newRole !== oldRole) {
        // Reload students with new role
        const user = currentUser.value
        if (user) {
          const roleBasedStudents = await loadStudents()
          setStudents(roleBasedStudents)
          
          // Run security test
          const securityTest = quickSecurityTest(roleBasedStudents, user)
          if (!securityTest.isSecure) {
            console.error('🚨 SECURITY VIOLATION DETECTED:', securityTest.violations)
          }
        }
      }
    },
    { immediate: false }
  )

  return {
    // State
    isLoading,
    error,
    
    // Data
    students,
    userMap,
    userList,
    userMapObj,
    caseManagers,
    caseManagersWithCounts,
    teacherList,
    userRoles,
    aideAssignment,
    feedbackForms,
    formsLoading,
    paraeducators,
    serviceProviders,
    
    // Computed
    currentUser,
    isAdmin,
    showProviderView,
    
    // Methods
    fetchData,
    getStudentById,
    getUserName,
    getCaseManagerName,
    getCaseManagerId,
    getSchedule,
    shouldAideSeeStudent,
    
    // Schedule utilities (co-teaching support)
    getTeacherIdFromPeriod,
    getCoTeachingCaseManagerFromPeriod,
    getAllTeacherIdsFromSchedule,
    getCoTeachingCaseManagersFromSchedule,
    isCoTeachingCaseManager,
    
    // Navigation
    router
  }
} 