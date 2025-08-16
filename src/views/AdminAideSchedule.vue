<template>
  <div class="admin-aide-schedule-detailed">
    <div class="header">
      <h1>Aide Schedule Management</h1>
      <div class="header-actions">
        <button @click="saveSchedule" class="btn btn-primary" :disabled="saving">
          <span v-if="saving">💾</span>
          <span v-else>💾</span>
          {{ saving ? 'Saving...' : 'Save Schedule' }}
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
        Loading aide schedules...
      </div>
      <div v-else class="schedule-container">
        <!-- Master Schedule View -->
        <AideScheduleMasterTable
          :paraeducators="paraeducators"
          :blocks="blocks"
          :getAideTimeBlocks="getAideTimeBlocks"
          :getAideName="getAideName"
          :currentTimeTable="currentTimeTable"
          @editAideAssignment="editAideSchedule"
          @gotoTimeTableConfig="() => router.push('/admin?tab=time-table')"
        >
          <template #tab-bar>
            <div v-if="allTimeTables.length > 1" class="time-table-tab-bar">
              <div
                v-for="tt in allTimeTables"
                :key="tt.id"
                :class="['tab-btn', { active: selectedTimeTable === tt.id }]"
                @click="selectedTimeTable = tt.id"
              >
                {{ tt.label }}
              </div>
            </div>
          </template>
        </AideScheduleMasterTable>

        <!-- Schedule Edit Dialog -->
        <AideScheduleEditDialog
          v-if="editingAideId"
          :aideName="getAideName(editingAideId)"
          :timeTicks="timeTicks"
          :isTickInAnyBlock="isTickActive"
          :aideAssignments="localAideAssignments"
          :getAssignmentBoxStyle="getAssignmentBoxStyle"
          :onAssignmentDragStart="onAssignmentDragStart"
          :onAssignmentDrag="onAssignmentDrag"
          :onAssignmentDragEnd="onAssignmentDragEnd"
          :onResizeStart="onResizeStart"
          :showAddAssignment="showAddAssignment"
          :addAssignment="addAssignment"
          :onImportAssignments="handleImportAssignments"
          :onSave="handleDialogSave"
          :onClose="closeEditor"
          :saving="saving"
          :blocks="blocks"
          :teachers="teachers"
          :students="students"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick, onBeforeUnmount, reactive, toRaw } from 'vue'
import { useRouter } from 'vue-router'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from '@/store/authStore'
import useUsers from '@/composables/useUsers'
import useStudents from '@/composables/useStudents'
import { useAppSettings } from '@/composables/useAppSettings'
import { usePeriodLabels } from '@/composables/usePeriodLabels'
import useAideSchedule from '@/composables/useAideSchedule'
import useAideAssignment from '@/composables/useAideAssignment'
import { getDisplayValue } from '@/utils/studentUtils'
import Draggable from 'vuedraggable'
import AideScheduleEditDialog from '@/components/AideScheduleEditDialog.vue'
import AideScheduleMasterTable from '@/components/AideScheduleMasterTable.vue'
import { getTimeTableBlocks, useTimeTicks, isTickInAnyBlock } from '@/composables/useTimeTable'

const router = useRouter()
const authStore = useAuthStore()
const { userList, fetchUsers } = useUsers()
const { students, fetchStudents } = useStudents()
const { appSettings, loadAppSettings, saveAppSettings } = useAppSettings()
const { labels: periodLabels } = usePeriodLabels()
const { aideSchedule, loadAideSchedules, saveAideSchedule, saveAllAideSchedules } = useAideSchedule()
const { aideAssignment, loadAideAssignments, saveAideAssignment } = useAideAssignment()

const loading = ref(true)
const saving = ref(false)
const editingAideId = ref(null)
const timeTableData = ref({})
const detailedSchedule = ref({})

// Add selectedTimeTable for radio selection
const selectedTimeTable = ref(null)

// Editable copy of blocks for drag-and-drop
const editableBlocks = ref([])

// For each block, keep a list of assignments (for drag-and-drop)
const blockAssignments = ref({})

