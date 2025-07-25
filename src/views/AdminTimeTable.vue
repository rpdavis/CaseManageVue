<template>
  <div class="admin-time-table">
    <div class="header">
      <h1>Time Table Management</h1>
      <div class="admin-action-btns">
        <button @click="saveTimeTables" class="admin-action-btn primary" :disabled="saving" style="min-width: 160px; max-width: 160px;">
          {{ saving ? 'Saving...' : 'Save Time Tables' }}
        </button>
        <button @click="addTimeTable" class="admin-action-btn secondary" style="min-width: 140px; max-width: 140px;">
          Add Time Table
        </button>
      </div>
    </div>

    <div class="import-section">
      <button @click="triggerFileInput" class="admin-action-btn info" style="min-width: 150px; max-width: 150px;">Import CSV/XLSX</button>
      <input ref="fileInput" type="file" accept=".csv,.xlsx,.xls" style="display:none" @change="handleFileChange" />
      <div class="import-note">
        You can export from Google Sheets or Excel as CSV, or upload your Excel file directly.
      </div>
    </div>

    <div v-if="importPreview.length" class="import-preview">
      <h3>Preview Imported Time Table</h3>
      <table>
        <thead>
          <tr>
            <th v-for="col in previewColumns" :key="col">{{ col }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in importPreview" :key="idx">
            <td v-for="col in previewColumns" :key="col">{{ row[col] }}</td>
          </tr>
        </tbody>
      </table>
      
      <div class="import-options">
        <h4>Import Options</h4>
        <div class="import-option-group">
          <label>
            <input type="radio" v-model="importOption" value="overwrite" />
            Overwrite existing time table:
          </label>
          <select v-model="selectedTimeTableIndex" :disabled="importOption !== 'overwrite'" class="form-select">
            <option value="">Select a time table...</option>
            <option v-for="(timeTable, index) in timeTables" :key="index" :value="index">
              {{ timeTable.name }}
            </option>
          </select>
        </div>
        
        <div class="import-option-group">
          <label>
            <input type="radio" v-model="importOption" value="create" />
            Create new time table:
          </label>
          <input 
            v-model="newTimeTableName" 
            type="text" 
            placeholder="Enter time table name..."
            :disabled="importOption !== 'create'"
            class="form-input"
          />
        </div>
      </div>
      
      <div class="import-actions">
        <button @click="confirmImport" class="btn btn-primary" :disabled="!canConfirmImport">
          {{ importOption === 'overwrite' ? 'Overwrite Time Table' : 'Create New Time Table' }}
        </button>
        <button @click="cancelImport" class="btn btn-secondary">Cancel</button>
      </div>
    </div>

    <div class="content">
      <div v-if="loading" class="loading">
        Loading time tables...
      </div>
      
      <div v-else class="time-tables-container">
        <div v-if="timeTables.length === 0" class="empty-state">
          <h3>No Time Tables Created</h3>
          <p>Create your first time table to get started.</p>
          <button @click="addTimeTable" class="btn btn-primary">Create Time Table</button>
        </div>
        
        <div v-else class="time-tables-list">
          <div v-for="(timeTable, index) in timeTables" :key="index" class="time-table-card">
            <div class="time-table-header">
              <div class="time-table-info">
                <h3>{{ timeTable.name }}</h3>
                <p class="time-table-days">{{ formatDays(timeTable.days) }}</p>
              </div>
              <div class="admin-action-btns">
                <button @click="editTimeTable(index)" class="admin-action-btn edit">
                  Edit
                </button>
                <button @click="deleteTimeTable(index)" class="admin-action-btn delete">
                  Delete
                </button>
              </div>
            </div>
            
            <div class="time-table-schedule">
              <div v-for="(item, itemIndex) in timeTable.schedule" :key="itemIndex" class="schedule-item">
                <div class="schedule-item-info">
                  <span class="item-name">{{ item.name }}</span>
                  <span class="item-time">{{ formatTime(item.startTime) }} - {{ formatTime(item.endTime) }}</span>
                </div>
                <div class="schedule-item-type">
                  <span :class="['type-badge', item.type]">{{ item.type }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Time Table Edit Dialog -->
    <div v-if="showEditDialog" class="edit-dialog-overlay" @click="closeEditDialog">
      <div class="edit-dialog" @click.stop>
        <div class="dialog-header">
          <h2>{{ editingIndex === -1 ? 'Create Time Table' : 'Edit Time Table' }}</h2>
          <button @click="closeEditDialog" class="btn-close">×</button>
        </div>
        
        <div class="dialog-content">
          <div class="form-group">
            <label for="timeTableName">Time Table Name</label>
            <input 
              id="timeTableName"
              v-model="editingTimeTable.name" 
              type="text" 
              placeholder="e.g., Regular Schedule, Rally Day, Minimum Day"
              class="form-input"
            />
          </div>
          
          <div class="form-group">
            <label>Days This Schedule Applies</label>
            <div class="days-checkboxes">
              <label v-for="day in weekDays" :key="day.value" class="day-checkbox">
                <input 
                  type="checkbox" 
                  :value="day.value" 
                  v-model="editingTimeTable.days"
                />
                {{ day.label }}
              </label>
            </div>
          </div>
          
          <div class="form-group">
            <label>Schedule Items</label>
            <div class="schedule-items">
              <div v-for="(item, itemIndex) in editingTimeTable.schedule" :key="itemIndex" class="schedule-item-edit">
                <div class="item-row">
                  <input 
                    v-model="item.name" 
                    type="text" 
                    placeholder="Period 1, Lunch, Break, etc."
                    class="form-input item-name-input"
                  />
                  <select v-model="item.type" class="form-select item-type-select">
                    <option value="period">Period</option>
                    <option value="break">Break</option>
                    <option value="lunch">Lunch</option>
                    <option value="other">Other</option>
                  </select>
                  <input 
                    v-model="item.startTime" 
                    type="time" 
                    class="form-input time-input"
                  />
                  <span class="time-separator">to</span>
                  <input 
                    v-model="item.endTime" 
                    type="time" 
                    class="form-input time-input"
                  />
                  <button @click="removeScheduleItem(itemIndex)" class="admin-action-btn delete">
                    Delete
                  </button>
                </div>
              </div>
              
              <button @click="addScheduleItem" class="admin-action-btn secondary" style="min-width: 150px; max-width: 150px;">
                Add Schedule Item
              </button>
            </div>
          </div>
        </div>
        
        <div class="admin-action-btns">
          <button @click="closeEditDialog" class="admin-action-btn cancel" style="min-width: 100px; max-width: 100px;">Cancel</button>
          <button @click="saveTimeTable" class="admin-action-btn primary" style="min-width: 140px; max-width: 140px;">Save Time Table</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { useAppSettings } from '@/composables/useAppSettings.js'
import * as XLSX from 'xlsx'
import { 
  sanitizeString, 
  checkSecurityThreats, 
  validateFile,
  validateStringLength,
  checkRateLimit
} from '@/utils/validation.js'

const { saveAppSettings } = useAppSettings()

const loading = ref(true)
const saving = ref(false)
const timeTables = ref([])
const showEditDialog = ref(false)
const editingIndex = ref(-1)
const editingTimeTable = ref({
  name: '',
  days: [],
  schedule: []
})

const weekDays = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' }
]

const fileInput = ref(null)
const importPreview = ref([])
const previewColumns = ref([])
const importOption = ref('overwrite')
const selectedTimeTableIndex = ref('')
const newTimeTableName = ref('')

// Computed property to check if import can be confirmed
const canConfirmImport = computed(() => {
  if (importOption.value === 'overwrite') {
    return selectedTimeTableIndex.value !== ''
  } else {
    return newTimeTableName.value.trim() !== ''
  }
})

// Enhanced validation functions
const validateTimeTableForm = () => {
  // Sanitize time table name
  const sanitizedName = sanitizeString(editingTimeTable.value.name, {
    trim: true,
    maxLength: 100,
    removeDangerous: true
  })

  // Security threat detection
  const securityCheck = checkSecurityThreats(sanitizedName)
  if (!securityCheck.isSafe) {
    alert(`Security threat detected in time table name: ${securityCheck.threats.join(', ')}`)
    return false
  }

  // Apply sanitized name
  editingTimeTable.value.name = sanitizedName

  // Validate required fields
  if (!editingTimeTable.value.name.trim()) {
    alert('Please enter a time table name')
    return false
  }

  if (editingTimeTable.value.days.length === 0) {
    alert('Please select at least one day')
    return false
  }

  if (editingTimeTable.value.schedule.length === 0) {
    alert('Please add at least one schedule item')
    return false
  }

  // Validate schedule items
  for (let i = 0; i < editingTimeTable.value.schedule.length; i++) {
    const item = editingTimeTable.value.schedule[i]
    
    // Sanitize schedule item name
    const sanitizedItemName = sanitizeString(item.name, {
      trim: true,
      maxLength: 50,
      removeDangerous: true
    })

    // Security check for schedule item name
    const itemSecurityCheck = checkSecurityThreats(sanitizedItemName)
    if (!itemSecurityCheck.isSafe) {
      alert(`Security threat detected in schedule item ${i + 1}: ${itemSecurityCheck.threats.join(', ')}`)
      return false
    }

    // Apply sanitized name
    item.name = sanitizedItemName

    if (!item.name.trim()) {
      alert(`Please enter a name for schedule item ${i + 1}`)
      return false
    }
    if (!item.startTime || !item.endTime) {
      alert(`Please enter start and end times for ${item.name}`)
      return false
    }
    if (item.startTime >= item.endTime) {
      alert(`${item.name}: Start time must be before end time`)
      return false
    }
  }

  return true
}

const validateImportName = (name) => {
  // Sanitize import name
  const sanitizedName = sanitizeString(name, {
    trim: true,
    maxLength: 100,
    removeDangerous: true
  })

  // Security threat detection
  const securityCheck = checkSecurityThreats(sanitizedName)
  if (!securityCheck.isSafe) {
    alert(`Security threat detected in import name: ${securityCheck.threats.join(', ')}`)
    return null
  }

  return sanitizedName
}

async function loadData() {
  try {
    console.log('Loading time tables...')
    loading.value = true
    
    // Load existing time tables from app settings
    const appSettingsDoc = await getDoc(doc(db, 'app_settings', 'global'))
    if (appSettingsDoc.exists()) {
      const data = appSettingsDoc.data()
      timeTables.value = data.timeTables || []
      console.log('Loaded time tables:', timeTables.value)
    } else {
      timeTables.value = []
      console.log('No time tables found, starting with empty array')
    }
    
    loading.value = false
  } catch (error) {
    console.error('Error loading time tables:', error)
    loading.value = false
  }
}

function addTimeTable() {
  editingIndex.value = -1
  editingTimeTable.value = {
    name: '',
    days: [],
    schedule: []
  }
  showEditDialog.value = true
}

function editTimeTable(index) {
  editingIndex.value = index
  editingTimeTable.value = JSON.parse(JSON.stringify(timeTables.value[index]))
  showEditDialog.value = true
}

function deleteTimeTable(index) {
  if (confirm('Are you sure you want to delete this time table?')) {
    timeTables.value.splice(index, 1)
  }
}

function addScheduleItem() {
  editingTimeTable.value.schedule.push({
    name: '',
    type: 'period',
    startTime: '',
    endTime: ''
  })
}

function removeScheduleItem(index) {
  editingTimeTable.value.schedule.splice(index, 1)
}

function saveTimeTable() {
  // Enhanced validation with security checks
  if (!validateTimeTableForm()) {
    return
  }

  // Rate limiting for save operations
  const rateCheck = checkRateLimit('saveTimeTable', 10, 60000) // 10 saves per minute
  if (!rateCheck.allowed) {
    alert('Too many save requests. Please wait before saving again.')
    return
  }

  // Save the time table
  if (editingIndex.value === -1) {
    // Add new time table
    timeTables.value.push(JSON.parse(JSON.stringify(editingTimeTable.value)))
  } else {
    // Update existing time table
    timeTables.value[editingIndex.value] = JSON.parse(JSON.stringify(editingTimeTable.value))
  }

  closeEditDialog()
}

function closeEditDialog() {
  showEditDialog.value = false
  editingIndex.value = -1
  editingTimeTable.value = {
    name: '',
    days: [],
    schedule: []
  }
}

async function saveTimeTables() {
  try {
    // Rate limiting for save all operations
    const rateCheck = checkRateLimit('saveAllTimeTables', 5, 300000) // 5 saves per 5 minutes
    if (!rateCheck.allowed) {
      alert('Too many save all requests. Please wait before saving again.')
      return
    }

    saving.value = true
    console.log('Saving time tables:', timeTables.value)
    
    // Get current app settings
    const appSettingsDoc = await getDoc(doc(db, 'app_settings', 'global'))
    const currentSettings = appSettingsDoc.exists() ? appSettingsDoc.data() : {}
    
    // Update app settings with time tables
    const updatedSettings = {
      ...currentSettings,
      timeTables: timeTables.value
    }
    
    await saveAppSettings(updatedSettings)
    saving.value = false
    console.log('Time tables saved successfully')
  } catch (error) {
    console.error('Error saving time tables:', error)
    saving.value = false
  }
}

function formatDays(days) {
  if (days.length === 0) return 'No days selected'
  if (days.length === 7) return 'Every day'
  if (days.length === 5 && days.includes('monday') && days.includes('friday')) return 'Weekdays'
  
  return days.map(day => {
    const dayObj = weekDays.find(d => d.value === day)
    return dayObj ? dayObj.label : day
  }).join(', ')
}

function formatTime(time) {
  if (!time) return ''
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${displayHour}:${minutes} ${ampm}`
}

function triggerFileInput() {
  fileInput.value && fileInput.value.click()
}

function handleFileChange(e) {
  const file = e.target.files[0]
  if (!file) return

  // Validate file with security checks
  const fileValidation = validateFile(file, {
    allowedTypes: ['csv', 'excel'],
    maxSize: 5 * 1024 * 1024, // 5MB
    fieldName: 'Time Table Import File'
  })

  if (!fileValidation.isValid) {
    alert(fileValidation.error)
    e.target.value = '' // Clear the file input
    return
  }

  // Check filename for security threats
  const securityCheck = checkSecurityThreats(file.name)
  if (!securityCheck.isSafe) {
    alert(`File name contains potentially dangerous content: ${securityCheck.threats.join(', ')}`)
    e.target.value = '' // Clear the file input
    return
  }

  const reader = new FileReader()
  reader.onload = (evt) => {
    try {
      let data = evt.target.result
      let workbook
      if (file.name.endsWith('.csv')) {
        // Parse CSV
        workbook = XLSX.read(data, { type: 'binary' })
      } else {
        // Parse Excel
        workbook = XLSX.read(data, { type: 'binary' })
      }
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const json = XLSX.utils.sheet_to_json(sheet, { defval: '' })
      
      // Sanitize imported data
      const sanitizedJson = json.map(row => {
        const sanitizedRow = {}
        Object.entries(row).forEach(([key, value]) => {
          const sanitizedKey = sanitizeString(key, { trim: true, maxLength: 50, removeDangerous: true })
          const sanitizedValue = sanitizeString(String(value), { trim: true, maxLength: 100, removeDangerous: true })
          sanitizedRow[sanitizedKey] = sanitizedValue
        })
        return sanitizedRow
      })
      
      importPreview.value = sanitizedJson
      previewColumns.value = sanitizedJson.length ? Object.keys(sanitizedJson[0]) : []
    } catch (error) {
      alert('Error parsing file. Please check the file format and try again.')
      console.error('File parsing error:', error)
    }
  }
  reader.readAsBinaryString(file)
}

function confirmImport() {
  try {
    // Rate limiting for import operations
    const rateCheck = checkRateLimit('importTimeTable', 3, 300000) // 3 imports per 5 minutes
    if (!rateCheck.allowed) {
      alert('Too many import requests. Please wait before importing again.')
      return
    }

    // Map the imported data to time table format
    const mappedSchedule = importPreview.value.map(row => {
      // Try to map common column names to time table fields
      const name = row.name || row.Name || row.period || row.Period || row.item || row.Item || 'Unknown'
      const startTime = row.startTime || row['Start Time'] || row.start || row.Start || '08:00'
      const endTime = row.endTime || row['End Time'] || row.end || row.End || '08:55'
      
      // Sanitize mapped values
      const sanitizedName = sanitizeString(name, { trim: true, maxLength: 50, removeDangerous: true })
      
      // Security check for mapped name
      const securityCheck = checkSecurityThreats(sanitizedName)
      if (!securityCheck.isSafe) {
        console.warn(`Security threat detected in imported item: ${securityCheck.threats.join(', ')}`)
        return null // Skip this item
      }
      
      // Determine type based on name or type column
      let type = 'period'
      const typeValue = row.type || row.Type || ''
      const nameLower = sanitizedName.toLowerCase()
      
      if (typeValue.toLowerCase().includes('lunch') || nameLower.includes('lunch')) {
        type = 'lunch'
      } else if (typeValue.toLowerCase().includes('break') || nameLower.includes('break')) {
        type = 'break'
      } else if (typeValue.toLowerCase().includes('other') || nameLower.includes('other')) {
        type = 'other'
      }
      
      return {
        name: sanitizedName,
        type: type,
        startTime: startTime,
        endTime: endTime
      }
    }).filter(item => item && item.name && item.name !== 'Unknown')
    
    if (mappedSchedule.length === 0) {
      alert('No valid schedule items found in the imported data. Please check your file format.')
      return
    }
    
    if (importOption.value === 'overwrite') {
      if (selectedTimeTableIndex.value === '') {
        alert('Please select a time table to overwrite')
        return
      }
      
      // Overwrite existing time table
      const index = parseInt(selectedTimeTableIndex.value)
      timeTables.value[index] = {
        ...timeTables.value[index],
        schedule: mappedSchedule
      }
    } else {
      const validatedName = validateImportName(newTimeTableName.value)
      if (!validatedName) {
        return
      }
      
      // Create new time table
      const newTimeTable = {
        name: validatedName,
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], // Default to weekdays
        schedule: mappedSchedule
      }
      timeTables.value.push(newTimeTable)
    }
    
    importPreview.value = []
    previewColumns.value = []
    importOption.value = 'overwrite'
    selectedTimeTableIndex.value = ''
    newTimeTableName.value = ''
    
    alert('Time table imported successfully!')
  } catch (error) {
    console.error('Error importing time table:', error)
    alert('Error importing time table. Please check your file format and try again.')
  }
}

function cancelImport() {
  importPreview.value = []
  previewColumns.value = []
  importOption.value = 'overwrite'
  selectedTimeTableIndex.value = ''
  newTimeTableName.value = ''
}

onMounted(loadData)
</script>

<style scoped>
.admin-time-table {
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

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover {
  background: #c82333;
}

.btn-small {
  padding: 6px 12px;
  font-size: 0.85rem;
}

.loading {
  text-align: center;
  padding: 40px;
  font-size: 1.2rem;
  color: #666;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #dee2e6;
}

.empty-state h3 {
  color: #333;
  margin-bottom: 10px;
}

.empty-state p {
  color: #666;
  margin-bottom: 20px;
}

.time-tables-list {
  display: grid;
  gap: 20px;
}

.time-table-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
}

.time-table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}

.time-table-info h3 {
  margin: 0 0 5px 0;
  color: #333;
}

.time-table-days {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
}

.time-table-actions {
  display: flex;
  gap: 8px;
}

.time-table-schedule {
  padding: 20px;
}

.schedule-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.schedule-item:last-child {
  border-bottom: none;
}

.schedule-item-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-name {
  font-weight: 600;
  color: #333;
}

.item-time {
  font-size: 0.9rem;
  color: #666;
}

.type-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

.type-badge.period {
  background: #e3f2fd;
  color: #1976d2;
}

.type-badge.break {
  background: #fff3e0;
  color: #f57c00;
}

.type-badge.lunch {
  background: #e8f5e8;
  color: #388e3c;
}

.type-badge.other {
  background: #f3e5f5;
  color: #7b1fa2;
}

/* Edit Dialog Styles */
.edit-dialog-overlay {
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

.edit-dialog {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.dialog-header h2 {
  margin: 0;
  color: #333;
}

.btn-close {
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

.btn-close:hover {
  color: #333;
}

.dialog-content {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
}

.form-input, .form-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-input:focus, .form-select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.days-checkboxes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
}

.day-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.day-checkbox input[type="checkbox"] {
  margin: 0;
}

.schedule-items {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.schedule-item-edit {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 15px;
  background: #f8f9fa;
}

.item-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto 1fr auto;
  gap: 10px;
  align-items: center;
}

.item-name-input {
  grid-column: 1;
}

.item-type-select {
  grid-column: 2;
}

.time-input {
  width: 100%;
}

.time-separator {
  text-align: center;
  color: #666;
  font-weight: 500;
}

.btn-add-item {
  align-self: flex-start;
  margin-top: 10px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid #e0e0e0;
}

@media (max-width: 768px) {
  .item-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .time-separator {
    display: none;
  }
  
  .days-checkboxes {
    grid-template-columns: repeat(2, 1fr);
  }
}

.import-section {
  margin-bottom: 20px;
}
.import-note {
  font-size: 0.95rem;
  color: #555;
  margin-top: 8px;
}
.import-preview {
  margin: 20px 0;
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 16px;
}
.import-preview table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 12px;
}
.import-preview th, .import-preview td {
  border: 1px solid #ccc;
  padding: 6px 10px;
  text-align: left;
}

.import-options {
  margin-bottom: 20px;
}

.import-option-group {
  margin-bottom: 10px;
}

.import-option-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
}

.import-option-group input[type="radio"] {
  margin-right: 8px;
}

.import-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid #e0e0e0;
}

.import-actions button {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.import-actions button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}
</style> 