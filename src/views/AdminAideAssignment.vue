<template>
  <div class="admin-aide-assignment">
    <div class="header">
      <h1>Aide Assignment Management</h1>
      <div class="header-actions">
        <button @click="saveSchedule" class="btn btn-primary" :disabled="saving">
          <span v-if="saving">💾</span>
          <span v-else>💾</span>
          {{ saving ? 'Saving...' : 'Save Assignments' }}
        </button>
        <button @click="goBack" class="btn btn-secondary">
          <span>←</span> Back
        </button>
      </div>
    </div>

    <div class="content">
      <div v-if="!authStore.currentUser" class="error-message">
        <h2>Authentication Required</h2>
        <p>Please log in to access this page.</p>
        <button @click="router.push('/login')" class="btn btn-primary">Go to Login</button>
      </div>
      <div v-else-if="!isAdmin" class="error-message">
        <h2>Access Denied</h2>
        <p>You do not have permission to access this page.</p>
        <button @click="router.push('/')" class="btn btn-primary">Go Home</button>
      </div>
      <div v-else-if="loading" class="loading">
        Loading aide assignments...
      </div>
      <div v-else class="schedule-container">
        <table class="aide-schedule-table">
          <thead>
            <tr>
              <th>Aide Name</th>
              <th v-for="period in periods" :key="period" class="period-header">
                Period {{ period }}
              </th>
              <th>Direct Assignment</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="aide in paraeducators" :key="aide.id" class="aide-row">
              <td class="aide-name">
                {{ aide.name || aide.email }}
              </td>
              <!-- Period assignments -->
              <td v-for="period in periods" :key="period" class="period-cell">
                <div v-for="(teacherId, idx) in getAideScheduleArray(getAideId(aide), period)" :key="'t-' + idx" class="assignment-row">
                  <select
                    :value="teacherId"
                    @change="updateScheduleArray(getAideId(aide), period, idx, $event.target.value)"
                    class="teacher-select"
                  >
                    <option value="">No Assignment</option>
                    <option v-for="teacher in teachers" :key="getTeacherId(teacher)" :value="getTeacherId(teacher)">
                      {{ teacher.name || teacher.email }}
                    </option>
                  </select>
                  <div class="assignment-buttons">
                    <button v-if="getAideScheduleArray(getAideId(aide), period).length > 1" @click="removeTeacherAssignment(getAideId(aide), period, idx)" class="btn btn-small btn-danger assignment-remove" title="Remove assignment" type="button">–</button>
                    <button v-if="idx === getAideScheduleArray(getAideId(aide), period).length - 1" @click="addTeacherAssignment(getAideId(aide), period)" class="btn btn-small btn-secondary assignment-add" title="Add assignment" type="button">+</button>
                  </div>
                </div>
              </td>
              <!-- Direct assignments -->
              <td class="direct-assignment-cell">
                <div v-for="(studentId, idx) in getDirectAssignmentArray(getAideId(aide))" :key="'d-' + idx" class="assignment-row">
                  <select
                    :value="studentId"
                    @change="updateDirectAssignmentArray(getAideId(aide), idx, $event.target.value)"
                    class="student-select"
                  >
                    <option value="">No Assignment</option>
                    <option v-for="student in students" :key="student.id" :value="student.id">
                      {{ getDisplayValue(student, 'firstName') }} {{ getDisplayValue(student, 'lastName') }}
                    </option>
                  </select>
                  <div class="assignment-buttons">
                    <button v-if="getDirectAssignmentArray(getAideId(aide)).length > 1" @click="removeDirectAssignment(getAideId(aide), idx)" class="btn btn-small btn-danger assignment-remove" title="Remove assignment" type="button">–</button>
                    <button v-if="idx === getDirectAssignmentArray(getAideId(aide)).length - 1" @click="addDirectAssignment(getAideId(aide))" class="btn btn-small btn-secondary assignment-add" title="Add assignment" type="button">+</button>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import useUsers from '@/composables/useUsers.js'
import useStudents from '@/composables/useStudents.js'
import { useAuthStore } from '@/store/authStore'
import { getDisplayValue } from '@/utils/studentUtils'
import useAideAssignment from '@/composables/useAideAssignment.js'
import { useAppSettings } from '@/composables/useAppSettings'

const router = useRouter()
const { users: userMap, userList, fetchUsers } = useUsers()
const { students, fetchStudents } = useStudents()
const authStore = useAuthStore()
const { aideAssignment, loadAideAssignments, saveAllAideAssignments } = useAideAssignment()
const { appSettings, loadAppSettings } = useAppSettings()

const loading = ref(true)
const saving = ref(false)

const isAdmin = computed(() => {
  const role = authStore.currentUser?.role
        return ['admin', 'school_admin', 'admin_504', 'sped_chair'].includes(role)
})

