<template>
  <fieldset class="form-col">
    <legend>Schedule</legend>
    <div class="periods-container">
      <template v-for="period in periods" :key="period">
        <div class="period-row">
          <!-- Period Label and Teacher Dropdown -->
          <div class="period-main">
            <label class="period-label">{{ getLabel(period) }}:</label>
            <select 
              :value="getTeacherValue(period)"
              @change="setTeacherValue(period, $event.target.value)"
              class="teacher-select"
            >
            <option value="">--</option>
            <option v-for="teacher in sortedTeachers" :key="teacher.id" :value="teacher.id">
              {{ teacher.name || teacher.email || teacher.id }}
            </option>
          </select>
            
            <!-- Co-Teaching Toggle Button -->
            <button 
              type="button"
              class="coteaching-toggle"
              :class="{ active: isCoTeachingActive(period) }"
              :disabled="!getTeacherValue(period)"
              @click="toggleCoTeaching(period)"
              title="Co-Teaching"
            >
              C
            </button>
          </div>
          
          <!-- Co-Teaching Configuration (shown when C button is active) -->
          <div v-if="isCoTeachingActive(period)" class="coteaching-config">
            <div class="coteaching-info">
              <span class="coteaching-label">Co-Teaching:</span>
              <span class="classroom-teacher">{{ getTeacherName(getTeacherValue(period)) }}</span>
              <span class="plus-sign">+</span>
              <span class="case-manager-name">{{ getCaseManagerName(getCoTeachingCaseManager(period)) }}</span>
            </div>
            
            <div class="config-row">
              <label class="config-label">Subject:</label>
              <select 
                :value="getCoTeachingSubject(period)"
                @change="updateCoTeachingSubject(period, $event.target.value)"
                class="subject-select"
                required
              >
                <option value="">-- Select Subject --</option>
                <option 
                  v-for="subject in coTeachSubjects" 
                  :key="subject" 
                  :value="subject"
                >
                  {{ subject }}
                </option>
              </select>
            </div>
            
            <div class="config-row">
              <label class="config-label">Case Manager:</label>
              <select 
                :value="getCoTeachingCaseManager(period)"
                @change="updateCoTeachingCaseManager(period, $event.target.value)"
                class="cm-select"
                
              >
                <option value="">-- Select Case Manager --</option>
                <option 
                  v-for="cm in availableCaseManagers" 
                  :key="cm.id" 
                  :value="cm.id"
                >
                  {{ cm.name || cm.email || cm.id }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </template>
    </div>
  </fieldset>
</template>

<script setup>
import { computed, watch } from 'vue'
import { getTeacherIdFromPeriod, getCoTeachingCaseManagerFromPeriod, createPeriodData } from '@/utils/scheduleUtils'
import { usePeriodLabels } from '@/composables/usePeriodLabels'

// Props
const props = defineProps({
  form: { type: Object, required: true },
  periods: { type: Array, required: true },
  userRoles: { type: Object, required: true },
  appSettings: { type: Object, default: () => ({}) }
})

// Period labels composable
const { getLabel } = usePeriodLabels()

// Sorted teachers for dropdown (by last name)
const sortedTeachers = computed(() => {
  const teachers = props.userRoles.teachers || []
  return teachers.sort((a, b) => {
    // Extract last names for sorting
    const getLastName = (user) => {
      const fullName = user.name || user.email || user.id
      const nameParts = fullName.split(' ')
      return nameParts.length > 1 ? nameParts[nameParts.length - 1] : fullName
    }
    return getLastName(a).localeCompare(getLastName(b))
  })
})

// Available case managers (filter to only those with case_manager role)
const availableCaseManagers = computed(() => {
  const caseManagers = props.userRoles.caseManagers || []
  return caseManagers.filter(cm => 
    cm.id && 
    (cm.role === 'case_manager' || 
             cm.role === 'admin_504' || cm.role === 'administrator_504_CM' ||
     cm.role === 'sped_chair' ||
     (cm.roles && cm.roles.includes('case_manager')))
  ).sort((a, b) => {
    // Extract last names for sorting
    const getLastName = (user) => {
      const fullName = user.name || user.email || user.id
      const nameParts = fullName.split(' ')
      return nameParts.length > 1 ? nameParts[nameParts.length - 1] : fullName
    }
    return getLastName(a).localeCompare(getLastName(b))
  })
})

// Co-teach subjects from app settings (only from Co-teach class service)
const coTeachSubjects = computed(() => {
  if (props.appSettings?.classServices) {
    const coTeachService = props.appSettings.classServices.find(service => 
      service.name === 'Co-teach' && service.enabledSubcategories
    )
    if (coTeachService) {
      return coTeachService.enabledSubcategories.sort()
    }
  }
  
  // Fallback to default subjects if Co-teach not configured
  return ['English', 'Math', 'History', 'Science']
})

// Get teacher value for dropdown (always returns string ID)
const getTeacherValue = (period) => {
  const periodData = props.form.schedule[period]
  if (typeof periodData === 'string') {
    return periodData
  }
  if (typeof periodData === 'object' && periodData !== null) {
    return periodData.teacherId || ''
  }
  return ''
}

// Set teacher value from dropdown
const setTeacherValue = (period, teacherId) => {
  debugProcess('SET_TEACHER_START', {
    period,
    teacherId,
    isCoTeachingActive: isCoTeachingActive(period),
    currentValue: props.form.schedule[period]
  })
  
  if (isCoTeachingActive(period)) {
    // Preserve co-teaching data when changing teacher
    const caseManagerId = getCoTeachingCaseManager(period)
    const subject = getCoTeachingSubject(period)
    
    // Create object with new teacher ID but same co-teaching data
    props.form.schedule[period] = {
      teacherId: teacherId,
      coTeaching: {
        caseManagerId: caseManagerId,
        subject: subject
      }
    }
    
    debugProcess('SET_TEACHER_COTEACHING', {
      period,
      newValue: props.form.schedule[period]
    })
  } else {
    // Simple string assignment for non-co-teaching periods
    if (teacherId && teacherId.trim() !== '' && teacherId.trim() !== '--') {
      // Set the teacher ID if it's not empty
      props.form.schedule[period] = teacherId
      
      debugProcess('SET_TEACHER_SIMPLE', {
        period,
        newValue: props.form.schedule[period]
      })
    } else {
      // Remove the period entirely if teacher is cleared
      delete props.form.schedule[period]
      
      debugProcess('CLEAR_TEACHER', {
        period,
        action: 'deleted_period_key'
      })
    }
  }
}

// Get teacher name
const getTeacherName = (teacherId) => {
  if (!teacherId) return 'Unknown'
  const teacher = (props.userRoles.teachers || []).find(t => t.id === teacherId)
  return teacher ? (teacher.name || teacher.email || teacherId) : teacherId
}

// Get case manager name
const getCaseManagerName = (caseManagerId) => {
  if (!caseManagerId) return 'Select Case Manager'
  const caseManager = availableCaseManagers.value.find(cm => cm.id === caseManagerId)
  return caseManager ? (caseManager.name || caseManager.email || caseManagerId) : caseManagerId
}

// Check if co-teaching is active for a period
const isCoTeachingActive = (period) => {
  const periodData = props.form.schedule[period]
  if (typeof periodData === 'object' && periodData !== null) {
    return !!(periodData.coTeaching?.caseManagerId)
  }
  return false
}

// Get current co-teaching case manager for a period
const getCoTeachingCaseManager = (period) => {
  const periodData = props.form.schedule[period]
  if (typeof periodData === 'object' && periodData !== null) {
    return periodData.coTeaching?.caseManagerId || ''
  }
  return ''
}

// Get current co-teaching subject for a period
const getCoTeachingSubject = (period) => {
  const periodData = props.form.schedule[period]
  if (typeof periodData === 'object' && periodData !== null) {
    return periodData.coTeaching?.subject || ''
  }
  return ''
}

// Debug helper for tracking timing and process
const debugProcess = (stage, data) => {
  const timestamp = new Date().toISOString()
  console.log(`🕒 [${timestamp}] Schedule Process: ${stage}`, data)
}

// Update co-teaching case manager
const updateCoTeachingCaseManager = (period, caseManagerId) => {
  debugProcess('UPDATE_CM_START', {
    period,
    caseManagerId,
    currentValue: props.form.schedule[period]
  })

  const teacherId = getTeacherValue(period)
  const subject = getCoTeachingSubject(period)
  
  if (teacherId) {
    props.form.schedule[period] = {
      teacherId: teacherId,
      coTeaching: {
        caseManagerId: caseManagerId,
        subject: subject
      }
    }
    
    debugProcess('UPDATE_CM_COMPLETE', {
      period,
      newValue: props.form.schedule[period]
    })
    
    // Additional debugging for case manager updates
    console.log('🔍 CO-TEACHING DEBUG - Case Manager Updated:', {
      period,
      periodType: typeof period,
      caseManagerId,
      teacherId,
      subject,
      finalValue: props.form.schedule[period],
      entireSchedule: JSON.stringify(props.form.schedule, null, 2)
    })
  } else {
    debugProcess('UPDATE_CM_BLOCKED', {
      reason: 'No teacher ID',
      period
    })
  }
}

// Update co-teaching subject
const updateCoTeachingSubject = (period, subject) => {
  debugProcess('UPDATE_SUBJECT_START', {
    period,
    subject,
    currentValue: props.form.schedule[period]
  })

  const teacherId = getTeacherValue(period)
  const caseManagerId = getCoTeachingCaseManager(period)
  
  if (teacherId) {
    props.form.schedule[period] = {
      teacherId: teacherId,
      coTeaching: {
        caseManagerId: caseManagerId,
        subject: subject
      }
    }
    
    debugProcess('UPDATE_SUBJECT_COMPLETE', {
      period,
      newValue: props.form.schedule[period]
    })
    
    // Additional debugging for subject updates
    console.log('🔍 CO-TEACHING DEBUG - Subject Updated:', {
      period,
      periodType: typeof period,
      subject,
      teacherId,
      caseManagerId,
      finalValue: props.form.schedule[period],
      entireSchedule: JSON.stringify(props.form.schedule, null, 2)
    })
  } else {
    debugProcess('UPDATE_SUBJECT_BLOCKED', {
      reason: 'No teacher ID',
      period
    })
  }
}

// Toggle co-teaching for a period
const toggleCoTeaching = (period) => {
  debugProcess('TOGGLE_START', {
    period,
    currentValue: props.form.schedule[period],
    formVersion: props.formVersion
  })

  const teacherId = getTeacherValue(period)
  if (!teacherId) {
    debugProcess('TOGGLE_BLOCKED', {
      reason: 'No teacher selected',
      period
    })
    return
  }
  
  const isActive = isCoTeachingActive(period)
  
  debugProcess('TOGGLE_STATE', {
    period,
    isActive,
    teacherId,
    beforeValue: props.form.schedule[period]
  })
  
  if (isActive) {
    // Disable co-teaching - revert to simple string format
    props.form.schedule[period] = teacherId
  } else {
    // Enable co-teaching - convert to object format with defaults
    const coTeachingObject = {
      teacherId: teacherId,
      coTeaching: {
        caseManagerId: availableCaseManagers.value[0]?.id || '',
        subject: coTeachSubjects.value[0] || ''
      }
    }
    
    // Force reactivity by using Vue's reactivity system
    props.form.schedule[period] = coTeachingObject
    
    // Add a timeout to check if the data persists
    setTimeout(() => {
      console.log('🔍 CO-TEACHING PERSISTENCE CHECK - 100ms later:', {
        period,
        stillExists: !!props.form.schedule[period],
        currentValue: props.form.schedule[period],
        isObject: typeof props.form.schedule[period] === 'object',
        hasCoTeaching: !!(props.form.schedule[period]?.coTeaching)
      })
    }, 100)
    
    setTimeout(() => {
      console.log('🔍 CO-TEACHING PERSISTENCE CHECK - 1000ms later:', {
        period,
        stillExists: !!props.form.schedule[period],
        currentValue: props.form.schedule[period],
        isObject: typeof props.form.schedule[period] === 'object',
        hasCoTeaching: !!(props.form.schedule[period]?.coTeaching)
      })
    }, 1000)
  }
  
  debugProcess('TOGGLE_COMPLETE', {
    period,
    afterValue: props.form.schedule[period],
    formVersion: props.formVersion
  })
  
  // Add additional debugging for co-teaching save issues
  console.log('🔍 CO-TEACHING DEBUG - Toggle Complete:', {
    period,
    periodType: typeof period,
    isActive: !isActive, // Will be the new state
    finalValue: props.form.schedule[period],
    entireSchedule: JSON.stringify(props.form.schedule, null, 2),
    availableCaseManagers: availableCaseManagers.value.length,
    availableSubjects: coTeachSubjects.value.length
  })
}

// Watch for changes to the schedule to detect when co-teaching data disappears
watch(() => props.form.schedule, (newSchedule, oldSchedule) => {
  console.log('🔍 SCHEDULE WATCHER - Schedule changed:', {
    timestamp: new Date().toISOString(),
    newSchedule: JSON.stringify(newSchedule, null, 2),
    oldSchedule: JSON.stringify(oldSchedule, null, 2),
    periodsWithObjects: Object.keys(newSchedule).filter(p => typeof newSchedule[p] === 'object'),
    periodsWithCoTeaching: Object.keys(newSchedule).filter(p => newSchedule[p]?.coTeaching)
  })
}, { deep: true })
</script>

<style scoped>
.periods-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.period-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.period-main {
  display: grid;
  grid-template-columns: 60px 1fr auto;
  gap: 8px;
  align-items: center;
}

.period-label {
  font-weight: 600;
  color: #333;
  font-size: 14px;
  text-align: right;
}

.teacher-select {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: white;
}

.teacher-select:focus {
  outline: none;
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
}

.coteaching-toggle {
  width: 32px;
  height: 32px;
  border: 2px solid #1976d2;
  background: white;
  color: #1976d2;
  border-radius: 4px;
  font-weight: bold;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.coteaching-toggle:hover:not(:disabled) {
  background: #e3f2fd;
}

.coteaching-toggle.active {
  background: #1976d2;
  color: white;
}

.coteaching-toggle:disabled {
  border-color: #ccc;
  color: #ccc;
  cursor: not-allowed;
}

.coteaching-config {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 12px;
  margin-left: 68px; /* Align with teacher dropdown */
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.coteaching-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #e8f4fd;
  border-radius: 4px;
  border: 1px solid #90caf9;
}

.coteaching-label {
  font-weight: 600;
  color: #1565c0;
  font-size: 13px;
}

.classroom-teacher {
  font-weight: 500;
  color: #1976d2;
}

.plus-sign {
  font-weight: bold;
  color: #333;
}

.case-manager-name {
  font-weight: 500;
  color: #2e7d32;
}

.config-row {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 8px;
  align-items: center;
}

.config-label {
  font-size: 13px;
  font-weight: 600;
  color: #555;
}

.subject-select, .cm-select {
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: white;
}

.subject-select:focus, .cm-select:focus {
  outline: none;
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
}

.subject-select:invalid, .cm-select:invalid {
  border-color: #d32f2f;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .period-main {
    grid-template-columns: 50px 1fr auto;
    gap: 6px;
  }
  
  .coteaching-config {
    margin-left: 56px;
  }
  
  .config-row {
    grid-template-columns: 80px 1fr;
    gap: 6px;
  }
  
  .coteaching-info {
    flex-wrap: wrap;
    gap: 4px;
  }
}
</style> 