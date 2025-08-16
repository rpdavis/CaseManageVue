<template>
  <div class="modal-overlay" @click="closeDialog">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Send Teacher Feedback Form</h3>
        <button @click="closeDialog" class="close-btn">×</button>
      </div>
      
      <div class="modal-body">
        <!-- Student Info -->
        <div class="student-info">
          <h4>{{ student.firstName }} {{ student.lastName }} (Grade {{ student.grade }})</h4>
          <p class="case-manager-info">Case Manager: {{ currentUser?.name || currentUser?.email }}</p>
        </div>

        <!-- Available Forms -->
        <div class="form-group">
          <label>Select Feedback Form to Send:</label>
          <div v-if="availableForms.length === 0" class="no-forms-message">
            <p>No feedback forms available. Forms must be created in the Admin Panel first.</p>
            <p><em>Contact your administrator to create feedback forms.</em></p>
          </div>
          <div v-else class="form-selection">
            <div v-for="form in availableForms" :key="form.id" class="form-option">
              <input 
                type="radio" 
                :id="form.id" 
                :value="form.id" 
                v-model="selectedFormId"
              >
                          <label :for="form.id" class="form-option-label">
              <div class="form-title">{{ form.title }}</div>
              <div class="form-details">
                <span class="form-description" v-if="form.description">{{ form.description }}</span>
                <span class="form-date">Created: {{ formatDate(form.createdAt) }}</span>
              </div>
            </label>
            </div>
          </div>
        </div>

        <!-- Teacher Selection -->
        <div v-if="selectedFormId" class="form-group">
          <div class="teacher-selection-header">
            <label>Select Teachers to Send Form To:</label>
            <div class="teacher-actions">
              <button 
                v-if="teachersForStudent.length > 0" 
                @click="selectAllTeachers" 
                type="button" 
                class="btn-select-all"
              >
                Select All
              </button>
              <button 
                v-if="selectedTeachers.length > 0" 
                @click="copyTeacherEmails" 
                type="button" 
                class="btn-copy-emails"
                :title="copyButtonText"
              >
                📋 Copy Emails
              </button>
            </div>
          </div>
          <div class="teacher-selection">
            <div v-if="teachersForStudent.length === 0" class="no-teachers-message">
              <p>No teachers found for this student's schedule.</p>
            </div>
            <div v-else class="teacher-checkboxes">
              <div v-for="teacher in teachersForStudent" :key="teacher.id" class="checkbox-item">
                <input 
                  type="checkbox" 
                  :id="`teacher-${teacher.id}`" 
                  :value="teacher" 
                  v-model="selectedTeachers"
                >
                <label :for="`teacher-${teacher.id}`">
                  {{ teacher.name || teacher.email }} 
                  <span class="teacher-email">({{ teacher.email }})</span>
                </label>
              </div>
            </div>
          </div>
          <div v-if="selectedTeachers.length > 0" class="selected-emails-preview">
            <p><strong>Selected teacher emails:</strong></p>
            <div class="email-preview">{{ selectedTeachers.map(t => t.email).join(', ') }}</div>
          </div>
        </div>

        <!-- Duplication Options -->
        <div v-if="selectedFormId && selectedTeachers.length > 0 && selectedForm?.sheetTemplateUrl" class="form-group">
          <label>Response Collection:</label>
          <div class="duplication-options">
            <div class="option-item">
              <input type="checkbox" id="duplicate-sheet" v-model="duplicateCustomSheet">
              <label for="duplicate-sheet">
                <strong>Duplicate custom sheet</strong>
                <span class="option-description">Create a copy of the response template sheet in your Google Drive</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Send History -->
        <div v-if="selectedFormId && sendHistory.length > 0" class="form-group">
          <label>Previous Sends for this Student:</label>
          <div class="send-history">
            <div v-for="send in sendHistory" :key="send.id" class="history-item">
              <div class="history-info">
                <span class="history-date">{{ formatDateTime(send.sentAt) }}</span>
                <span class="history-teachers">{{ (send.teacherEmails || []).length }} teacher{{ (send.teacherEmails || []).length === 1 ? '' : 's' }}</span>
                <span v-if="send.successful > 0" class="history-success">✅ {{ send.successful }} sent</span>
                <span v-if="send.failed > 0" class="history-failed">❌ {{ send.failed }} failed</span>
              </div>
              <div v-if="send.formUrl || send.sheetUrl" class="history-links">
                <a v-if="send.formUrl" :href="send.formUrl" target="_blank" class="history-link">📝 Form</a>
                <a v-if="send.sheetUrl" :href="send.sheetUrl" target="_blank" class="history-link">📊 Sheet</a>
              </div>
            </div>
          </div>
        </div>

        <!-- Status Messages -->
        <div v-if="statusMessage" :class="`status-message ${statusType}`">
          {{ statusMessage }}
          
          <!-- Show success message -->
          <div v-if="statusType === 'success' && lastSentResult" class="resource-links">
            <div class="resource-section">
              <h5>✅ Form Opened Successfully!</h5>
              <p class="resource-note">
                <strong>{{ lastSentResult.message }}</strong>
              </p>
              <div class="success-details">
                <p>
                  📝 Form opened for <strong>{{ lastSentResult.sent }}</strong> teacher{{ lastSentResult.sent === 1 ? '' : 's' }}
                </p>
                <p v-if="lastSentResult.studentInitials" class="student-info">
                  👤 Student: <strong>{{ lastSentResult.studentInitials }}</strong> - {{ lastSentResult.studentName }}
                </p>
                <p class="form-link">
                  🔗 Form Link: <a :href="lastSentResult.formUrl" target="_blank">{{ selectedForm?.title }}</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="closeDialog" class="secondary-btn">Cancel</button>
        <button 
          @click="sendForm" 
          class="primary-btn"
          :disabled="!canSendForm || isProcessing"
        >
          <span v-if="isProcessing">Creating Form...</span>
          <span v-else>📝 Create New Form</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useTeacherFeedback } from '@/composables/useTeacherFeedback.js'