// Computed list of all time tables (with fallback for single table)
const allTimeTables = computed(() => {
  if (timeTableData.value && Array.isArray(timeTableData.value.timeTables) && timeTableData.value.timeTables.length > 0) {
    return timeTableData.value.timeTables.map((tt, idx) => ({
      id: tt.name ? tt.name.toLowerCase().replace(/\s+/g, '-') : `tt-${idx}`,
      label: tt.name || `Time Table ${idx + 1}`,
      ...tt
    }))
  } else if (timeTableData.value && timeTableData.value.schedule) {
    return [{
      id: 'default',
      label: timeTableData.value.label || 'Default Schedule',
      schedule: timeTableData.value.schedule
    }]
  }
  return []
})

// Set default selected time table on load
onMounted(async () => {
  console.log('Loaded timeTableData:', timeTableData.value)
  console.log('Computed allTimeTables:', allTimeTables.value)
  if (allTimeTables.value.length > 0 && !selectedTimeTable.value) {
    selectedTimeTable.value = allTimeTables.value[0].id
    console.log('Set selectedTimeTable:', selectedTimeTable.value)
  }
  // Load app settings if needed
  await loadAppSettings();
  // Set timeTableData to always be an object with a timeTables array if available
  if (appSettings.value.timeTables && Array.isArray(appSettings.value.timeTables)) {
    timeTableData.value = { timeTables: appSettings.value.timeTables };
    console.log('Set timeTableData to timeTables array:', timeTableData.value);
  } else if (appSettings.value.schedule) {
    timeTableData.value = { schedule: appSettings.value.schedule };
    console.log('Set timeTableData to single schedule:', timeTableData.value);
  }
})

watch(allTimeTables, (newVal) => {
  console.log('allTimeTables changed:', newVal)
})

watch(selectedTimeTable, (newVal) => {
  console.log('selectedTimeTable changed:', newVal)
})

const currentTimeTable = computed(() => {
  const found = allTimeTables.value.find(tt => tt.id === selectedTimeTable.value) || allTimeTables.value[0]
  console.log('currentTimeTable:', found)
  return found
})

// Use composable for blocks and ticks
const blocks = computed(() => getTimeTableBlocks(currentTimeTable.value))
const timeTicks = useTimeTicks(blocks)

function isTickActive(tickTime) {
  return isTickInAnyBlock(tickTime, blocks.value)
}

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
  // Use period labels from composable
  return periodLabels.value
})

// Load time table data
async function loadTimeTableData() {
  try {
    const timeTableDoc = await getDoc(doc(db, 'app_settings', 'global'))
    if (timeTableDoc.exists()) {
      const data = timeTableDoc.data()
      if (data.timeTables && Array.isArray(data.timeTables)) {
        timeTableData.value = { timeTables: data.timeTables }
      } else if (data.timeTable) {
        timeTableData.value = { timeTables: [data.timeTable] }
      } else if (data.schedule) {
        timeTableData.value = { schedule: data.schedule }
      } else {
        timeTableData.value = {}
      }
      console.log('Loaded time table data:', timeTableData.value)
    } else {
      console.log('No time table document found')
    }
  } catch (error) {
    console.error('Error loading time table:', error)
  }
}

// Get aide time blocks with integrated assignments
function getAideTimeBlocks(aideId) {
  if (!blocks.value) return []
  
  console.log('DEBUG: getAideTimeBlocks called for aide:', aideId)
  console.log('DEBUG: aideSchedule.value:', aideSchedule.value)
  console.log('DEBUG: aideAssignment.value:', aideAssignment.value)
  
  // Get the aide's individual schedule
  const aideData = aideSchedule.value[aideId] || {}
  const aideScheduleData = aideData.schedule || {}
  
  console.log('DEBUG: aideScheduleData:', aideScheduleData)
  
  // For bar graph view, return all individual assignments
  const individualAssignments = Object.values(aideScheduleData)
    .filter(assignment => assignment.start && assignment.end && assignment.label)
    .map(assignment => ({
      id: assignment.id || assignment.blockId || `assignment-${Date.now()}`,
      assignment: assignment.label,
      assignmentType: assignment.type || 'custom',
      displayTime: `${assignment.start} - ${assignment.end}`,
      start: assignment.start,
      end: assignment.end
    }))
  
  console.log('DEBUG: individualAssignments:', individualAssignments)
  
  // If we have individual assignments, return them
  if (individualAssignments.length > 0) {
    return individualAssignments
  }
  
  // TEMPORARY: Add test data to verify bar graph is working
  console.log('DEBUG: No individual assignments found, adding test data')
  return [
    {
      id: 'test-1',
      assignment: 'Test Class Assignment',
      assignmentType: 'class',
      displayTime: '08:00 - 09:00',
      start: '08:00',
      end: '09:00'
    },
    {
      id: 'test-2', 
      assignment: 'Test Student Assignment',
      assignmentType: 'student',
      displayTime: '10:00 - 11:00',
      start: '10:00',
      end: '11:00'
    }
  ]
}

