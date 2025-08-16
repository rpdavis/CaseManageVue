import { ref, computed, reactive, watch } from 'vue'
import { getDisplayValue } from '@/utils/studentUtils'

export function useStudentFilters(studentData) {
  const {
    students,
    currentUser,
    shouldAideSeeStudent,
    userMap,
    getCaseManagerId,
    getSchedule,
    aideAssignment
  } = studentData

  // Filter state
  const showFilters = ref(false)
  const filteredStudents = ref([])

  // Current filters state
  const currentFilters = reactive({
    sortBy: 'firstName',
    cm: 'all',
    teacher: 'all',
    paraeducator: 'all',
    plan: 'all',
    serviceProvider: 'all',
    search: '',
    providerView: 'all',
    viewMode: 'list'
  })

  // Debounced search
  let debounceTimer = null
  const debouncedApplyFilters = () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      applyFilters()
    }, 300) // 300ms delay
  }

  // Filter management
  const toggleFilters = () => {
    // If we're closing the filters panel, reset the filters
    if (showFilters.value) {
      clearFilters()
    }
    showFilters.value = !showFilters.value
  }

  const clearFilters = () => {
    currentFilters.sortBy = 'firstName'
    currentFilters.cm = 'all'
    currentFilters.teacher = 'all'
    currentFilters.paraeducator = 'all'
    currentFilters.plan = 'all'
    currentFilters.serviceProvider = 'all'
    currentFilters.search = ''
    currentFilters.providerView = 'all'
    currentFilters.viewMode = 'list'
    applyFilters()
  }

  // Helper function to get current filters (for paraeducator and teacher filtering)
  const getCurrentFilters = () => {
    return {
      paraeducator: currentFilters.paraeducator,
      teacher: currentFilters.teacher,
      providerView: currentFilters.providerView
    }
  }

  // Main filtering function
  const applyFilters = (filters = currentFilters) => {
    console.log('🔍 FILTER DEBUG: applyFilters called with students.value.length:', students.value.length)
    console.log('🔍 FILTER DEBUG: currentUser:', currentUser.value?.role, currentUser.value?.uid)
    
    let result = students.value

    // Apply provider view filtering (for roles that have provider views)
    // Skip provider view filtering for roles that don't have provider view options
    const userRole = currentUser.value?.role
    const rolesWithoutProviderViews = ['admin', 'school_admin']
    
    console.log('🔍 FILTER DEBUG: Provider view filtering check:', {
      userRole,
      providerView: filters.providerView,
      shouldSkip: rolesWithoutProviderViews.includes(userRole),
      resultLengthBefore: result.length
    })
    
    if (!rolesWithoutProviderViews.includes(userRole) && filters.providerView === 'case_manager') {
      console.log('🔍 FILTER DEBUG: Applying case_manager filter')
      result = result.filter(s => getCaseManagerId(s) === currentUser.value?.uid)
      console.log('🔍 FILTER DEBUG: After case_manager filter:', result.length)
    } else if (!rolesWithoutProviderViews.includes(userRole) && filters.providerView === 'service_provider') {
      console.log('🔍 FILTER DEBUG: Applying service_provider filter')
      result = result.filter(s => {
        // Check if user is in schedule (handle both simple and complex structures)
        const schedule = getSchedule(s)
        const isInSchedule = schedule ? Object.entries(schedule).some(([period, data]) => {
          if (typeof data === 'string') {
            return data === currentUser.value?.uid
          } else if (data && typeof data === 'object') {
            // Treat service providers as teachers in class view: primary or co-teach
            return data.teacherId === currentUser.value?.uid || (data.coTeaching?.caseManagerId === currentUser.value?.uid)
          }
          return false
        }) : false
        
        const isInServices = (s.services || []).some(service => service.includes(currentUser.value?.uid))
        const isNotCaseManager = getCaseManagerId(s) !== currentUser.value?.uid
        return (isInSchedule || isInServices) && isNotCaseManager
      })
      console.log('🔍 FILTER DEBUG: After service_provider filter:', result.length)
    } else {
      console.log('🔍 FILTER DEBUG: Skipping provider view filtering for role:', userRole)
    }

    // Apply role-based filtering
    // Note: For case managers, the role-based view (useCaseManagerView) handles provider view filtering
    // so we skip the general filtering here to avoid conflicts
    // Note: For paraeducators, students are already filtered at database level via staffIds or aideSchedules
    // so no additional filtering is needed
    if (currentUser.value?.role === 'paraeducator') {
      // Students are already filtered at database level - no additional filtering needed
      console.log('🔍 FILTER DEBUG: Paraeducator - using database-filtered students, no additional filtering')
    }

    // Apply text search
    if (filters.search) {
      const search = filters.search.toLowerCase()
      result = result.filter(s => {
        const firstName = getDisplayValue(s, 'firstName') || ''
        const lastName = getDisplayValue(s, 'lastName') || ''
        return `${firstName} ${lastName}`.toLowerCase().includes(search)
      })
    }
    
    // Apply case manager filter
    if (filters.cm && filters.cm !== 'all') {
      result = result.filter(s => getCaseManagerId(s) === filters.cm)
    }

    // Apply teacher filter
    if (filters.teacher && filters.teacher !== 'all') {
      result = result.filter(s => {
        const schedule = getSchedule(s)
        if (!schedule) return false
        
        // Match teacher either as primary teacher or co-teacher (case manager in coTeaching)
        return Object.entries(schedule).some(([period, data]) => {
          if (typeof data === 'string') {
            // Simple structure: period -> teacherId
            return data === filters.teacher
          } else if (data && typeof data === 'object') {
            // Complex structure: period -> { teacherId, coTeaching: { caseManagerId } }
            const primaryMatch = data.teacherId === filters.teacher
            const coTeachMatch = (data.coTeaching?.caseManagerId) === filters.teacher
            return primaryMatch || coTeachMatch
          }
          return false
        })
      })
    }

    // Apply paraeducator filter - use the same query approach as paraeducator view
    if (filters.paraeducator && filters.paraeducator !== 'all') {
      console.log('🔍 FILTER DEBUG: Applying paraeducator filter for:', filters.paraeducator)
      
      // Get the aide's assigned student IDs from aideSchedules collection (same as paraeducator query)
      const aideData = aideAssignment.value[filters.paraeducator]
      if (aideData) {
        console.log('🔍 FILTER DEBUG: Found aide data:', aideData)
        
        // Get student IDs the same way as getParaeducatorStudents query
        let assignedStudentIds = []
        
        // Primary: Use studentIds array if available
        if (aideData.studentIds && Array.isArray(aideData.studentIds)) {
          assignedStudentIds = aideData.studentIds
          console.log('🔍 FILTER DEBUG: Using studentIds array:', assignedStudentIds)
        }
        // Fallback: Use directAssignment if studentIds not available
        else if (aideData.directAssignment) {
          assignedStudentIds = Array.isArray(aideData.directAssignment) 
            ? aideData.directAssignment 
            : [aideData.directAssignment]
          console.log('🔍 FILTER DEBUG: Using directAssignment as fallback:', assignedStudentIds)
        }
        
        // Filter to only students assigned to this aide
        result = result.filter(s => assignedStudentIds.includes(s.id))
        console.log('🔍 FILTER DEBUG: After paraeducator filter:', result.length, 'students')
      } else {
        console.log('🔍 FILTER DEBUG: No aide data found for:', filters.paraeducator)
        result = [] // No aide data means no students
      }
    }

    // Apply plan filter
    if (filters.plan && filters.plan !== 'all') {
      result = result.filter(s => {
        const studentPlan = getDisplayValue(s, 'plan')
        return studentPlan === filters.plan
      })
    }

    // Apply service provider filter
    if (filters.serviceProvider && filters.serviceProvider !== 'all') {
      result = result.filter(s => {
        // Check if the student has the selected service provider assigned
        const providers = s.app?.providers || {}
        
        // Look through all provider fields to see if the selected provider is assigned
        for (const [fieldName, providerId] of Object.entries(providers)) {
          if (providerId === filters.serviceProvider) {
            return true
          }
        }
        
        // Also check legacy provider fields (for backward compatibility)
        const legacyFields = [
          'speechId', 'speech_id', 'otId', 'ot_id', 'mhId', 'mh_id', 
          'ptId', 'pt_id', 'scId', 'sc_id', 'trId', 'tr_id',
          'audId', 'aud_id', 'viId', 'vi_id', 'atId', 'at_id',
          'dhhId', 'dhh_id', 'omId', 'om_id', 'bisId', 'bis_id',
          'hnId', 'hn_id', 'swId', 'sw_id'
        ]
        
        return legacyFields.some(field => s[field] === filters.serviceProvider)
      })
    }

    // Apply sorting
    if (filters.sortBy) {
      result.sort((a, b) => {
        const valA = getDisplayValue(a, filters.sortBy) || ''
        const valB = getDisplayValue(b, filters.sortBy) || ''
        
        // Handle date sorting
        if (['reviewDate', 'reevalDate', 'meetingDate'].includes(filters.sortBy)) {
          const dateA = valA ? new Date(valA).getTime() : 0
          const dateB = valB ? new Date(valB).getTime() : 0
          return dateA - dateB
        }
        
        return valA.toString().toLowerCase().localeCompare(valB.toString().toLowerCase())
      })
    }

    // Store the filtered results
    filteredStudents.value = result
    console.log('🔍 FILTER DEBUG: applyFilters completed. filteredStudents.value.length:', filteredStudents.value.length)
  }

  // Watch for data changes and reapply filters
  watch(
    () => [students.value, currentUser.value],
    () => {
      console.log('🔍 FILTER DEBUG: Watcher triggered. students.value.length:', students.value.length)
      if (students.value.length > 0) {
        console.log('🔍 FILTER DEBUG: Calling applyFilters from watcher')
        applyFilters()
      } else {
        console.log('🔍 FILTER DEBUG: No students to filter')
      }
    },
    { deep: true }
  )

  return {
    // State
    showFilters,
    filteredStudents,
    currentFilters,
    
    // Methods
    toggleFilters,
    clearFilters,
    applyFilters,
    debouncedApplyFilters,
    getCurrentFilters
  }
} 