import useUsers from '@/composables/useUsers.js'

const props = defineProps({
  student: {
    type: Object,
    required: true
  },
  currentUser: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'form-sent'])

// Composables
const { activeForms } = useTeacherFeedback()
const { users, userList, fetchUsers } = useUsers()

// State
const isProcessing = ref(false)
const statusMessage = ref('')
const statusType = ref('')
const lastSentResult = ref(null)
const duplicateCustomSheet = ref(false)
const copyButtonText = ref('Copy teacher emails to clipboard')

// Form and teacher selection
const selectedFormId = ref('')
const selectedTeachers = ref([])

// Computed
const availableForms = computed(() => {
  // Return all active forms created in admin
  return activeForms.value || []
})

const selectedForm = computed(() => {
  if (!selectedFormId.value) return null
  return availableForms.value?.find(form => form.id === selectedFormId.value) || null
})

const sendHistory = computed(() => {
  if (!selectedFormId.value || !props.student) return []
  
  try {
    // Get send history from localStorage for this student and form
    const sentForms = JSON.parse(localStorage.getItem('casemanage_sent_forms') || '[]')
    return sentForms.filter(send => 
      send && 
      send.studentId === props.student.id && 
      send.formId === selectedFormId.value
    ).sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt)) || []
  } catch (error) {
    console.warn('Error parsing send history:', error)
    return []
  }
})

const teachersForStudent = computed(() => {
  if (!props.student || !userList.value) return []
  
  const teacherIds = new Set()
  
  // Check new nested structure first
  if (props.student.app?.schedule?.periods) {
    Object.values(props.student.app.schedule.periods).forEach(periodData => {
      // Add main teacher
      const teacherId = typeof periodData === 'string' ? periodData : periodData?.teacherId
      if (teacherId) teacherIds.add(teacherId)
      
      // Add co-teaching case manager if present
      if (periodData?.coTeaching?.caseManagerId) {
        teacherIds.add(periodData.coTeaching.caseManagerId)
      }
    })
  } else {
    // Fallback to legacy structure
    const sched = props.student.schedule || {}
    Object.values(sched).forEach(teacherId => {
      if (teacherId) teacherIds.add(teacherId)
    })
  }
  
  // Get teachers from aeries data
  if (props.student.aeries?.schedule) {
    Object.values(props.student.aeries.schedule).forEach(period => {
      if (period?.teacherId) teacherIds.add(period.teacherId)
    })
  }
  
  // Convert to teacher objects
  return Array.from(teacherIds)
    .map(id => (userList.value || []).find(u => u && u.id === id))
    .filter(Boolean)
    .filter(user => user && user.role === 'teacher')
})