// Get aide name
function getAideName(aideId) {
  const aide = paraeducators.value.find(a => a.id === aideId)
  return aide ? aide.name || aide.email : 'Unknown Aide'
}

// Get class assignment for an aide in a specific period
function getClassAssignmentForAide(aideId, periodNumber) {
  const aideData = aideSchedule.value[aideId]
  if (!aideData || !aideData.classAssignment || !aideData.classAssignment[periodNumber]) {
    return null
  }
  
  const teacherIds = Array.isArray(aideData.classAssignment[periodNumber]) 
    ? aideData.classAssignment[periodNumber] 
    : [aideData.classAssignment[periodNumber]]
  
  const teacherNames = teacherIds
    .filter(id => id && id !== '')
    .map(teacherId => {
      const teacher = teachers.value.find(t => t.id === teacherId)
      return teacher ? teacher.name || teacher.email : 'Unknown Teacher'
    })
  
  return teacherNames.length > 0 ? teacherNames.join(', ') : null
}

// Edit aide schedule
function editAideSchedule(aideId) {
  editingAideId.value = aideId
  showAddAssignment.value = true
}

// Close editor
function closeEditor() {
  editingAideId.value = null
}

// Save schedule
async function saveSchedule() {
  try {
    saving.value = true
    
    // Merge detailed schedule with existing app settings
    const currentSettings = await loadAppSettings()
    const updatedSettings = {
      ...currentSettings,
      detailedAideSchedule: detailedSchedule.value
    }
    
    await saveAppSettings(updatedSettings)
    console.log('Detailed aide schedule saved successfully')
  } catch (error) {
    console.error('Error saving detailed aide schedule:', error)
  } finally {
    saving.value = false
  }
}

// Go back
function goBack() {
  router.push('/admin')
}

