import { computed, watch } from 'vue'
import { useBaseRoleView } from './useBaseRoleView'
import { getDisplayValue } from '@/utils/studentUtils'

export function useAdministrator504View(studentData, filterData) {
  const baseView = useBaseRoleView(studentData, filterData)
  const currentUserId = computed(() => baseView.currentUser.value?.uid)

  // Provide two options: CM (caseload) and IEP/504 only
  const providerViewOptions = computed(() => [
    { value: 'case_manager', label: 'CM' },
    { value: 'iep_504_all', label: '*' }
  ])

  // Default to 'case_manager' if no valid providerView is set
  watch(providerViewOptions, (options) => {
    const defaultValue = 'case_manager'
    const values = options.map(o => o.value)
    if (!values.includes(filterData.currentFilters.providerView)) {
      filterData.currentFilters.providerView = defaultValue
      filterData.applyFilters()
    }
  }, { immediate: true })

  // Filter visible students based on the selected provider view
  const visibleStudents = computed(() => {
    if (!currentUserId.value) return []
    const baseStudents = baseView.visibleStudents.value
    const providerView = filterData.currentFilters.providerView
    
    switch (providerView) {
      case 'case_manager':
        return baseView.getProviderViewStudents(baseStudents, currentUserId.value, 'case_manager')
      case 'iep_504_all':
        return baseStudents.filter(student => {
          const plan = getDisplayValue(student, 'plan')
          return plan === 'IEP' || plan === '504'
        })
      default:
        return []
    }
  })

  // Group for class view
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

  return {
    ...baseView,
    visibleStudents,
    studentsByPeriod,
    providerViewOptions,
    showProviderView: true
  }
}