const canSendForm = computed(() => {
  return selectedFormId.value && 
         (selectedTeachers.value || []).length > 0
})

// Methods
const formatDate = (date) => {
  if (!date) return ''
  const dateObj = date.seconds ? new Date(date.seconds * 1000) : new Date(date)
  return dateObj.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  })
}

const formatDateTime = (date) => {
  if (!date) return ''
  const dateObj = date.seconds ? new Date(date.seconds * 1000) : new Date(date)
  return dateObj.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  })
}

const selectAllTeachers = () => {
  selectedTeachers.value = [...teachersForStudent.value]
}

const copyTeacherEmails = async () => {
  const emails = selectedTeachers.value.map(t => t.email).join(', ')
  try {
    await navigator.clipboard.writeText(emails)
    copyButtonText.value = '✅ Copied!'
    setTimeout(() => {
      copyButtonText.value = 'Copy teacher emails to clipboard'
    }, 2000)
  } catch (error) {
    console.error('Failed to copy emails:', error)
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = emails
    document.body.appendChild(textArea)
    textArea.select()
    try {
      document.execCommand('copy')
      copyButtonText.value = '✅ Copied!'
      setTimeout(() => {
        copyButtonText.value = 'Copy teacher emails to clipboard'
      }, 2000)
    } catch (fallbackError) {
      copyButtonText.value = '❌ Copy failed'
      setTimeout(() => {
        copyButtonText.value = 'Copy teacher emails to clipboard'
      }, 2000)
    }
    document.body.removeChild(textArea)
  }
}

const sendForm = async () => {
  if (!canSendForm.value) return
  
  try {
    isProcessing.value = true
    statusMessage.value = ''
    lastSentResult.value = null
    
    const form = selectedForm.value
    const teacherEmails = selectedTeachers.value.map(t => t.email)
    const teacherNames = selectedTeachers.value.map(t => t.name || t.email).join(', ')
    
    // Get student info
    const firstName = props.student.firstName || 
                     props.student.first_name || 
                     props.student.app?.studentData?.firstName ||
                     ''
    const lastName = props.student.lastName || 
                    props.student.last_name || 
                    props.student.app?.studentData?.lastName ||
                    ''
    
    const studentName = `${firstName} ${lastName}`.trim()
    const initials = ((firstName?.[0] || '') + (lastName?.[0] || '')).toUpperCase() || 'ST'
    
    // Process the form URL - add student initials to form title
    let formUrl = form.formUrl
    if (formUrl.includes('/edit')) {
      formUrl = formUrl.replace('/edit', '/copy')
    }
    
    // Try to add basic info as URL parameters (this will only work if the form supports it)
    const urlParams = new URLSearchParams()
    
    // Add student initials to form title - this will create a new form with initials prefix
    if (initials && initials !== 'ST') {
      urlParams.append('title', `${initials} - ${form.title}`)
    }
    
    // Add student name and teacher emails as URL parameters
    // Note: These won't pre-fill unless the form owner set up pre-fill URLs
    if (studentName) {
      urlParams.append('student', studentName)
    }
    if (teacherEmails.length > 0) {
      urlParams.append('responders', teacherEmails.join(', '))
    }
    
    // Append parameters to URL if any exist
    const separator = formUrl.includes('?') ? '&' : '?'
    const finalUrl = urlParams.toString() ? `${formUrl}${separator}${urlParams.toString()}` : formUrl
    
    // Open the form directly
    window.open(finalUrl, '_blank', 'noopener')
    
    // Show success message with student initials
    statusMessage.value = `Form opened for ${teacherNames}. Student: ${initials} - ${studentName}`
    statusType.value = 'success'
    
    // Store the result for display
    lastSentResult.value = {
      message: `Form opened successfully for ${initials} - ${studentName}`,
      sent: teacherEmails.length,
      failed: 0,
      formUrl: finalUrl,
      studentInitials: initials,
      studentName: studentName
    }
    
    // Record that form was sent locally
    recordFormSent(form, selectedTeachers.value, finalUrl)
    
  } catch (error) {
    console.error('Error opening form:', error)
    statusMessage.value = 'Failed to open form. Please try again.'
    statusType.value = 'error'
  } finally {
    isProcessing.value = false
  }
}