// Load data
async function loadData() {
  try {
    loading.value = true
    await Promise.all([
      fetchUsers(),
      fetchStudents(),
      loadAppSettings()
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

function getAssignmentValue(timeBlock, aideId) {
  return (timeBlock.assignments && timeBlock.assignments[aideId]) || ''
}
function setAssignmentValue(timeBlock, aideId, value) {
  if (!timeBlock.assignments) timeBlock.assignments = {}
  timeBlock.assignments[aideId] = value
}
function getTimeValue(timeBlock, aideId, suffix) {
  return (timeBlock.assignments && timeBlock.assignments[aideId + suffix]) || ''
}
function setTimeValue(timeBlock, aideId, suffix, value) {
  if (!timeBlock.assignments) timeBlock.assignments = {}
  timeBlock.assignments[aideId + suffix] = value
}

function handleImportAssignments() {
  console.log('DEBUG: handleImportAssignments called')
  console.log('DEBUG: editingAideId.value:', editingAideId.value)
  console.log('DEBUG: aideAssignment.value:', aideAssignment.value)
  console.log('DEBUG: All aide IDs:', Object.keys(aideAssignment.value))
  console.log('DEBUG: All aide data:', Object.entries(aideAssignment.value).map(([id, data]) => ({ id, keys: Object.keys(data) })))
  
  if (!editingAideId.value || !aideAssignment.value[editingAideId.value]) {
    console.log('DEBUG: No aide data found')
    alert('No aide assignment data found for this aide.')
    return
  }
  
  // Warn user about removing current assignments
  const currentAssignmentsCount = localAideAssignments.value.length
  if (currentAssignmentsCount > 0) {
    const confirmRemove = confirm(`WARNING: This will remove ${currentAssignmentsCount} current assignments and replace them with imported assignments.\n\nDo you want to continue?`)
    if (!confirmRemove) {
      return
    }
  }
  
  const aideData = aideAssignment.value[editingAideId.value]
  console.log('DEBUG: aideData:', aideData)
  console.log('DEBUG: aideData.classAssignment:', aideData.classAssignment)
  console.log('DEBUG: aideData.directAssignment:', aideData.directAssignment)
  console.log('DEBUG: Object.keys(aideData):', Object.keys(aideData))
  console.log('DEBUG: aideData.schedule:', aideData.schedule)
  console.log('DEBUG: typeof aideData.schedule:', typeof aideData.schedule)
  console.log('DEBUG: Array.isArray(aideData.schedule):', Array.isArray(aideData.schedule))
  
  let importedCount = 0
  
  // Clear current assignments
  localAideAssignments.value = []
  
  // First, import class assignments (period-based)
  const timeTableBlocks = getTimeTableBlocks(currentTimeTable.value)
  console.log('DEBUG: timeTableBlocks:', timeTableBlocks)
  console.log('DEBUG: timeTableBlocks with period numbers:', timeTableBlocks.map(b => ({ name: b.name, periodNumber: b.periodNumber, type: b.type })))
  
  for (const block of timeTableBlocks) {
    console.log('DEBUG: Processing block:', block)
    console.log('DEBUG: Block periodNumber:', block.periodNumber)
    console.log('DEBUG: Block name:', block.name)
    console.log('DEBUG: Available classAssignment keys:', Object.keys(aideData.classAssignment || {}))
    
    // Extract period number from block name if periodNumber is undefined
    let periodNumber = block.periodNumber
    if (!periodNumber && block.name) {
      const periodMatch = block.name.match(/Period\s*(\d+)/i)
      if (periodMatch) {
        periodNumber = periodMatch[1]
        console.log('DEBUG: Extracted periodNumber from name:', periodNumber)
      }
    }
    
    let assignment = ''
    let teacherNames = []
    
    // Try periodNumber first
    if (periodNumber && aideData.classAssignment && aideData.classAssignment[periodNumber]) {
      console.log('DEBUG: Found class assignment for periodNumber:', periodNumber)
      const teacherIds = Array.isArray(aideData.classAssignment[periodNumber])
        ? aideData.classAssignment[periodNumber]
        : [aideData.classAssignment[periodNumber]]
      
      teacherNames = teacherIds
        .filter(Boolean)
        .map(teacherId => {
          const teacher = teachers.value.find(t => t.id === teacherId)
          return teacher ? teacher.name || teacher.email : 'Unknown Teacher'
        })
      
      assignment = teacherIds.filter(Boolean).map(id => `teacher:${id}`).join(',')
      console.log('DEBUG: Created assignment for periodNumber:', assignment)
    }
    
    // If not found, try matching by block name
    if (!assignment && block.name && aideData.classAssignment) {
      console.log('DEBUG: Trying to match by block name:', block.name)
      const matchKey = Object.keys(aideData.classAssignment).find(
        key => key.toLowerCase().trim() === block.name.toLowerCase().trim()
      )
      if (matchKey) {
        console.log('DEBUG: Found match by block name:', matchKey)
        const teacherIds = Array.isArray(aideData.classAssignment[matchKey])
          ? aideData.classAssignment[matchKey]
          : [aideData.classAssignment[matchKey]]
        
        teacherNames = teacherIds
          .filter(Boolean)
          .map(teacherId => {
            const teacher = teachers.value.find(t => t.id === teacherId)
            return teacher ? teacher.name || teacher.email : 'Unknown Teacher'
          })
        
        assignment = teacherIds.filter(Boolean).map(id => `teacher:${id}`).join(',')
        console.log('DEBUG: Created assignment for block name:', assignment)
      }
    }
    
    if (assignment) {
      // Create 30-minute assignment
      const startTime = block.startTime
      const endTime = addMinutesToTime(block.startTime, 30)
      
      // Get teacherIds from the assignment string
      const teacherIds = assignment.split(',').map(a => a.replace('teacher:', '')).filter(Boolean)
      
      // Create assignment object with type and label
      // For multiple teachers, we'll use the first one in the dialog but show all in the label
      const newAssignment = {
        id: `imported-class-${Date.now()}-${importedCount}`,
        label: teacherNames.join(', '),
        start: startTime,
        end: endTime,
        type: 'class',
        blockId: `imported-block-${importedCount}`,
        teacherId: teacherIds[0] || '', // Use the first teacher ID for the dialog
        note: teacherIds.length > 1 ? `Multiple teachers: ${teacherNames.join(', ')}` : ''
      }
      
      console.log('DEBUG: Adding new assignment:', newAssignment)
      localAideAssignments.value.push(newAssignment)
      importedCount++
    }
  }
  
  // Then, import direct student assignments
  console.log('DEBUG: Checking direct assignments...')
  console.log('DEBUG: aideData.directAssignment:', aideData.directAssignment)
  console.log('DEBUG: typeof aideData.directAssignment:', typeof aideData.directAssignment)
  console.log('DEBUG: Array.isArray(aideData.directAssignment):', Array.isArray(aideData.directAssignment))
  
  if (aideData.directAssignment) {
    console.log('DEBUG: Found directAssignment:', aideData.directAssignment)
    const directStudentIds = Array.isArray(aideData.directAssignment) 
      ? aideData.directAssignment 
      : [aideData.directAssignment]
    
    console.log('DEBUG: directStudentIds:', directStudentIds)
    console.log('DEBUG: students.value length:', students.value?.length)
    console.log('DEBUG: students.value sample:', students.value?.slice(0, 3))
    
    for (const studentId of directStudentIds) {
      console.log('DEBUG: Processing studentId:', studentId)
      if (studentId && studentId !== '') {
        const student = students.value.find(s => s.id === studentId)
        console.log('DEBUG: Found student:', student)
        if (student) {
          const studentName = `${getDisplayValue(student, 'firstName')} ${getDisplayValue(student, 'lastName')}`
          console.log('DEBUG: Student name:', studentName)
          
          // Find a suitable time block for direct assignment (use first period block)
          const firstPeriodBlock = getTimeTableBlocks(currentTimeTable.value).find(block => block.type === 'period')
          console.log('DEBUG: First period block:', firstPeriodBlock)
          if (firstPeriodBlock) {
            const startTime = firstPeriodBlock.startTime
            const endTime = addMinutesToTime(firstPeriodBlock.startTime, 30)
            
            const newAssignment = {
              id: `imported-direct-${Date.now()}-${importedCount}`,
              label: studentName,
              start: startTime,
              end: endTime,
              type: 'student',
              blockId: `imported-direct-block-${importedCount}`,
              studentId: studentId
            }
            
            console.log('DEBUG: Adding direct assignment:', newAssignment)
            localAideAssignments.value.push(newAssignment)
            importedCount++
          }
        }
      }
    }
  } else {
    console.log('DEBUG: No directAssignment found')
  }
  
  console.log('DEBUG: Final importedCount:', importedCount)
  console.log('DEBUG: Final localAideAssignments:', localAideAssignments.value)
  
  if (importedCount > 0) {
    alert(`Successfully imported ${importedCount} assignments with 30-minute time spans.\n\nTypes: Class assignments set to 'class', Direct assignments set to 'student'\nLabels: Teacher names for class assignments, Student names for direct assignments\nDuration: 30 minutes each`)
    // Save imported assignments to Firestore immediately
    const aideId = editingAideId.value
    const aideData = aideSchedule.value[aideId] || {}
    // Build new schedule object
    const schedule = {}
    localAideAssignments.value.forEach(assignment => {
      const blockId = assignment.blockId || assignment.id || `block-${Date.now()}-${Math.random().toString(36).slice(2)}`
      schedule[blockId] = {
        id: assignment.id,
        blockId: blockId,
        type: assignment.type,
        label: assignment.label,
        start: assignment.start,
        end: assignment.end,
        note: assignment.note,
        teacherId: assignment.teacherId,
        studentId: assignment.studentId
      }
    })
    const updatedAideData = {
      ...aideData,
      schedule: schedule
    }
    saveAideSchedule(aideId, updatedAideData).then(() => {
      loadAideSchedules().then(() => {
        closeEditor();
        nextTick(() => {
          editAideSchedule(aideId);
        });
      });
    })
  } else {
    alert('No matching assignments found in the Aide Assignment data for this schedule.')
  }
}

// Helper function to add minutes to time
function addMinutesToTime(time, minutes) {
  const [hours, mins] = time.split(':').map(Number)
  const totalMinutes = hours * 60 + mins + minutes
  const newHours = Math.floor(totalMinutes / 60)
  const newMins = totalMinutes % 60
  return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`
}

watch(
  () => getTimeTableBlocks(currentTimeTable.value),
  (blocks) => {
    // Initialize blockAssignments for each block
    const assignmentsMap = {}
    for (const block of blocks) {
      const assignmentVal = getAssignmentValue(block, editingAideId.value)
      assignmentsMap[block.id] = assignmentVal ? [{ id: assignmentVal, value: assignmentVal }] : []
    }
    blockAssignments.value = assignmentsMap
  },
  { immediate: true }
)

function onAssignmentDragStart(e, assignment) {
  draggingAssignment.value = assignment
  dragStartY.value = e.clientY
  dragStartIdx.value = timeTicks.value.findIndex(t => t.time === assignment.start)
  dragOffset.value = 0
  e.dataTransfer.effectAllowed = 'move'
  // For Firefox compatibility
  e.dataTransfer.setData('text/plain', assignment.id)
}

function onAssignmentDrag(e, assignment) {
  if (!draggingAssignment.value || e.clientY === 0) return
  const rowHeight = 24
  const deltaY = e.clientY - dragStartY.value
  dragOffset.value = deltaY
  // Optionally, visually move the box (CSS transform)
  assignment._dragOffset = deltaY
}

function onAssignmentDragEnd(e, assignment) {
  if (!draggingAssignment.value) return
  const rowHeight = 24
  const totalTicks = timeTicks.value.length
  // Calculate new start index
  let newIdx = dragStartIdx.value + Math.round(dragOffset.value / rowHeight)
  newIdx = Math.max(0, Math.min(totalTicks - 2, newIdx)) // -2 to ensure at least 1 tick duration
  // Snap to nearest tick
  const newStart = timeTicks.value[newIdx].time
  // Keep the same duration
  const durationTicks = timeTicks.value.findIndex(t => t.time === assignment.end) - dragStartIdx.value
  let newEndIdx = newIdx + durationTicks
  newEndIdx = Math.max(newIdx + 1, Math.min(totalTicks - 1, newEndIdx))
  const newEnd = timeTicks.value[newEndIdx].time
  // Update assignment
  assignment.start = newStart
  assignment.end = newEnd
  assignment._dragOffset = 0
  draggingAssignment.value = null
  dragOffset.value = 0
}

// Update getAssignmentBoxStyle to use _dragOffset for visual feedback and color by type
function getAssignmentBoxStyle(assignment) {
  const startIdx = timeTicks.value.findIndex(t => t.time === assignment.start)
  const endIdx = timeTicks.value.findIndex(t => t.time === assignment.end)
  const rowHeight = 24
  if (startIdx === -1 || endIdx === -1) {
    return { display: 'none' }
  }
  const top = startIdx * rowHeight + (assignment._dragOffset || 0)
  const height = Math.max((endIdx - startIdx) * rowHeight, rowHeight)
  
  // Color-code by assignment type
  let backgroundColor, borderColor
  if (assignment.type === 'class') {
    backgroundColor = '#e8f4fd' // Light blue for class assignments
    borderColor = '#4a90e2'
  } else if (assignment.type === 'student') {
    backgroundColor = '#f0f8e8' // Light green for student assignments
    borderColor = '#7cb342'
  } else {
    backgroundColor = '#f5f5f5' // Light gray for unknown types
    borderColor = '#9e9e9e'
  }
  
  return {
    position: 'absolute',
    left: '20px',
    top: `${top}px`,
    height: `${height}px`,
    width: '200px',
    minHeight: '24px',
    background: backgroundColor,
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    color: '#333',
    border: `2px solid ${borderColor}`,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    cursor: 'grab',
    zIndex: 2,
    transition: draggingAssignment.value === assignment ? 'none' : 'top 0.2s',
  }
}

function handleAddAssignment() {
  // Add a new assignment block to localAideAssignments with default values
  const defaultStart = blocks.value && blocks.value.length > 0 ? blocks.value[0].startTime : '08:00'
  const defaultEnd = blocks.value && blocks.value.length > 0 ? blocks.value[0].endTime : '08:30'
  localAideAssignments.value.push({
    id: `custom:${Date.now()}`,
    label: '',
    start: defaultStart,
    end: defaultEnd,
    blockId: `block-${Date.now()}`
  })
}

const showAddAssignment = ref(false)

const timeGridRef = ref(null)
const draggingAssignment = ref(null)
const dragStartY = ref(0)
const dragStartIdx = ref(0)
const dragOffset = ref(0)

const localAideAssignments = ref([])

watch(editingAideId, (newAideId) => {
  if (!newAideId) {
    localAideAssignments.value = []
    return
  }
  // Load assignments from the aide's schedule field in Firestore
  const aideData = aideSchedule.value[newAideId] || {}
  const schedule = aideData.schedule || {}
  localAideAssignments.value = Object.entries(schedule).map(([blockId, data]) => ({
    id: blockId + '-' + (newAideId || ''),
    label: data.label || '',
    start: data.start,
    end: data.end,
    blockId: blockId,
    type: data.type || 'lunch', // Preserve type
    teacherId: data.teacherId || '', // Preserve teacherId
    studentId: data.studentId || '', // Preserve studentId
    note: data.note || '' // Preserve note
  }))
}, { immediate: true })

async function handleDialogSave(updatedAssignments) {
  if (!editingAideId.value) return
  
  try {
    saving.value = true
    
    // Get the current aide data to preserve classAssignment and directAssignment
    const currentAideData = aideSchedule.value[editingAideId.value] || {}
    
    // Create the new schedule data
    const schedule = {}
    updatedAssignments.forEach(assignment => {
      // Ensure blockId is present and unique
      const blockId = assignment.blockId || assignment.id || `block-${Date.now()}-${Math.random().toString(36).slice(2)}`
      schedule[blockId] = {
        id: assignment.id,
        blockId: blockId,
        type: assignment.type,
        label: assignment.label,
        start: assignment.start,
        end: assignment.end,
        note: assignment.note,
        teacherId: assignment.teacherId,
        studentId: assignment.studentId
      }
    })
    
    // Preserve existing assignment data while updating schedule
    const updatedAideData = {
      ...currentAideData,
      schedule: schedule
    }
    
    await saveAideSchedule(editingAideId.value, updatedAideData)
    await loadAideSchedules()
    closeEditor()
    alert('Schedule saved!')
  } catch (error) {
    alert('Failed to save schedule: ' + error.message)
  } finally {
    saving.value = false
  }
}

watch(() => blocks, (val) => {
  console.log('DEBUG: blocks', val)
}, { immediate: true })

watch(editingAideId, (val) => {
  if (val) {
    console.log('DEBUG: Opening edit dialog for aide', val)
    console.log('DEBUG: blocks passed to dialog', blocks.value)
  }
})

// Add missing functions that are referenced in template
function onResizeStart(e, assignment) {
  // Placeholder for resize functionality
  console.log('Resize start:', assignment)
}

function addAssignment() {
  handleAddAssignment()
}

// Helper function to reload dialog assignments for the current aide
function reloadDialogAssignments() {
  if (!editingAideId.value) {
    localAideAssignments.value = []
    return
  }
  const aideData = aideSchedule.value[editingAideId.value] || {}
  const schedule = aideData.schedule || {}
  localAideAssignments.value = Object.entries(schedule).map(([blockId, data]) => ({
    id: blockId + '-' + (editingAideId.value || ''),
    label: data.label || '',
    start: data.start,
    end: data.end,
    blockId: blockId,
    type: data.type || 'lunch',
    teacherId: data.teacherId || '',
    studentId: data.studentId || '',
    note: data.note || ''
  }))
}
</script> 