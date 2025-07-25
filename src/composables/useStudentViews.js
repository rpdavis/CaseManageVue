import { ref, computed, watch } from 'vue'
import { getDisplayValue } from '@/utils/studentUtils'
import { setClassViewPeriods } from '@/utils/debugSummary'

export function useStudentViews(studentData, filterData, roleBasedStudents = null) {
  const {
    aideAssignment,
    getCaseManagerId,
    getSchedule,
    standardizeScheduleAccess,
    currentUser
  } = studentData

  const {
    filteredStudents,
    currentFilters,
    getCurrentFilters
  } = filterData

  // Use role-based students if provided (for security), otherwise fall back to general filtered students
  const studentsToUse = roleBasedStudents || filteredStudents

  // View mode state
  const currentViewMode = ref('list')

  // Watch for view mode changes in filters
  watch(
    () => currentFilters.viewMode,
    (newMode) => {
      currentViewMode.value = newMode || 'list'
    }
  )

  // Get students for testing view (only those with separate setting)
  const testingViewStudents = computed(() => {
    return studentsToUse.value.filter(student => {
      // Check flag2 (primary field) and separateSetting (alias) for backward compatibility
      return student.app?.flags?.flag2 || student.app?.flags?.separateSetting || student.separateSetting || student.flag2 || false
    })
  })

  // Group students by class (period) - SECURITY: Use role-based students
  const studentsByClass = computed(() => {
    const groups = {}
    
    // Only process if we're in class view mode
    if (currentViewMode.value !== 'class') {
      return groups
    }
    
    // Get current user ID
    const currentUserId = currentUser.value?.uid
    if (!currentUserId) {
      console.log('🔴 studentsByClass: No current user ID')
      return groups
    }
    
    console.log('🔵 studentsByClass: Current user ID:', currentUserId)
    
    const currentRole = studentData.currentUser.value?.role
    
    // For class view, case managers should see ALL their accessible students
    // (not filtered by provider view), then filter by periods they teach
    let studentsForClassView
    if (currentRole === 'case_manager') {
      studentsForClassView = studentData.students.value // Raw database students (all 4)
      console.log('🔵 studentsByClass: Case manager - using raw database students:', studentsForClassView.length)
    } else {
      studentsForClassView = studentsToUse.value // Provider-filtered students  
      console.log('🔵 studentsByClass: Other role - using provider-filtered students:', studentsForClassView.length)
    }
    
    // Get current filters to check for paraeducator filtering
    const currentFilters = getCurrentFilters()
    const isParaeducatorFilter = currentFilters.paraeducator && currentFilters.paraeducator !== 'all'
    
    studentsForClassView.forEach(student => {
      const schedule = getSchedule(student) || {}
      // Debug: print full schedule object to inspect coTeaching structure
      console.log(`🕵️ studentsByClass full schedule for ${student.app?.studentData?.firstName}:`, schedule)
      
      Object.entries(schedule).forEach(([period, data]) => {
        // Extract teacherId from both simple and complex schedule structures
        let teacherId, coTeacherId
        if (typeof data === 'string') {
          teacherId = data
        } else if (data && typeof data === 'object') {
          teacherId   = data.teacherId
          coTeacherId = data.coTeaching?.caseManagerId
          // Debug: if coTeaching exists, log its content
          if (data.coTeaching) {
            console.log(`🕵️ studentsByClass coTeaching data for ${student.app?.studentData?.firstName} in period ${period}:`, data.coTeaching)
          }
        } else {
          return // Skip if no valid teacherId
        }
        
        // Determine if student should be included in this period based on role and filters
        let shouldIncludeStudentInPeriod = false
        
        // Get current filters to check for teacher/paraeducator filtering
        const currentFilters = getCurrentFilters()
        const isTeacherFilter = currentFilters.teacher && currentFilters.teacher !== 'all'
        const isParaeducatorFilter = currentFilters.paraeducator && currentFilters.paraeducator !== 'all'
        
        // Role-specific logic for including students in periods
        if (currentRole === 'paraeducator') {
          // Paraeducators see students in periods where they're assigned to help teachers
          const aideData = aideAssignment.value[currentUserId]
          if (aideData?.classAssignment && aideData.classAssignment[period]) {
            const aideTeacherIds = Array.isArray(aideData.classAssignment[period]) 
              ? aideData.classAssignment[period] 
              : [aideData.classAssignment[period]]
            shouldIncludeStudentInPeriod = aideTeacherIds.includes(teacherId)
          }
        } else if (['admin', 'administrator'].includes(currentRole)) {
          // Admins can see periods when filtering by specific teacher or paraeducator
          if (isTeacherFilter) {
            shouldIncludeStudentInPeriod = teacherId === currentFilters.teacher || coTeacherId === currentFilters.teacher
          } else if (isParaeducatorFilter) {
            const aideData = aideAssignment.value[currentFilters.paraeducator]
            if (aideData?.classAssignment && aideData.classAssignment[period]) {
              const aideTeacherIds = Array.isArray(aideData.classAssignment[period]) 
                ? aideData.classAssignment[period] 
                : [aideData.classAssignment[period]]
              shouldIncludeStudentInPeriod = aideTeacherIds.includes(teacherId)
            }
          } else {
            // Admin with no specific filter - include all periods (shouldn't normally happen due to isClassViewDisabled)
            shouldIncludeStudentInPeriod = true
          }
        } else {
          // Teachers, case managers, service providers, etc. - only show periods they teach/co-teach
          shouldIncludeStudentInPeriod = teacherId === currentUserId || coTeacherId === currentUserId
        }
        
        if (!shouldIncludeStudentInPeriod) {
          return // Skip this period - user doesn't have access to it
        }
        
        if (!groups[period]) {
          groups[period] = []
        }
        
        // Check if student is already in this period group to avoid duplicates
        const studentAlreadyInPeriod = groups[period].some(s => s.id === student.id)
        if (studentAlreadyInPeriod) {
          return // Skip - student already added to this period
        }
        
        // Add student to this period
        groups[period].push(student)
      })
    })
    
    console.log('🟢 studentsByClass: Final groups:', Object.keys(groups).map(p => `Period ${p}: ${groups[p].length} students`))
    
    // Track class view periods
    setClassViewPeriods(groups)
    
    // Remove periods with no students
    Object.keys(groups).forEach(period => {
      if (groups[period].length === 0) {
        delete groups[period]
      }
    })
    
    // Sort periods numerically
    return Object.keys(groups)
      .sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ''))
        const numB = parseInt(b.replace(/\D/g, ''))
        return numA - numB
      })
      .reduce((obj, key) => {
        obj[key] = groups[key]
        return obj
      }, {})
  })

  // Get directly assigned students for paraeducator filter
  const directAssignmentStudents = computed(() => {
    const currentFilters = getCurrentFilters()
    const currentRole = studentData.currentUser.value?.role
    const currentUserId = studentData.currentUser.value?.uid
    
    let targetParaeducatorId = null
    
    // Determine which paraeducator's direct assignments to show
    if (currentRole === 'paraeducator') {
      // Paraeducator viewing their own assignments
      targetParaeducatorId = currentUserId
    } else {
      // Admin filtering by a specific paraeducator
      const isParaeducatorFilter = currentFilters.paraeducator && currentFilters.paraeducator !== 'all'
      if (!isParaeducatorFilter) {
        return []
      }
      targetParaeducatorId = currentFilters.paraeducator
    }
    
    if (!targetParaeducatorId) {
      return []
    }
    
    const aideData = aideAssignment.value[targetParaeducatorId]
    if (!aideData || !aideData.directAssignment) {
      console.log('🔍 directAssignmentStudents: No aide data or direct assignment for', targetParaeducatorId)
      return []
    }
    
    const directStudentIds = Array.isArray(aideData.directAssignment) 
      ? aideData.directAssignment 
      : [aideData.directAssignment]
    
    console.log('🔍 directAssignmentStudents: Direct student IDs:', directStudentIds)
    console.log('🔍 directAssignmentStudents: Available students:', studentsToUse.value.length)
    
    const directStudents = studentsToUse.value.filter(s => directStudentIds.includes(s.id))
    console.log('🔍 directAssignmentStudents: Found direct assignment students:', directStudents.length)
    
    return directStudents
  })

  // Group students by case manager
  const studentsByCaseManager = computed(() => {
    const groups = {}
    studentsToUse.value.forEach(student => {
      const cmId = getCaseManagerId(student)
      if (cmId) {
        if (!groups[cmId]) {
          groups[cmId] = []
        }
        groups[cmId].push(student)
      }
    })
    return groups
  })

  // Set view mode
  const setViewMode = (mode) => {
    currentViewMode.value = mode
    currentFilters.viewMode = mode
  }

  return {
    // State
    currentViewMode,
    
    // Computed data
    studentsByClass,
    directAssignmentStudents,
    studentsByCaseManager,
    testingViewStudents,
    
    // Methods
    setViewMode
  }
} 