const recordFormSent = (form, teachers, formUrl = null) => {
  // Store form sending record in localStorage for tracking
  const sentForms = JSON.parse(localStorage.getItem('casemanage_sent_forms') || '[]')
  
  const record = {
    id: `${form.id}_${props.student.id}_${Date.now()}`,
    formId: form.id,
    formTitle: form.title,
    formUrl: formUrl || form.formUrl, // Use provided formUrl or existing
    sheetUrl: null, // Sheet URL is not directly tracked here for Gmail
    studentId: props.student.id,
    studentName: `${props.student.firstName} ${props.student.lastName}`,
    caseManagerId: props.currentUser.uid,
    caseManagerName: props.currentUser.name || props.currentUser.email,
    teachers: teachers.map(t => ({ id: t.id, name: t.name, email: t.email })),
    sentAt: new Date().toISOString(),
    method: 'gmail' // Record as 'gmail' for this new flow
  }

  // Update existing record or add new one
  const index = sentForms.findIndex(s => s.id === record.id)
  if (index !== -1) {
    sentForms[index] = record
  } else {
    sentForms.push(record)
  }

  localStorage.setItem('casemanage_sent_forms', JSON.stringify(sentForms))
}

const closeDialog = () => {
  emit('close')
}

// Initialize
onMounted(() => {
  // Reset state
  selectedFormId.value = ''
  selectedTeachers.value = []
  statusMessage.value = ''
  fetchUsers() // Call fetchUsers to load user data for teacher checkboxes
})

// Watch for teachers to become available and auto-select them
watch(teachersForStudent, (newTeachers) => {
  if (newTeachers && newTeachers.length > 0 && selectedTeachers.value.length === 0) {
    // Auto-select all teachers when they become available
    selectedTeachers.value = [...newTeachers]
  }
}, { immediate: true })
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #dee2e6;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #dee2e6;
}

.student-info {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 4px solid #2a79c9;
}

.student-info h4 {
  margin: 0 0 0.5rem 0;
  color: #333;
}

.case-manager-info {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
}

.no-forms-message {
  padding: 1rem;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 4px;
  color: #856404;
}

.no-forms-message p {
  margin: 0.5rem 0;
}

