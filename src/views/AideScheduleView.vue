<template>
  <div class="aide-schedule-view">
    <div class="header">
      <h1>My Schedule</h1>
      <div class="user-info">
        <span>{{ authStore.currentUser?.name || authStore.currentUser?.email }}</span>
        <button @click="logout" class="btn btn-secondary">
          Logout
        </button>
      </div>
    </div>

    <div class="content">
      <div v-if="!authStore.currentUser" class="error-message">
        <h2>Authentication Required</h2>
        <p>Please log in to access this page.</p>
        <button @click="router.push('/login')" class="btn btn-primary">Go to Login</button>
      </div>
      <div v-else-if="!isParaeducator" class="error-message">
        <h2>Access Denied</h2>
        <p>This page is only available to paraeducators.</p>
        <button @click="router.push('/')" class="btn btn-primary">Go Home</button>
      </div>
      <div v-else-if="loading" class="loading">
        Loading your schedule...
      </div>
      <div v-else class="schedule-container">
        <!-- Schedule Display -->
        <div class="schedule-display">
          <h2>My Daily Schedule</h2>
          <div class="schedule-timeline">
            <div v-for="timeBlock in getMyTimeBlocks()" :key="timeBlock.id" class="time-block" :class="timeBlock.type">
              <div class="time-info">
                <span class="time">{{ timeBlock.startTime }} - {{ timeBlock.endTime }}</span>
                <span class="type-badge">{{ timeBlock.type }}</span>
              </div>
              <div class="assignment-info">
                <span v-if="timeBlock.assignment">{{ timeBlock.assignment }}</span>
                <span v-else class="no-assignment">No Assignment</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Schedule Editor -->
        <div class="schedule-editor">
          <h2>Edit My Schedule</h2>
          <div class="editor-content">
            <div v-for="timeBlock in getTimeTableBlocks()" :key="timeBlock.id" class="time-block-editor">
              <div class="time-block-header">
                <span class="time">{{ timeBlock.startTime }} - {{ timeBlock.endTime }}</span>
                <span class="type-badge">{{ timeBlock.type }}</span>
              </div>
              <div class="assignment-editor">
                <select v-model="timeBlock.assignments[myAideId]" class="assignment-select">
                  <option value="">No Assignment</option>
                  <option v-for="teacher in teachers" :key="teacher.id" :value="`teacher:${teacher.id}`">
                    {{ teacher.name || teacher.email }}
                  </option>
                  <option v-for="student in students" :key="student.id" :value="`student:${student.id}`">
                    {{ getDisplayValue(student, 'firstName') }} {{ getDisplayValue(student, 'lastName') }}
                  </option>
                </select>
              </div>
            </div>
          </div>
          <div class="editor-actions">
            <button @click="saveMySchedule" class="btn btn-primary" :disabled="saving">
              <span v-if="saving">💾</span>
              <span v-else>💾</span>
              {{ saving ? 'Saving...' : 'Save My Schedule' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from '@/store/authStore'
import useUsers from '@/composables/useUsers'
import useStudents from '@/composables/useStudents'
import { useAppSettings } from '@/composables/useAppSettings'
import { getDisplayValue } from '@/utils/studentUtils'

const router = useRouter()
const authStore = useAuthStore()
const { userList, fetchUsers } = useUsers()
const { students, fetchStudents } = useStudents()
const { appSettings, loadAppSettings, saveAppSettings } = useAppSettings()

const loading = ref(true)
const saving = ref(false)
const timeTableData = ref({})
const detailedSchedule = ref({})

const isParaeducator = computed(() => {
  return authStore.currentUser?.role === 'paraeducator'
})

const myAideId = computed(() => {
  return authStore.currentUser?.uid
})

const teachers = computed(() => {
  return userList.value?.filter(user => ['teacher', 'case_manager', 'sped_chair'].includes(user.role))
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

// Load time table data
async function loadTimeTableData() {
  try {
    const timeTableDoc = await getDoc(doc(db, 'app_settings', 'global'))
    if (timeTableDoc.exists()) {
      const data = timeTableDoc.data()
      // Check for timeTables (plural) first, then fallback to timeTable (singular)
      timeTableData.value = data.timeTables?.[0] || data.timeTable || {}
    }
  } catch (error) {
    console.error('Error loading time table:', error)
  }
}

// Get time table blocks
function getTimeTableBlocks() {
  if (!timeTableData.value.schedule) return []
  return timeTableData.value.schedule.map((block, index) => ({
    ...block,
    id: block.id || `block-${index}`,
    assignments: detailedSchedule.value[block.id || `block-${index}`] || {}
  }))
}

// Get my time blocks with assignments
function getMyTimeBlocks() {
  const blocks = getTimeTableBlocks()
  return blocks.map(block => {
    const assignment = block.assignments[myAideId.value]
    let assignmentText = ''
    
    if (assignment) {
      if (assignment.startsWith('teacher:')) {
        const teacherId = assignment.replace('teacher:', '')
        const teacher = teachers.value.find(t => t.id === teacherId)
        assignmentText = teacher ? teacher.name || teacher.email : 'Unknown Teacher'
      } else if (assignment.startsWith('student:')) {
        const studentId = assignment.replace('student:', '')
        const student = students.value.find(s => s.id === studentId)
        assignmentText = student ? `${getDisplayValue(student, 'firstName')} ${getDisplayValue(student, 'lastName')}` : 'Unknown Student'
      }
    }
    
    return {
      ...block,
      assignment: assignmentText
    }
  })
}

// Save my schedule
async function saveMySchedule() {
  try {
    saving.value = true
    
    // Get current app settings
    const currentSettings = await loadAppSettings()
    
    // Update detailed schedule for my assignments
    const updatedDetailedSchedule = { ...currentSettings.detailedAideSchedule }
    
    // Update each time block with my assignments
    getTimeTableBlocks().forEach(block => {
      if (!updatedDetailedSchedule[block.id]) {
        updatedDetailedSchedule[block.id] = {}
      }
      updatedDetailedSchedule[block.id][myAideId.value] = block.assignments[myAideId.value]
    })
    
    // Save updated settings
    const updatedSettings = {
      ...currentSettings,
      detailedAideSchedule: updatedDetailedSchedule
    }
    
    await saveAppSettings(updatedSettings)
    console.log('My schedule saved successfully')
  } catch (error) {
    console.error('Error saving my schedule:', error)
  } finally {
    saving.value = false
  }
}

// Logout
function logout() {
  authStore.logout()
  router.push('/login')
}

// Load data
async function loadData() {
  try {
    loading.value = true
    await Promise.all([
      fetchUsers(),
      fetchStudents(),
      loadAppSettings(),
      loadTimeTableData()
    ])
    
    // Load detailed schedule from app settings
    const appSettingsDoc = await getDoc(doc(db, 'app_settings', 'global'))
    if (appSettingsDoc.exists()) {
      const data = appSettingsDoc.data()
      detailedSchedule.value = data.detailedAideSchedule || {}
    }
    
    loading.value = false
  } catch (error) {
    console.error('Error loading aide schedule data:', error)
    loading.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.aide-schedule-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #e0e0e0;
}

.header h1 {
  margin: 0;
  color: #333;
  font-size: 2rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.user-info span {
  font-weight: 500;
  color: #666;
}

.btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-primary:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #545b62;
}

.error-message, .loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.schedule-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
}

.schedule-display, .schedule-editor {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  padding: 20px;
}

.schedule-display h2, .schedule-editor h2 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 1.5rem;
}

.schedule-timeline {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.time-block {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-radius: 6px;
  background: #f8f9fa;
  border-left: 4px solid #007bff;
}

.time-block.period {
  border-left-color: #007bff;
}

.time-block.break {
  border-left-color: #ffc107;
}

.time-block.lunch {
  border-left-color: #28a745;
}

.time-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.time {
  font-weight: 600;
  font-size: 1em;
  color: #333;
}

.type-badge {
  font-size: 0.8em;
  padding: 3px 8px;
  border-radius: 4px;
  background: #e9ecef;
  color: #495057;
  font-weight: 500;
}

.assignment-info {
  font-size: 1em;
  color: #666;
  font-weight: 500;
}

.no-assignment {
  color: #999;
  font-style: italic;
}

.editor-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
}

.time-block-editor {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #dee2e6;
}

.time-block-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.assignment-editor {
  flex: 1;
  max-width: 300px;
  margin-left: 20px;
}

.assignment-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.9em;
}

.assignment-select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 20px;
  border-top: 1px solid #dee2e6;
}

@media (max-width: 768px) {
  .schedule-container {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .header {
    flex-direction: column;
    gap: 15px;
    align-items: flex-start;
  }
  
  .user-info {
    width: 100%;
    justify-content: space-between;
  }
}
</style> 