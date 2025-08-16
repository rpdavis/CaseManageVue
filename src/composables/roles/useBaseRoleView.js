import { computed, watch } from 'vue'
import { getDisplayValue } from '@/utils/studentUtils'
import { usePeriodLabels } from '@/composables/usePeriodLabels'

export function useBaseRoleView(studentData, filterData) {
  const {
    students,
    userMapObj,
    currentUser,
    getCaseManagerId,
    getSchedule,
    getUserName,
    formatDate
  } = studentData

  const { getLabel } = usePeriodLabels()

  const {
    filteredStudents,
    currentFilters,
    applyFilters
  } = filterData

  // Standardized Schedule Handling
  const standardizeScheduleAccess = (schedule, userId) => {
    if (!schedule) return { periods: {}, isTeacher: false, isCoTeacher: false }
    
    let isTeacher = false
    let isCoTeacher = false
    const periods = {}
    
    Object.entries(schedule).forEach(([period, data]) => {
      // Handle both string and object formats
      const teacherId = typeof data === 'string' ? data : data?.teacherId
      const coTeachingData = typeof data === 'object' ? data?.coTeaching : null
      const coTeachingCM = coTeachingData?.caseManagerId
      
      periods[period] = {
        teacherId,
        coTeaching: coTeachingData,
        coTeachingCM,
        teacherName: getUserName(teacherId),
        coTeacherName: coTeachingCM ? getUserName(coTeachingCM) : null,
        label: getLabel(period)
      }
      
      if (teacherId === userId) isTeacher = true
      if (coTeachingCM === userId) isCoTeacher = true
    })
    
    return { periods, isTeacher, isCoTeacher }
  }

  // Standardized Provider View Filtering
  const getProviderViewStudents = (students, userId, providerView) => {
    if (!students || !userId) return []

    switch (providerView) {
      case 'case_manager':
        return students.filter(student => 
          getCaseManagerId(student) === userId
        )
      case 'service_provider':
        return students.filter(student => {
          const schedule = getSchedule(student)
          
          // Check if user teaches this student
          const isTeacher = schedule ? Object.values(schedule).some(periodData => {
            if (typeof periodData === 'string') {
              return periodData === userId
            } else if (periodData && typeof periodData === 'object') {
              return periodData.teacherId === userId || 
                     periodData.coTeaching?.caseManagerId === userId
            }
            return false
          }) : false
          
          return isTeacher
        })
      case 'all':
        return students
      default:
        console.warn(`Unknown provider view: ${providerView}`)
        return []
    }
  }

  // Standardized Class View Students
  const getClassViewStudents = (students, userId) => {
    if (!students || !userId) return []
    
    return students.filter(student => {
      const { isTeacher, isCoTeacher } = standardizeScheduleAccess(getSchedule(student), userId)
      return isTeacher || isCoTeacher
    })
  }

  // Group students by period with standardized schedule
  const groupStudentsByPeriod = (students, userId) => {
    const groups = {}
    
    students.forEach(student => {
      const schedule = getSchedule(student)
      if (!schedule) return
      
      const { periods } = standardizeScheduleAccess(schedule, userId)
      
      Object.entries(periods).forEach(([period, data]) => {
        if (data.teacherId === userId || data.coTeachingCM === userId) {
          if (!groups[period]) groups[period] = []
          groups[period].push(student)
        }
      })
    })
    
    return groups
  }

  // Basic student data access with standardized filtering
  const visibleStudents = computed(() => {
    // Return filtered students directly; roles and filters govern visibility
    return filteredStudents.value || []
  })

  // Basic student info formatting
  const formatStudentName = (student) => {
    const firstName = getDisplayValue(student, 'firstName')
    const lastName = getDisplayValue(student, 'lastName')
    return `${firstName} ${lastName}`
  }

  const formatStudentInfo = (student) => {
    return {
      name: formatStudentName(student),
      grade: getDisplayValue(student, 'grade'),
      plan: getDisplayValue(student, 'plan'),
      caseManager: getUserName(getCaseManagerId(student))
    }
  }

  // Basic date formatting
  const formatDates = (student) => {
    return {
      reviewDate: formatDate(getDisplayValue(student, 'reviewDate')),
      reevalDate: formatDate(getDisplayValue(student, 'reevalDate')),
      meetingDate: formatDate(getDisplayValue(student, 'meetingDate'))
    }
  }

  // Basic schedule access
  const getStudentSchedule = (student) => {
    const schedule = getSchedule(student)
    if (!schedule) return {}

    return Object.entries(schedule).reduce((acc, [period, teacherId]) => {
      acc[period] = {
        teacherId,
        teacherName: getUserName(teacherId)
      }
      return acc
    }, {})
  }

  // Basic filtering
  const filterByName = (searchTerm) => {
    currentFilters.search = searchTerm
    applyFilters()
  }

  const filterByCaseManager = (caseManagerId) => {
    currentFilters.cm = caseManagerId
    applyFilters()
  }

  const filterByTeacher = (teacherId) => {
    currentFilters.teacher = teacherId
    applyFilters()
  }

  // View mode management
  const setViewMode = (mode) => {
    currentFilters.viewMode = mode
    applyFilters()
  }

  // Basic student grouping
  const groupStudentsByGrade = computed(() => {
    const groups = {}
    visibleStudents.value.forEach(student => {
      const grade = getDisplayValue(student, 'grade')
      if (!groups[grade]) groups[grade] = []
      groups[grade].push(student)
    })
    return groups
  })

  const groupStudentsByPlan = computed(() => {
    const groups = {}
    visibleStudents.value.forEach(student => {
      const plan = getDisplayValue(student, 'plan')
      if (!groups[plan]) groups[plan] = []
      groups[plan].push(student)
    })
    return groups
  })

  // UI Permission Logic - Common across all roles
  const isClassViewDisabled = computed(() => {
    const role = currentUser.value?.role
    const filters = currentFilters
    
    // Teachers and paraeducators always have access to class view
    if (['teacher', 'paraeducator'].includes(role)) {
      return false
    }
    
    // Case managers can use class view ONLY in SP mode or when filtering by teacher
    if (role === 'case_manager') {
      return filters.providerView !== 'service_provider' && filters.teacher === 'all'
    }
    
    // Sped chairs can use class view ONLY in SP mode or when filtering by teacher
    if (['sped_chair'].includes(role)) {
      return filters.providerView !== 'service_provider' && filters.teacher === 'all'
    }
    
    // Admin and staff roles can use class view when filtering by teacher or paraeducator
    if (['admin', 'school_admin', 'staff_view', 'staff_edit', 'administrator', 'admin_504', 'administrator_504_CM'].includes(role)) {
      return filters.teacher === 'all' && filters.paraeducator === 'all'
    }
    
    // Service providers can use class view when they are teaching
    if (role === 'service_provider') {
      return filters.providerView !== 'service_provider'
    }
    
    // Default to disabled for unknown roles
    return true
  })

  // Check if user has admin-level permissions
  const isAdminRole = computed(() => {
    const role = currentUser.value?.role
    return ['admin', 'school_admin', 'staff_view', 'staff_edit', 'admin_504', 'sped_chair'].includes(role)
  })

  // Check if user can access filters - only specific admin roles
  const canAccessFilters = computed(() => {
    const role = currentUser.value?.role
    // Only admin roles can access filters - BUT also allow other roles to see students (just not the filter UI)
    return ['admin', 'school_admin', 'staff_view', 'staff_edit', 'admin_504', 'sped_chair'].includes(role)
  })

  // Auto-switch to list view when class view becomes disabled
  watch(
    () => isClassViewDisabled.value,
    (isDisabled) => {
      if (isDisabled && currentFilters.viewMode === 'class') {
        console.log('🔄 Auto-switching from class view to list view because class view is now disabled')
        currentFilters.viewMode = 'list'
        applyFilters()
      }
    },
    { immediate: false }
  )

  return {
    // Data
    visibleStudents,
    currentUser,
    userMapObj,

    // Standardized Schedule Functions
    standardizeScheduleAccess,
    getProviderViewStudents,
    getClassViewStudents,
    groupStudentsByPeriod,

    // Computed groups
    groupStudentsByGrade,
    groupStudentsByPlan,

    // UI Permissions
    canAccessFilters,
    isClassViewDisabled,
    isAdminRole,

    // Formatting functions
    formatStudentName,
    formatStudentInfo,
    formatDates,
    getStudentSchedule,

    // Filter functions
    filterByName,
    filterByCaseManager,
    filterByTeacher,
    setViewMode,

    // Current state
    currentFilters,
    
    // Default provider view settings
    showProviderView: false,
    providerViewOptions: computed(() => [])
  }
} 