.form-selection {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-option {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.form-option:hover {
  border-color: #2a79c9;
  background: #f8f9fa;
}

.form-option input[type="radio"] {
  margin-top: 0.25rem;
}

.form-option-label {
  flex: 1;
  cursor: pointer;
  margin: 0;
}

.form-title {
  font-weight: 500;
  color: #333;
  margin-bottom: 0.25rem;
}

.form-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-templates, .form-date {
  font-size: 0.9rem;
  color: #666;
}

.teacher-selection {
  margin-top: 0.5rem;
}

.teacher-selection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.teacher-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-select-all, .btn-copy-emails {
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
  border: 1px solid #ddd;
  background: #f8f9fa;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-select-all:hover, .btn-copy-emails:hover {
  background: #e9ecef;
  border-color: #adb5bd;
}

.btn-copy-emails {
  background: #e3f2fd;
  border-color: #2196f3;
  color: #1976d2;
}

.btn-copy-emails:hover {
  background: #bbdefb;
}

.selected-emails-preview {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
}

.email-preview {
  font-family: monospace;
  font-size: 0.9rem;
  color: #495057;
  word-break: break-all;
  margin-top: 0.5rem;
}

.teacher-checkboxes {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 1rem;
}

.no-teachers-message {
  color: #666;
  font-style: italic;
  text-align: center;
  padding: 1rem;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.checkbox-item input[type="checkbox"] {
  margin: 0;
}

.checkbox-item label {
  margin: 0;
  cursor: pointer;
  flex: 1;
}

.teacher-email {
  color: #666;
  font-size: 0.9rem;
}

.send-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.option-item input[type="radio"] {
  margin: 0;
}

.option-item label {
  margin: 0;
  cursor: pointer;
}

.duplication-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.option-item.duplication-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.option-item.duplication-option:hover {
  border-color: #2a79c9;
  background: #f8f9fa;
}

.option-item.duplication-option input[type="checkbox"] {
  margin-top: 0;
}

.option-item.duplication-option label {
  flex: 1;
  cursor: pointer;
  margin: 0;
}

.option-item.duplication-option .option-description {
  font-size: 0.875rem;
  color: #6c757d;
  margin-left: 0.5rem;
}

.send-history {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 1rem;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f0f0f0;
}

.history-item:last-child {
  border-bottom: none;
}

.history-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.history-date {
  font-size: 0.875rem;
  color: #666;
}

.history-teachers {
  font-size: 0.9rem;
  color: #333;
}

.history-success {
  color: #2e7d32;
  font-weight: 500;
}

.history-failed {
  color: #c62828;
  font-weight: 500;
}

.history-links {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.5rem;
}

.history-link {
  text-decoration: none;
  font-size: 0.875rem;
  padding: 0.375rem 0.75rem;
  background: #e0e0e0;
  border-radius: 4px;
  color: #333;
}

.history-link:hover {
  background: #d0d0d0;
}

.resource-links-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e9ecef;
}

.resource-links-section h6 {
  margin: 0 0 0.75rem 0;
  font-size: 0.9rem;
  color: #495057;
  font-weight: 600;
}

.link-buttons {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}

.link-buttons .btn {
  text-decoration: none;
  font-size: 0.875rem;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-outline-primary {
  color: #2a79c9;
  border: 1px solid #2a79c9;
  background: white;
}

.btn-outline-primary:hover {
  background: #2a79c9;
  color: white;
}

.btn-outline-success {
  color: #2e7d32;
  border: 1px solid #2e7d32;
  background: white;
}

.btn-outline-success:hover {
  background: #2e7d32;
  color: white;
}

.status-message {
  padding: 0.75rem 1rem;
  border-radius: 4px;
  font-weight: 500;
  margin-top: 1rem;
}

.status-message.success {
  background: #e8f5e8;
  color: #2e7d32;
  border: 1px solid #c8e6c9;
}

.status-message.error {
  background: #ffebee;
  color: #c62828;
  border: 1px solid #ffcdd2;
}

.status-message.alert-error {
  background-color: #fee;
  color: #c33;
  border-color: #fcc;
}

.resource-links {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 0.375rem;
  border: 1px solid #dee2e6;
}

.resource-section h5 {
  margin: 0 0 0.75rem 0;
  color: #495057;
  font-size: 1rem;
}

.link-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}

.link-buttons .btn {
  text-decoration: none;
  font-size: 0.875rem;
  padding: 0.375rem 0.75rem;
}

.resource-note {
  margin: 0;
  font-size: 0.875rem;
  color: #6c757d;
  line-height: 1.4;
}

.success-details {
  margin-top: 0.75rem;
  font-size: 0.9rem;
  color: #495057;
}

.form-link {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 4px;
}

.form-link a {
  color: #2a79c9;
  text-decoration: none;
  font-weight: 500;
}

.form-link a:hover {
  text-decoration: underline;
}

.failed-note {
  color: #c62828;
  font-weight: 500;
}

.primary-btn, .secondary-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.primary-btn {
  background: #2a79c9;
  color: white;
}

.primary-btn:hover:not(:disabled) {
  background: #1e5a96;
}

.secondary-btn {
  background: #f8f9fa;
  color: #495057;
  border: 1px solid #dee2e6;
}

.secondary-btn:hover:not(:disabled) {
  background: #e9ecef;
}

.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style> 