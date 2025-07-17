import { ref } from 'vue'
import { useAuthStore } from '@/store/authStore'

export function useStudentNavActions(studentData) {
  const { router, fetchData } = studentData

  // Dialog states
  const editingStudentId = ref(null)
  const emailingStudentId = ref(null)
  const showExport = ref(false)
  const showAddStudent = ref(false)
  const showFeedbackDialog = ref(false)
  const feedbackStudentId = ref(null)

  // Student actions
  const editStudent = (studentId) => {
    editingStudentId.value = studentId
  }

  const emailStudent = (studentId) => {
    emailingStudentId.value = studentId
  }

  const handleTeacherFeedback = (studentId) => {
    feedbackStudentId.value = studentId
    showFeedbackDialog.value = true
  }

  // Event handlers
  const handleFormSent = () => {
    // Form sent successfully - no need to refresh anything since we removed the column
    console.log('Teacher feedback form sent successfully')
  }

  const handleStudentAdded = () => {
    showAddStudent.value = false
    fetchData() // Refresh the data
  }

  const handleStudentSaved = () => {
    // Handle student saved event
    console.log('Student saved')
    fetchData() // Refresh the data
  }

  // Navigation functions
  const navigateToAdmin = () => {
    router.push('/admin')
  }

  const navigateToTesting = () => {
    router.push('/testing')
  }

  const navigateToAideSchedule = () => {
    router.push('/aide-schedule')
  }

  // Navigation action handler
  const handleNavAction = async (action) => {
    switch (action) {
      case 'add-student':
        showAddStudent.value = true
        break
      case 'export':
        showExport.value = true
        break
      case 'print':
        window.print()
        break
      case 'admin':
        navigateToAdmin()
        break
      case 'testing':
        navigateToTesting()
        break

      case 'aide-schedule':
        navigateToAideSchedule()
        break
      case 'logout':
        await handleLogout()
        break
    }
  }

  // Logout handler
  const handleLogout = async () => {
    try {
      const authStore = useAuthStore()
      await authStore.logout()
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return {
    // Dialog states
    editingStudentId,
    emailingStudentId,
    showExport,
    showAddStudent,
    showFeedbackDialog,
    feedbackStudentId,

    // Student actions
    editStudent,
    emailStudent,
    handleTeacherFeedback,

    // Event handlers
    handleFormSent,
    handleStudentAdded,
    handleStudentSaved,

    // Navigation
    navigateToAdmin,
    navigateToTesting,
    navigateToAideSchedule,
    handleNavAction,
    handleLogout
  }
} 