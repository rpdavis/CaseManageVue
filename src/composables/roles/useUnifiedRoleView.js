import { computed, watch } from 'vue'
import { useBaseRoleView } from './useBaseRoleView'
import { 
  RoleUtils, 
  PERMISSIONS, 
  ACCESS_PATTERN_FUNCTIONS
} from './roleConfig'
import { getDisplayValue } from '@/utils/studentUtils'

/**
 * Unified Role View Composable
 * 
 * This composable replaces all individual role view files with a single,
 * configuration-driven approach that eliminates code duplication and
 * improves maintainability.
 */
export function useUnifiedRoleView(studentData, filterData) {
  const baseView = useBaseRoleView(studentData, filterData)
  const currentUserId = computed(() => baseView.currentUser.value?.uid)
  const currentRole = computed(() => baseView.currentUser.value?.role || 'guest')
  
  console.log('🔍 UNIFIED ROLE VIEW: Composable initialized for role:', currentRole.value)

  // ─── PROVIDER VIEW CONFIGURATION ────────────────────────────────────────────
  const providerViewOptions = computed(() => {
    return RoleUtils.getProviderViewOptions(currentRole.value)
  })

  // Set default provider view when options change
  watch(providerViewOptions, (options) => {
    if (options.length > 0) {
      const defaultValue = RoleUtils.getDefaultProviderView(currentRole.value)
      const validValues = options.map(o => o.value)
      
      if (!validValues.includes(filterData.currentFilters.providerView)) {
        filterData.currentFilters.providerView = defaultValue
        filterData.applyFilters()
      }
    }
  }, { immediate: true })

  // ─── STUDENT FILTERING LOGIC ────────────────────────────────────────────────
  const visibleStudents = computed(() => {
    console.log('🔍 UNIFIED ROLE VIEW: visibleStudents computed called for role:', currentRole.value)
    if (!currentUserId.value) {
      console.log('🔍 UNIFIED ROLE VIEW: No currentUserId, returning empty array')
      return []
    }
    
    const baseStudents = baseView.visibleStudents.value
    const providerView = filterData.currentFilters.providerView
    const role = currentRole.value
    
    console.log('🔍 UNIFIED ROLE VIEW: Processing students:', {
      role,
      baseStudentsCount: baseStudents.length,
      providerView,
      currentUserId: currentUserId.value
    })

    // Special handling for roles that use database-level filtering (Pattern 1)
    // Paraeducators, teachers, and service providers get their students from database queries - no additional filtering needed
    if (role === 'paraeducator' || role === 'teacher' || role === 'service_provider') {
      console.log(`🔍 ${role.toUpperCase()} ROLE VIEW: Received ${baseStudents.length} students from database`)
      console.log(`🔍 ${role.toUpperCase()} ROLE VIEW: Student names:`, baseStudents.map(s =>
        `${s.app?.studentData?.firstName || 'Unknown'} ${s.app?.studentData?.lastName || 'Unknown'}`
      ))
      console.log(`🔍 ${role.toUpperCase()} ROLE VIEW: Returning students directly (no provider view filtering)`)
      return baseStudents
    }
    
    // Special handling for other roles without provider views
    if (!providerView || providerView === '') {
      // For other roles without provider views, show all accessible students
      return baseStudents.filter(student => 
        RoleUtils.canAccessStudent(currentUserId.value, role, student, studentData)
      )
    }

    // Apply provider view filtering
    switch (providerView) {
      case 'case_manager':
        return baseStudents.filter(student => 
          ACCESS_PATTERN_FUNCTIONS.case_manager(currentUserId.value, student, studentData)
        )
      
      case 'service_provider':
        return baseStudents.filter(student => 
          ACCESS_PATTERN_FUNCTIONS.teacher(currentUserId.value, student, studentData)
        )
      
      case 'all':
        // Show students based on role's access patterns
        return baseStudents.filter(student => 
          RoleUtils.canAccessStudent(currentUserId.value, role, student, studentData)
        )
      
      case 'iep_all':
        if (role === 'sped_chair') {
          return baseStudents.filter(student => 
            ACCESS_PATTERN_FUNCTIONS.all_iep(currentUserId.value, student, studentData)
          )
        }
        return []
      
      case 'all_iep':
        // CM+SP view: students they case manage OR provide services to
        return baseStudents.filter(student => {
          const isCaseManager = ACCESS_PATTERN_FUNCTIONS.case_manager(currentUserId.value, student, studentData)
          const isServiceProvider = ACCESS_PATTERN_FUNCTIONS.teacher(currentUserId.value, student, studentData)
          return isCaseManager || isServiceProvider
        })
      
      case 'iep_504_all':
        if (role === 'administrator_504_CM' || role === 'admin_504') {
          return baseStudents.filter(student => 
            ACCESS_PATTERN_FUNCTIONS.all_iep_504(currentUserId.value, student, studentData)
          )
        }
        return []
      
      default:
        console.warn(`Unknown provider view: ${providerView}`)
        return []
    }
  })

  // ─── PERMISSION COMPUTED PROPERTIES ─────────────────────────────────────────
  const canEditAllStudents = computed(() => {
    return RoleUtils.hasPermission(currentRole.value, PERMISSIONS.CAN_EDIT_ALL_STUDENTS)
  })

  const canEditOwnStudents = computed(() => {
    return RoleUtils.hasPermission(currentRole.value, PERMISSIONS.CAN_EDIT_OWN_STUDENTS)
  })

  const canViewAllStudents = computed(() => {
    return RoleUtils.hasPermission(currentRole.value, PERMISSIONS.CAN_VIEW_ALL_STUDENTS)
  })

  const canManageUsers = computed(() => {
    return RoleUtils.hasPermission(currentRole.value, PERMISSIONS.CAN_MANAGE_USERS)
  })

  const canManageAides = computed(() => {
    return RoleUtils.hasPermission(currentRole.value, PERMISSIONS.CAN_MANAGE_AIDES)
  })

  const canAccessTesting = computed(() => {
    return RoleUtils.hasPermission(currentRole.value, PERMISSIONS.CAN_ACCESS_TESTING)
  })

  const canAccessTestingPartial = computed(() => {
    return canAccessTesting.value // Legacy compatibility
  })

  const hasAnyTestingAccess = computed(() => {
    return canAccessTesting.value // Legacy compatibility
  })

  const canAccessFilters = computed(() => {
    return RoleUtils.hasPermission(currentRole.value, PERMISSIONS.CAN_ACCESS_FILTERS)
  })

  const showProviderView = computed(() => {
    return RoleUtils.hasPermission(currentRole.value, PERMISSIONS.SHOW_PROVIDER_VIEW)
  })

  const canUseClassView = computed(() => {
    return RoleUtils.hasPermission(currentRole.value, PERMISSIONS.CAN_USE_CLASS_VIEW)
  })

  // ─── STUDENT ACCESS FUNCTIONS ───────────────────────────────────────────────
  const canEditStudent = (student) => {
    if (!currentUserId.value || !student) return false
    
    const role = currentRole.value
    
    // Hide edit button for paraeducators and teachers
    if (role === 'paraeducator' || role === 'teacher') {
      return false
    }
    
    // Case managers can only edit students in their own caseload
    if (role === 'case_manager') {
      return studentData.getCaseManagerId(student) === currentUserId.value
    }
    
    // Service providers can only edit students on their caseload
    if (role === 'service_provider') {
      return student.app?.staffIds?.includes(currentUserId.value)
    }
    
    // Roles that can edit ALL students
    const canEditAllRoles = ['admin', 'school_admin', 'staff_edit', 'admin_504', 'sped_chair']
    return canEditAllRoles.includes(role)
  }

  const canSendFeedback = (student) => {
    if (!currentUserId.value || !student) return false
    return RoleUtils.canSendFeedback(currentUserId.value, currentRole.value, student, studentData)
  }

  // ─── CLASS VIEW GROUPING ────────────────────────────────────────────────────
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

  // ─── VIEW MODE MANAGEMENT ───────────────────────────────────────────────────
  const setViewMode = (mode) => {
    // If trying to switch to class view while it's disabled, switch to list instead
    if (mode === 'class' && !canUseClassView.value) {
      filterData.currentFilters.viewMode = 'list'
      return
    }
    filterData.currentFilters.viewMode = mode
  }

  // ─── ADDITIONAL ROLE-SPECIFIC COMPUTED PROPERTIES ───────────────────────────
  
  // Teacher-specific groupings
  const studentsByAccommodation = computed(() => {
    if (currentRole.value !== 'teacher') return { instruction: [], assessment: [] }
    
    const groups = {
      instruction: [],
      assessment: []
    }
    visibleStudents.value.forEach(student => {
      if (student.app?.accommodations?.instruction) {
        groups.instruction.push(student)
      }
      if (student.app?.accommodations?.assessment) {
        groups.assessment.push(student)
      }
    })
    return groups
  })

  const studentsByServiceProvider = computed(() => {
    if (currentRole.value !== 'teacher') return {}
    
    const groups = {}
    visibleStudents.value.forEach(student => {
      const providers = student.app?.providers || {}
      Object.entries(providers).forEach(([providerType, providerId]) => {
        if (providerId) {
          if (!groups[providerId]) {
            groups[providerId] = {
              provider: studentData.getUserName(providerId),
              providerType,
              students: []
            }
          }
          groups[providerId].students.push(student)
        }
      })
    })
    return groups
  })

  // Teacher permissions
  const canViewAccommodations = computed(() => currentRole.value === 'teacher')
  const canViewBasicInfo = computed(() => currentRole.value === 'teacher')
  const canViewServiceProviders = computed(() => currentRole.value === 'teacher')
  const canViewDates = computed(() => false) // Teachers can't see dates
  const canEditStudents = computed(() => false) // Teachers can't edit students

  // ─── RETURN UNIFIED INTERFACE ───────────────────────────────────────────────
  return {
    // Base view functionality
    ...baseView,
    
    // Override with unified logic
    visibleStudents,
    studentsByPeriod,
    providerViewOptions,
    showProviderView,
    
    // Permission computed properties
    canEditAllStudents,
    canEditOwnStudents,
    canViewAllStudents,
    canManageUsers,
    canManageAides,
    canAccessTesting,
    canAccessTestingPartial,
    hasAnyTestingAccess,
    canAccessFilters,
    canUseClassView,
    
    // Student access functions
    canEditStudent,
    canSendFeedback,
    
    // View mode management
    setViewMode,
    
    // Role-specific computed properties
    studentsByAccommodation,
    studentsByServiceProvider,
    canViewAccommodations,
    canViewBasicInfo,
    canViewServiceProviders,
    canViewDates,
    canEditStudents,
    
    // Current state
    currentRole,
    currentUserId
  }
} 