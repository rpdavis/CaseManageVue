<template>
  <td class="actions-column">
    <div class="actions-content">
      <div class="action-buttons">
        <!-- Only show Edit for admins/sped_chair or case managers on their own caseload -->
        <button
          v-if="canEditStudent"
          class="edit-btn"
          @click="$emit('edit', student.id)"
          title="Edit Student"
        >
          <Edit :size="16" />
        </button>
        <button class="email-btn" @click="$emit('email', student.id)" title="Email Student">
          <Mail :size="16" />
        </button>
        <button v-if="canSendFeedback" 
                class="teacher-feedback-btn" 
                @click="$emit('teacher-feedback', student.id)" 
                title="Send Teacher Feedback Form">
          <MessageSquare :size="16" />
        </button>
      </div>
      <div v-if="student?.updatedAt" class="action-updated-date" :title="updateTooltip">
        {{ student.updatedAt.seconds ? new Date(student.updatedAt.seconds * 1000).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) : new Date(student.updatedAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) }}
      </div>
    </div>
  </td>
</template>

<script setup>
import { computed } from 'vue'
import { RoleUtils } from '@/composables/roles/roleConfig'
import { Edit, Mail, MessageSquare } from 'lucide-vue-next'

const props = defineProps({
  student: {
    type: Object,
    required: true
  },
  currentUser: {
    type: Object,
    required: false
  },
  studentData: {
    type: Object,
    required: false
  },
  getUserName: {
    type: Function,
    required: true
  },
  formatDate: {
    type: Function,
    required: true
  }
})

const emit = defineEmits(['edit', 'email', 'teacher-feedback'])

// Get the username of who last updated the student
const updatedByUser = computed(() => {
  if (!props.student?.updatedBy) return null
  return props.getUserName(props.student.updatedBy)
})

// Create the tooltip text with username
const updateTooltip = computed(() => {
  if (!props.student?.updatedAt) return ''
  
  try {
    let formattedDate = ''
    
    // Handle Firestore Timestamp format (which we now know it is)
    if (props.student.updatedAt.seconds) {
      // Convert Firestore Timestamp to JavaScript Date
      const jsDate = new Date(props.student.updatedAt.seconds * 1000)
      formattedDate = jsDate.toLocaleString('en-US', { 
        month: '2-digit', 
        day: '2-digit', 
        year: '2-digit',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } else {
      // Fallback for other formats
      const jsDate = new Date(props.student.updatedAt)
      formattedDate = jsDate.toLocaleString('en-US', { 
        month: '2-digit', 
        day: '2-digit', 
        year: '2-digit',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }
    
    const userText = updatedByUser.value ? ` by ${updatedByUser.value}` : ''
    return `Last Updated: ${formattedDate}${userText}`
    
  } catch (error) {
    console.warn('Error formatting date in tooltip:', error)
    // Manual fallback formatting
    const jsDate = new Date(props.student.updatedAt.seconds * 1000)
    const userText = updatedByUser.value ? ` by ${updatedByUser.value}` : ''
    return `Last Updated: ${jsDate.toLocaleDateString()}${userText}`
  }
})

// Determine if current user can edit this student
const canEditStudent = computed(() => {
  if (!props.currentUser?.role || !props.student) return false
  
  const role = props.currentUser.role
  const userId = props.currentUser.uid
  
  // Hide edit button for paraeducators and teachers
  if (role === 'paraeducator' || role === 'teacher') {
    return false
  }
  
  // Case managers can only edit students in their own caseload
  if (role === 'case_manager') {
    return props.student.app?.studentData?.caseManagerId === userId
  }
  
  // Service providers can only edit students on their caseload
  if (role === 'service_provider') {
    return props.student.app?.staffIds?.includes(userId)
  }
  
  // Roles that can edit ALL students
  const canEditAllRoles = ['admin', 'school_admin', 'staff_edit', 'admin_504', 'sped_chair']
  return canEditAllRoles.includes(role)
})

// Determine if current user can send feedback forms for this student
const canSendFeedback = computed(() => {
  if (!props.currentUser?.role || !props.student || !props.studentData) return false
  
  return RoleUtils.canSendFeedback(
    props.currentUser.uid,
    props.currentUser.role,
    props.student,
    props.studentData
  )
})

// Helper function removed - now using centralized RoleUtils.canSendFeedback()

function formatDate(timestamp, shortFormat = false) {
  if (!timestamp?.seconds) return '';
  
  const date = new Date(timestamp.seconds * 1000);
  
  if (shortFormat) {
    return date.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: '2-digit'
    });
  }

  // Format: "July 10, 2025 at 9:56:30 PM UTC-7"
  return date.toLocaleDateString('en-US', { 
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }) + ' at ' + date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZoneName: 'short'
  });
}
</script>

<style scoped>
td {
  align-items: center;
  justify-content: flex-start;
  height: 100%;
  padding: 0.5rem !important;
  gap: 0.5rem;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
  border: initial;
  background: none;
  padding: 0;
  margin: 0 auto;
}

.action-buttons button {
  width: 40px;
  height: 40px;
  margin: 0 auto;
  border: solid #bfc7d1 1px;
}

/* Actions cell layout - simple approach */
.actions-cell {
  vertical-align: top;
  padding: 0.5rem !important;
}

.actions-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 60px;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
  flex-grow: 1;
}

/* Updated date container - simple bottom margin */
.action-updated-date {
  text-align: center;
  font-size: 0.75rem;
  color: #666;
  cursor: help;
  margin-top: 0.5rem;
  padding: 2px 0;
}
</style> 