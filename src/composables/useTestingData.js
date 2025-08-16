import { ref, computed } from 'vue'
import { getDisplayValue } from '@/utils/studentUtils'
import { usePeriodLabels } from '@/composables/usePeriodLabels'

export function useTestingData(students, users, appSettings) {
  const { getLabel } = usePeriodLabels()
  // Get available periods from app settings
  const availablePeriods = computed(() => {
    const numPeriods = appSettings.value?.numPeriods || 7
    return Array.from({ length: numPeriods }, (_, index) => ({
        value: index.toString(), // Use index (0, 1, 2, 3, 4, 5, 6) instead of period number
      label: getLabel(index + 1), // Period numbers are 1-based
        periodIndex: index // Keep track of the actual index
      }))
  })

  // Get unique teachers from student schedules
  const availableTeachers = computed(() => {
    const teacherSet = new Set()
    
    console.log('🔍 Finding teachers from students:', students.value.length)
    
    students.value.forEach(student => {
      // Check aeries schedule structure first
      if (student.aeries?.schedule) {
        Object.values(student.aeries.schedule).forEach(period => {
          if (period && period.teacherId) {
            console.log('🔍 Found teacher ID in aeries.schedule:', period.teacherId)
            teacherSet.add(String(period.teacherId))
          }
        })
      }
      
      // Check app.schedule.periods structure
      if (student.app?.schedule?.periods) {
        Object.values(student.app.schedule.periods).forEach(teacherId => {
          if (teacherId) {
            console.log('🔍 Found teacher ID in app.schedule.periods:', teacherId)
            teacherSet.add(String(teacherId))
          }
        })
      }
      
      // Also check for direct period properties (from CSV import)
      for (let i = 1; i <= 7; i++) {
        const teacherIdField = `period${i}TeacherId`
        const teacherId = student[teacherIdField] || 
                         student.aeries?.[teacherIdField] ||
                         student.app?.[teacherIdField]
        if (teacherId) {
          console.log('🔍 Found teacher ID in', teacherIdField, ':', teacherId)
          teacherSet.add(String(teacherId))
        }
      }
    })
    
    console.log('🔍 Unique teacher IDs found:', Array.from(teacherSet))
    console.log('🔍 Users available:', users.value.length)
    
    // Convert to array and map to user objects
    // Handle both email-based IDs and numeric aeriesIds
    return Array.from(teacherSet).map(teacherId => {
      // First try to find by ID (email format)
      let user = users.value.find(u => u.id === teacherId)
      
      // If not found and teacherId is numeric, try to find by aeriesId
      if (!user && /^\d+$/.test(teacherId)) {
        user = users.value.find(u => u.aeriesId === teacherId)
      }
      
      return {
        id: teacherId,
        name: user ? (user.name || `${user.firstName} ${user.lastName}`) : `Teacher ${teacherId}`,
        actualUserId: user ? user.id : null
      }
    }).sort((a, b) => a.name.localeCompare(b.name))
  })

  // Helper function to check if a period should be excluded
  const isPeriodExcluded = (periodKey, excludedPeriods = []) => {
    // Find the index of this period in the default configuration
    let periodIndex = -1
    
    // Handle numeric periods (1, 2, 3, etc.)
    if (/^\d+$/.test(periodKey)) {
      periodIndex = parseInt(periodKey) - 1 // Convert 1-based to 0-based
    }
    // Handle "SH" period
    else if (periodKey === 'SH') {
      periodIndex = 6 // SH is at index 6
    }
    // Handle "Per1", "Per2", etc. format
    else if (periodKey.startsWith('Per')) {
      const num = periodKey.replace('Per', '')
      if (/^\d+$/.test(num)) {
        periodIndex = parseInt(num) - 1
      }
    }
    
    return excludedPeriods.includes(periodIndex.toString())
  }

  // Get students for selected teachers
  const getStudentsForTeachers = (teacherIds, excludedPeriods = []) => {
    console.log('🔍 CUSTOM TAB DEBUG: Filtering students for teachers:', teacherIds)
    console.log('🔍 CUSTOM TAB DEBUG: Total students available:', students.value.length)
    
    const filteredStudents = students.value.filter(student => {
      // Only include students with separate setting flag (flag2 or separateSetting)
      const hasSeparateSetting = student.app?.flags?.flag2 || student.app?.flags?.separateSetting || student.separateSetting || student.flag2 || false
      console.log('🔍 CUSTOM TAB DEBUG: Student', student.app?.studentData?.firstName, 'hasSeparateSetting:', hasSeparateSetting, 'flags:', student.app?.flags)
      
      if (!hasSeparateSetting) {
        return false
      }
      
      console.log('🔍 CUSTOM TAB DEBUG: Checking schedules for student', student.app?.studentData?.firstName)
      console.log('🔍 CUSTOM TAB DEBUG: Student schedule:', student.app?.schedule)
      console.log('🔍 CUSTOM TAB DEBUG: Student aeries schedule:', student.aeries?.schedule)
      
      // Check aeries schedule structure
      if (student.aeries?.schedule) {
        console.log('🔍 CUSTOM TAB DEBUG: Checking aeries schedule for', student.app?.studentData?.firstName)
        const scheduleEntries = Object.entries(student.aeries.schedule)
        for (let i = 0; i < scheduleEntries.length; i++) {
          const [periodKey, period] = scheduleEntries[i]
          console.log('🔍 CUSTOM TAB DEBUG: Aeries period', periodKey, ':', period)
          if (period && period.teacherId && teacherIds.includes(String(period.teacherId))) {
            console.log('🔍 CUSTOM TAB DEBUG: Found matching teacher in aeries schedule!')
            // Use the period key mapping instead of array index
            if (!isPeriodExcluded(periodKey, excludedPeriods)) {
              return true
            }
          }
        }
      }
      
      // Check app.schedule structure (direct schedule object)
      if (student.app?.schedule && typeof student.app.schedule === 'object') {
        console.log('🔍 CUSTOM TAB DEBUG: Checking app.schedule (direct) for', student.app?.studentData?.firstName)
        const scheduleEntries = Object.entries(student.app.schedule)
        for (let i = 0; i < scheduleEntries.length; i++) {
          const [periodKey, teacherData] = scheduleEntries[i]
          const actualTeacherId = typeof teacherData === 'object' ? teacherData.teacherId : teacherData
          console.log('🔍 CUSTOM TAB DEBUG: Direct schedule period', periodKey, ':', teacherData, 'actual teacher ID:', actualTeacherId)
          if (actualTeacherId && teacherIds.includes(String(actualTeacherId))) {
            console.log('🔍 CUSTOM TAB DEBUG: Found matching teacher in direct schedule!')
            // Use the period key mapping instead of array index
            if (!isPeriodExcluded(periodKey, excludedPeriods)) {
              return true
            }
          }
        }
      }
      
      // Check app.schedule.periods structure
      if (student.app?.schedule?.periods) {
        console.log('🔍 CUSTOM TAB DEBUG: Checking app.schedule.periods for', student.app?.studentData?.firstName)
        const periodEntries = Object.entries(student.app.schedule.periods)
        for (let i = 0; i < periodEntries.length; i++) {
          const [periodKey, teacherId] = periodEntries[i]
          console.log('🔍 CUSTOM TAB DEBUG: App schedule period', periodKey, ':', teacherId)
          if (teacherId && teacherIds.includes(String(teacherId))) {
            console.log('🔍 CUSTOM TAB DEBUG: Found matching teacher in app schedule!')
            // Use the period key mapping instead of array index
            if (!isPeriodExcluded(periodKey, excludedPeriods)) {
              return true
            }
          }
        }
      }
      
      // Also check for direct period properties (from CSV import)
      // For this, we need to check each period index (0-6 maps to period1-period7)
      for (let i = 0; i < 7; i++) {
        const teacherIdField = `period${i + 1}TeacherId` // period1TeacherId, period2TeacherId, etc.
        const teacherId = student[teacherIdField] || 
                         student.aeries?.[teacherIdField] ||
                         student.app?.[teacherIdField]
        if (teacherId && teacherIds.includes(String(teacherId))) {
          // Use the index (i) for CSV fields
          if (!excludedPeriods.includes(i.toString())) {
            return true
          }
        }
      }
      
      return false
    })
    
    console.log('🔍 CUSTOM TAB DEBUG: Filtered students result:', filteredStudents.length, 'students')
    return filteredStudents
  }

  // Get student's periods for selected teachers
  const getStudentTeacherPeriods = (student, teacherIds, excludedPeriods = []) => {
    const periods = []
    
    // Check aeries schedule structure
    if (student.aeries?.schedule) {
      const scheduleEntries = Object.entries(student.aeries.schedule)
      for (let i = 0; i < scheduleEntries.length; i++) {
        const [periodKey, period] = scheduleEntries[i]
        if (period && period.teacherId && teacherIds.includes(String(period.teacherId))) {
          // Only include if period is not excluded (using period key mapping)
          if (!isPeriodExcluded(periodKey, excludedPeriods)) {
            // Find user by aeriesId or ID
            let user = users.value.find(u => u.id === String(period.teacherId))
            if (!user && /^\d+$/.test(period.teacherId)) {
              user = users.value.find(u => u.aeriesId === String(period.teacherId))
            }
            
            // Get the actual period label from helper
            const periodLabel = getLabel(i + 1)
            
            periods.push({
              period: periodLabel,
              teacherName: user ? (user.name || `${user.firstName} ${user.lastName}`) : `Teacher ${period.teacherId}`
            })
          }
        }
      }
    }
    
    // Check app.schedule.periods structure
    if (student.app?.schedule?.periods) {
      const periodEntries = Object.entries(student.app.schedule.periods)
      for (let i = 0; i < periodEntries.length; i++) {
        const [periodKey, teacherId] = periodEntries[i]
        if (teacherId && teacherIds.includes(String(teacherId))) {
          // Only include if period is not excluded (using period key mapping)
          if (!isPeriodExcluded(periodKey, excludedPeriods)) {
            const user = users.value.find(u => u.id === String(teacherId))
            
            // Get the actual period label from helper
            const periodLabel = getLabel(parseInt(periodKey))
            
            periods.push({
              period: periodLabel,
              teacherName: user ? (user.name || `${user.firstName} ${user.lastName}`) : `Teacher ${teacherId}`
            })
          }
        }
      }
    }
    
    // Also check for direct period properties (from CSV import)
    for (let i = 0; i < 7; i++) {
      const teacherIdField = `period${i + 1}TeacherId`
      const teacherId = student[teacherIdField] || 
                       student.aeries?.[teacherIdField] ||
                       student.app?.[teacherIdField]
      
      if (teacherId && teacherIds.includes(String(teacherId))) {
        // Only include if period is not excluded (using index for CSV fields)
        if (!excludedPeriods.includes(i.toString())) {
          // Find user by aeriesId or ID
          let user = users.value.find(u => u.id === String(teacherId))
          if (!user && /^\d+$/.test(teacherId)) {
            user = users.value.find(u => u.aeriesId === String(teacherId))
          }
          
          // Get the actual period label from helper
          const periodLabel = getLabel(i + 1)
          
          periods.push({
            period: periodLabel,
            teacherName: user ? (user.name || `${user.firstName} ${user.lastName}`) : `Teacher ${teacherId}`
          })
        }
      }
    }
    
    return periods
  }

  // Generate CSV content
  const generateCSV = () => {
    const headers = [
      'Student ID',
      'First Name', 
      'Last Name',
      'Grade',
      'Case Manager',
      'Assessment Accommodations',
      'Services'
    ]
    
    const rows = students.value.map(student => {
      const firstName = getDisplayValue(student, 'firstName') || ''
      const lastName = getDisplayValue(student, 'lastName') || ''
      const grade = getDisplayValue(student, 'grade') || ''
      const caseManager = student.caseManagerId || student.app?.studentData?.caseManagerId || ''
      
      const assessmentAccom = student.app?.accommodations?.assessment || []
      const services = student.app?.classServices || []
      
      return [
        student.id || '',
        firstName,
        lastName,
        grade,
        caseManager,
        Array.isArray(assessmentAccom) ? assessmentAccom.join('; ') : assessmentAccom,
        Array.isArray(services) ? services.map(s => s.name || s).join('; ') : services
      ]
    })
    
    const allRows = [headers, ...rows]
    return allRows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`)
         .join(',')
    ).join('\n')
  }

  // Download CSV helper
  const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return {
    availablePeriods,
    availableTeachers,
    getStudentsForTeachers,
    getStudentTeacherPeriods,
    generateCSV,
    downloadCSV,
    isPeriodExcluded
  }
} 