const paraeducators = computed(() => {
  return userList.value?.filter(user => user.role === 'paraeducator') || []
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

const periods = computed(() => {
  // Use numeric periods (1, 2, 3, 4, 5, 6, 7) for aide assignment keys
  // This ensures aide assignments are saved with numeric period keys, not labels
  const numPeriods = appSettings.value?.numPeriods || 7
  return Array.from({ length: numPeriods }, (_, i) => i + 1)
})

function getAideId(aide) {
  return aide.id
}

function getTeacherId(teacher) {
  return teacher.id
}

function getAideScheduleArray(aideId, period) {
  // Always return an array for the period, even if only one assignment
  if (!aideAssignment.value[aideId]) return ['']
  if (!aideAssignment.value[aideId].classAssignment) aideAssignment.value[aideId].classAssignment = {}
  let val = aideAssignment.value[aideId].classAssignment[period]
  if (Array.isArray(val)) return val.length ? val : ['']
  if (typeof val === 'string' && val !== '') return [val]
  return ['']
}

function getDirectAssignmentArray(aideId) {
  if (!aideAssignment.value[aideId]) return ['']
  let val = aideAssignment.value[aideId].directAssignment
  if (Array.isArray(val)) return val.length ? val : ['']
  if (typeof val === 'string' && val !== '') return [val]
  return ['']
}

function updateScheduleArray(aideId, period, idx, teacherId) {
  if (!aideAssignment.value[aideId]) {
    aideAssignment.value[aideId] = { classAssignment: {}, directAssignment: [] }
  }
  if (!aideAssignment.value[aideId].classAssignment) aideAssignment.value[aideId].classAssignment = {}
  let arr = getAideScheduleArray(aideId, period)
  arr[idx] = teacherId
  // Remove empty trailing assignments
  while (arr.length > 1 && arr[arr.length - 1] === '') arr.pop()
  aideAssignment.value[aideId].classAssignment[period] = [...arr]
}

function updateDirectAssignmentArray(aideId, idx, studentId) {
  if (!aideAssignment.value[aideId]) {
    aideAssignment.value[aideId] = { classAssignment: {}, directAssignment: [] }
  }
  let arr = getDirectAssignmentArray(aideId)
  arr[idx] = studentId
  // Remove empty trailing assignments
  while (arr.length > 1 && arr[arr.length - 1] === '') arr.pop()
  aideAssignment.value[aideId].directAssignment = [...arr]
}

function addTeacherAssignment(aideId, period) {
  if (!aideAssignment.value[aideId]) {
    aideAssignment.value[aideId] = { classAssignment: {}, directAssignment: [] }
  }
  if (!aideAssignment.value[aideId].classAssignment) aideAssignment.value[aideId].classAssignment = {}
  let arr = getAideScheduleArray(aideId, period)
  arr.push('')
  aideAssignment.value[aideId].classAssignment[period] = [...arr]
}

function removeTeacherAssignment(aideId, period, idx) {
  if (!aideAssignment.value[aideId] || !aideAssignment.value[aideId].classAssignment) return;
  let arr = getAideScheduleArray(aideId, period);
  if (arr.length <= 1) return;
  arr.splice(idx, 1);
  aideAssignment.value[aideId].classAssignment[period] = [...arr];
}

function addDirectAssignment(aideId) {
  if (!aideAssignment.value[aideId]) {
    aideAssignment.value[aideId] = { classAssignment: {}, directAssignment: [] }
  }
  let arr = getDirectAssignmentArray(aideId)
  arr.push('')
  aideAssignment.value[aideId].directAssignment = [...arr]
}

function removeDirectAssignment(aideId, idx) {
  if (!aideAssignment.value[aideId]) return
  let arr = getDirectAssignmentArray(aideId)
  if (arr.length <= 1) return
  arr.splice(idx, 1)
  aideAssignment.value[aideId].directAssignment = [...arr]
}

function updateDirectAssignment(aideId, studentId) {
  if (!aideAssignment.value[aideId]) {
    aideAssignment.value[aideId] = {
      classAssignment: {},
      directAssignment: []
    }
  }
  aideAssignment.value[aideId].directAssignment = [studentId]
}

async function loadData() {
  try {
    loading.value = true
    await Promise.all([
      fetchUsers(),
      fetchStudents(),
      loadAideAssignments(),
      loadAppSettings()
    ])
    loading.value = false
  } catch (error) {
    console.error('Error loading data:', error)
    loading.value = false
  }
}

async function saveSchedule() {
  try {
    saving.value = true
    await saveAllAideAssignments()
    saving.value = false
  } catch (error) {
    console.error('Error saving aide assignments:', error)
    saving.value = false
  }
}

function goBack() {
  router.push('/admin')
}

onMounted(loadData)
</script>

<style scoped>
.admin-aide-assignment {
  padding: 20px;
  max-width: 1400px;
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

.header-actions {
  display: flex;
  gap: 10px;
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

.loading {
  text-align: center;
  padding: 40px;
  font-size: 1.2rem;
  color: #666;
}

.error-message {
  text-align: center;
  padding: 40px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #dee2e6;
}

.error-message h2 {
  color: #dc3545;
  margin-bottom: 10px;
}

.error-message p {
  color: #666;
  margin-bottom: 20px;
}

.schedule-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
}

.aide-schedule-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.aide-schedule-table th,
.aide-schedule-table td {
  padding: 12px 8px;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.aide-schedule-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #333;
}

.aide-schedule-table tbody tr:hover {
  background: #f8f9fa;
}

.aide-name {
  font-weight: 600;
  color: #333;
  min-width: 150px;
}

.period-select, .teacher-select, .student-select {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.85rem;
  background: white;
}

.btn-small {
  padding: 4px 10px;
  font-size: 0.85rem;
  border-radius: 4px;
  margin-left: 4px;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.assignment-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
}

.assignment-buttons {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-left: 2px;
}

.assignment-add, .assignment-remove {
  padding: 1px 3px;
  font-size: 0.7rem;
  height: 16px;
  width: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
}

.assignment-remove {
  background: #dc3545;
  color: white;
}

.assignment-add {
  background: #6c757d;
  color: white;
}

@media print {
  .header-actions,
  .btn {
    display: none !important;
  }
  
  .aide-schedule-table {
    font-size: 10px;
  }
  
  .teacher-select,
  .student-select {
    border: none;
    background: none;
    font-weight: 600;
  }
}
</style> 