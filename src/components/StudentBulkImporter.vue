<template>
  <div class="bulk-importer">
    <!-- Debug indicator -->
    <div style="background: #e8f5e8; border: 2px solid #4caf50; padding: 10px; margin-bottom: 20px; border-radius: 4px; text-align: center;">
      <strong>✅ StudentBulkImporter Component Loaded Successfully</strong>
    </div>
    
    <div class="importer-header">
      <h2>Add Students - Bulk Import</h2>
      <p class="description">
        Import multiple students from a CSV file. The system will map CSV fields to the app's database structure 
        and allow you to preview and validate the data before importing.
      </p>
    </div>

    <!-- Step 1: File Upload -->
    <div v-if="step === 1" class="step-container">
      <div class="step-header">
        <h3>Step 1: Upload CSV File</h3>
        <p>Select a CSV file containing student data. The first row should contain column headers.</p>
      </div>
      
      <div class="file-upload-section">
        <div class="file-input-wrapper">
          <input 
            type="file" 
            ref="fileInput"
            @change="handleFileUpload" 
            accept=".csv"
            class="file-input"
            id="csv-file"
          />
          <label for="csv-file" class="file-label">
            <span class="file-icon">📁</span>
            <span class="file-text">{{ fileName || 'Choose CSV File' }}</span>
          </label>
        </div>
        
        <div v-if="uploadError" class="error-message">
          {{ uploadError }}
        </div>
        
        <div v-if="fileName" class="file-info">
          <p><strong>File:</strong> {{ fileName }}</p>
          <p><strong>Size:</strong> {{ fileSize }}</p>
          <p v-if="csvData.length > 0"><strong>Records:</strong> {{ csvData.length }}</p>
        </div>
      </div>

      <!-- Sample CSV Format -->
      <div class="sample-format">
        <h4>Expected CSV Format:</h4>
        <div class="format-example">
          <code>
            SSID,FirstName,LastName,Grade,Plan,CaseManagerId,ReviewDate,ReevalDate,MeetingDate,Period1Teacher,Period2Teacher,Period3Teacher,Period4Teacher,Period5Teacher,Period6Teacher,SHTeacher,ClassServices,SpeechProvider,OTProvider,PTProvider,ATProvider,Audiologist,BISProvider,DHHProvider,HNProvider,MHProvider,OMProvider,SCProvider,SWProvider,TRProvider,VIProvider,Flag1,Flag2,BIPPdfUrl,AtAGlancePdfUrl,Assessment,Instruction<br>
            123456789,John,Doe,9,IEP,user003,2025-07-15,2025-12-15,2025-07-10,user007,user008,user009,user010,user011,user012,user013,"SDC: English,RSP: Math",user020,user021,user022,user023,user024,user025,user026,user027,user028,user029,user030,user031,user032,user033,true,false,https://example.com/bip.pdf,https://example.com/ataglance.pdf,"Allow for test re-takes if the score is below average...",Divide larger projects or assignments into manageable parts...
          </code>
        </div>
        <p class="format-note">
          <strong>Required fields:</strong> SSID, FirstName, LastName, Grade<br>
          <strong>App Structure:</strong> All fields map to the app data structure in your database<br>
          <strong>Schedule fields:</strong> Period1Teacher through Period6Teacher and SHTeacher (Firebase user IDs like user001, user002, etc.)<br>
          <strong>Provider fields:</strong> All service provider fields (Firebase user IDs like user020, user021, etc.)<br>
          <strong>Class Services:</strong> Comma-separated list (e.g., "SDC: English,RSP: Math,Co-teach: Science")<br>
          <strong>Dates:</strong> Use YYYY-MM-DD format (e.g., 2025-07-15)<br>
          <strong>Flags:</strong> Use true/false or 1/0<br>
          <strong>Accommodations:</strong> Text fields for assessment and instruction<br>
          <strong>Note:</strong> Teacher and provider IDs will be automatically mapped from names, emails, or Aeries IDs if user lookup is available
        </p>
      </div>

      <div class="step-actions">
        <button 
          @click="nextStep" 
          :disabled="!csvData.length"
          class="btn btn-primary"
        >
          Next: Map Fields
        </button>
      </div>
    </div>

    <!-- Step 2: Field Mapping -->
    <div v-if="step === 2" class="step-container">
      <div class="step-header">
        <h3>Step 2: Map CSV Fields</h3>
        <p>Map your CSV columns to the app's database fields. Required fields are marked with *</p>
      </div>

      <div class="field-mapping-section">
        <div class="mapping-grid">
          <div class="mapping-header">
            <div class="csv-column">CSV Column</div>
            <div class="arrow">→</div>
            <div class="app-field">App Database Field</div>
            <div class="sample-data">Sample Data</div>
          </div>

          <div v-for="(header, index) in csvHeaders" :key="index" class="mapping-row">
            <div class="csv-column">
              <strong>{{ header }}</strong>
            </div>
            <div class="arrow">→</div>
            <div class="app-field">
              <select v-model="fieldMapping[header]" class="field-select">
                <option value="">-- Skip this field --</option>
                <optgroup label="Required Fields">
                  <option value="app.studentData.ssid">SSID (State Student ID) *</option>
                  <option value="app.studentData.firstName">First Name *</option>
                  <option value="app.studentData.lastName">Last Name *</option>
                  <option value="app.studentData.grade">Grade *</option>
                </optgroup>
                <optgroup label="Student Information">
                  <option value="app.studentData.plan">Plan Type (IEP/504/RTI/None)</option>
                  <option value="app.studentData.caseManagerId">Case Manager ID</option>
                </optgroup>
                <optgroup label="Important Dates">
                  <option value="app.dates.reviewDate">Review Date</option>
                  <option value="app.dates.reevalDate">Reevaluation Date</option>
                  <option value="app.dates.meetingDate">Meeting Date</option>
                </optgroup>
                <optgroup label="Class Schedule">
                  <option value="app.schedule.periods.1">Period 1 Teacher ID</option>
                  <option value="app.schedule.periods.2">Period 2 Teacher ID</option>
                  <option value="app.schedule.periods.3">Period 3 Teacher ID</option>
                  <option value="app.schedule.periods.4">Period 4 Teacher ID</option>
                  <option value="app.schedule.periods.5">Period 5 Teacher ID</option>
                  <option value="app.schedule.periods.6">Period 6 Teacher ID</option>
                  <option value="app.schedule.periods.7">Period 7 Teacher ID</option>
                  <option value="app.schedule.classServices">Class Services (Comma-separated)</option>
                </optgroup>
                <optgroup label="Service Providers">
                  <option value="app.providers.speechId">Speech Provider ID</option>
                  <option value="app.providers.otId">OT Provider ID</option>
                  <option value="app.providers.ptId">PT Provider ID</option>
                  <option value="app.providers.atId">AT Provider ID</option>
                  <option value="app.providers.audId">Audiologist ID</option>
                  <option value="app.providers.bisId">BIS Provider ID</option>
                  <option value="app.providers.dhhId">DHH Provider ID</option>
                  <option value="app.providers.hnId">HN Provider ID</option>
                  <option value="app.providers.mhId">MH Provider ID</option>
                  <option value="app.providers.omId">OM Provider ID</option>
                  <option value="app.providers.scId">SC Provider ID</option>
                  <option value="app.providers.swId">SW Provider ID</option>
                  <option value="app.providers.trId">TR Provider ID</option>
                  <option value="app.providers.viId">VI Provider ID</option>
                </optgroup>
                <optgroup label="Flags">
                  <option value="app.flags.flag1">Flag 1 (Boolean)</option>
                  <option value="app.flags.flag2">Flag 2 (Boolean)</option>
                </optgroup>
                <optgroup label="Documents">
                  <option value="app.documents.bipPdfUrl">BIP PDF URL</option>
                  <option value="app.documents.ataglancePdfUrl">At-A-Glance PDF URL</option>
                </optgroup>
                <optgroup label="Accommodations">
                  <option value="app.accommodations.assessment">Assessment Accommodations</option>
                  <option value="app.accommodations.instruction">Instructional Accommodations</option>
                </optgroup>
              </select>
            </div>
            <div class="sample-data">
              <code>{{ getSampleData(header) }}</code>
            </div>
          </div>
        </div>

        <!-- Auto-mapping suggestions -->
        <div class="auto-mapping-section">
          <h4>Quick Mapping Options:</h4>
          <div class="quick-actions">
            <button @click="autoMapCommonFields" class="btn btn-secondary">
              Auto-map Common Fields
            </button>
            <button @click="clearAllMappings" class="btn btn-secondary">
              Clear All Mappings
            </button>
          </div>
        </div>

        <!-- Validation Messages -->
        <div v-if="mappingErrors.length > 0" class="validation-errors">
          <h4>Mapping Issues:</h4>
          <ul>
            <li v-for="error in mappingErrors" :key="error" class="error-item">
              {{ error }}
            </li>
          </ul>
        </div>
      </div>

      <div class="step-actions">
        <button @click="prevStep" class="btn btn-secondary">
          Back
        </button>
        <button 
          @click="nextStep" 
          :disabled="!isValidMapping"
          class="btn btn-primary"
        >
          Next: Preview Data
        </button>
      </div>
    </div>

    <!-- Step 3: Preview and Validate -->
    <div v-if="step === 3" class="step-container">
      <div class="step-header">
        <h3>Step 3: Preview and Validate</h3>
        <p>Review the mapped data before importing. Check for any validation errors.</p>
      </div>

      <div class="preview-section">
        <div class="preview-stats">
          <div class="stat-item">
            <span class="stat-label">Total Records:</span>
            <span class="stat-value">{{ csvData.length }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Valid Records:</span>
            <span class="stat-value valid">{{ validRecords.length }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Invalid Records:</span>
            <span class="stat-value invalid">{{ invalidRecords.length }}</span>
          </div>
        </div>

        <!-- Preview Table -->
        <div class="preview-table-container">
          <table class="preview-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>SSID</th>
                <th>Name</th>
                <th>Grade</th>
                <th>Plan</th>
                <th>Case Manager</th>
                <th>Issues</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(record, index) in previewData" :key="index" :class="{ 'invalid-row': record.errors.length > 0 }">
                <td>
                  <span :class="['status-badge', record.errors.length > 0 ? 'error' : 'valid']">
                    {{ record.errors.length > 0 ? 'Error' : 'Valid' }}
                  </span>
                </td>
                <td>{{ record.data.ssid || record.data.app?.studentData?.ssid || 'Missing' }}</td>
                <td>{{ getFullName(record.data) }}</td>
                <td>{{ record.data.app?.studentData?.grade || 'Missing' }}</td>
                <td>{{ record.data.app?.studentData?.plan || 'Not set' }}</td>
                <td>{{ record.data.app?.studentData?.caseManagerId || 'Not set' }}</td>
                <td>
                  <ul v-if="record.errors.length > 0" class="error-list">
                    <li v-for="error in record.errors" :key="error" class="error-item">
                      {{ error }}
                    </li>
                  </ul>
                  <span v-else class="no-errors">No issues</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Import Options -->
        <div class="import-options">
          <h4>Import Options:</h4>
          <div class="options-grid">
            <label class="option-item">
              <input type="radio" v-model="importMode" value="valid-only" />
              <span>Import only valid records ({{ validRecords.length }} records)</span>
            </label>
            <label class="option-item">
              <input type="radio" v-model="importMode" value="all" />
              <span>Import all records (may cause errors for invalid data)</span>
            </label>
            <label class="option-item">
              <input type="checkbox" v-model="updateExisting" />
              <span>Update existing students if SSID already exists</span>
            </label>
          </div>
        </div>
      </div>

      <div class="step-actions">
        <button @click="prevStep" class="btn btn-secondary">
          Back
        </button>
        <button 
          @click="importStudents" 
          :disabled="isImporting || (importMode === 'valid-only' && validRecords.length === 0)"
          class="btn btn-primary"
        >
          {{ isImporting ? 'Importing...' : `Import ${importMode === 'valid-only' ? validRecords.length : csvData.length} Students` }}
        </button>
      </div>
    </div>

    <!-- Step 4: Import Results -->
    <div v-if="step === 4" class="step-container">
      <div class="step-header">
        <h3>Step 4: Import Complete</h3>
        <p>Your bulk import has been completed. Review the results below.</p>
      </div>

      <div class="results-section">
        <div class="results-stats">
          <div class="stat-item success">
            <span class="stat-label">Successfully Imported:</span>
            <span class="stat-value">{{ importResults.successful }}</span>
          </div>
          <div class="stat-item error">
            <span class="stat-label">Failed to Import:</span>
            <span class="stat-value">{{ importResults.failed }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Total Processing Time:</span>
            <span class="stat-value">{{ importResults.processingTime }}ms</span>
          </div>
        </div>

        <div v-if="importResults.errors.length > 0" class="import-errors">
          <h4>Import Errors:</h4>
          <ul>
            <li v-for="error in importResults.errors" :key="error" class="error-item">
              {{ error }}
            </li>
          </ul>
        </div>

        <div class="results-actions">
          <button @click="startOver" class="btn btn-secondary">
            Import More Students
          </button>
          <button @click="$emit('close')" class="btn btn-primary">
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div v-if="isImporting" class="loading-overlay">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <p>Importing students... {{ importProgress }}%</p>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: importProgress + '%' }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { collection, doc, setDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase'
import { 
  validateStudentData, 
  sanitizeStudentFormData, 
  checkSecurityThreats,
  validateFile 
} from '@/utils/validation.js'
import useUsers from '@/composables/useUsers'

// Emits
const emit = defineEmits(['close', 'imported'])

// Composables
const { users: userMap, fetchUsers } = useUsers()

// Reactive state
const step = ref(1)
const fileName = ref('')
const fileSize = ref('')
const csvData = ref([])
const csvHeaders = ref([])
const fieldMapping = ref({})
const uploadError = ref('')
const mappingErrors = ref([])
const previewData = ref([])
const importMode = ref('valid-only')
const updateExisting = ref(false)
const isImporting = ref(false)
const importProgress = ref(0)
const importResults = ref({
  successful: 0,
  failed: 0,
  errors: [],
  processingTime: 0
})

// File input ref
const fileInput = ref(null)

// Computed properties
const isValidMapping = computed(() => {
  const requiredFields = [
    'app.studentData.firstName', 
    'app.studentData.lastName',
    'app.studentData.grade'
  ]
  
  const mappedFields = Object.values(fieldMapping.value).filter(field => field)
  
  // Check if we have either top-level ssid OR app.studentData.ssid
  const hasSSID = mappedFields.includes('app.studentData.ssid')
  
  return requiredFields.every(field => mappedFields.includes(field)) && hasSSID
})

const validRecords = computed(() => {
  return previewData.value.filter(record => record.errors.length === 0)
})

const invalidRecords = computed(() => {
  return previewData.value.filter(record => record.errors.length > 0)
})

// Load users on mount
onMounted(async () => {
  console.log('🚀 StudentBulkImporter component mounted!')
  try {
    await fetchUsers()
    console.log('✅ Users loaded successfully:', Object.keys(userMap.value).length, 'users')
    console.log('First few users:', Object.values(userMap.value).slice(0, 3).map(u => ({ id: u.id, name: u.name, role: u.role })))
  } catch (error) {
    console.error('❌ Failed to load users:', error)
  }
})

// Methods
const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  // Validate file - simplified check for CSV files
  if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
    uploadError.value = 'File must be a CSV file (.csv extension)'
    return
  }

  // Check file size
  if (file.size > 10 * 1024 * 1024) {
    uploadError.value = 'File must be smaller than 10MB'
    return
  }

  uploadError.value = ''
  fileName.value = file.name
  fileSize.value = formatFileSize(file.size)

  try {
    const text = await file.text()
    parseCSV(text)
  } catch (error) {
    uploadError.value = 'Failed to read CSV file: ' + error.message
  }
}

const parseCSV = (text) => {
  try {
    const lines = text.trim().split('\n')
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row')
    }

    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    csvHeaders.value = headers
    
    const data = []
    for (let i = 1; i < lines.length; i++) {
      const row = {}
      let currentField = ''
      let inQuotes = false
      let fieldIndex = 0
      
      // Parse each character to handle quoted fields properly
      for (let j = 0; j < lines[i].length; j++) {
        const char = lines[i][j]
        
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          // End of field
          row[headers[fieldIndex]] = currentField.trim().replace(/^"|"$/g, '')
          currentField = ''
          fieldIndex++
        } else {
          currentField += char
        }
      }
      
      // Add the last field
      if (fieldIndex < headers.length) {
        row[headers[fieldIndex]] = currentField.trim().replace(/^"|"$/g, '')
      }
      
      data.push(row)
    }
    
    csvData.value = data
    console.log('Parsed CSV data:', data.length, 'records')
  } catch (error) {
    uploadError.value = 'Failed to parse CSV: ' + error.message
  }
}

const autoMapCommonFields = () => {
  console.log('🔧 DEBUG: Auto-mapping started')
  console.log('🔧 DEBUG: csvHeaders.value:', csvHeaders.value)
  
  const commonMappings = {
    // Basic Student Info - Top Level and App
    'SSID': 'app.studentData.ssid',
    'FirstName': 'app.studentData.firstName',
    'LastName': 'app.studentData.lastName',
    'Grade': 'app.studentData.grade',
    'Plan': 'app.studentData.plan',
    'CaseManagerId': 'app.studentData.caseManagerId',
    
    // Important Dates
    'ReviewDate': 'app.dates.reviewDate',
    'ReevalDate': 'app.dates.reevalDate',
    'MeetingDate': 'app.dates.meetingDate',
    
    // Schedule (Teacher IDs)
    'Period1Teacher': 'app.schedule.periods.1',
    'Period2Teacher': 'app.schedule.periods.2',
    'Period3Teacher': 'app.schedule.periods.3',
    'Period4Teacher': 'app.schedule.periods.4',
    'Period5Teacher': 'app.schedule.periods.5',
    'Period6Teacher': 'app.schedule.periods.6',
    'Period7Teacher': 'app.schedule.periods.7',
    
    // Class Services
    'ClassServices': 'app.schedule.classServices',
    
    // Service Providers
    'SpeechProvider': 'app.providers.speechId',
    'OTProvider': 'app.providers.otId',
    'PTProvider': 'app.providers.ptId',
    'ATProvider': 'app.providers.atId',
    'Audiologist': 'app.providers.audId',
    'BISProvider': 'app.providers.bisId',
    'DHHProvider': 'app.providers.dhhId',
    'HNProvider': 'app.providers.hnId',
    'MHProvider': 'app.providers.mhId',
    'OMProvider': 'app.providers.omId',
    'SCProvider': 'app.providers.scId',
    'SWProvider': 'app.providers.swId',
    'TRProvider': 'app.providers.trId',
    'VIProvider': 'app.providers.viId',
    
    // Flags
    'Flag1': 'app.flags.flag1',
    'Flag2': 'app.flags.flag2',
    
    // Documents
    'BIPPdfUrl': 'app.documents.bipPdfUrl',
    'AtAGlancePdfUrl': 'app.documents.ataglancePdfUrl',
    
    // Accommodations
    'Assessment': 'app.accommodations.assessment',
    'Instruction': 'app.accommodations.instruction'
  }

  console.log('🔧 DEBUG: commonMappings keys:', Object.keys(commonMappings))
  
  let mappedCount = 0
  csvHeaders.value.forEach(header => {
    if (commonMappings[header]) {
      fieldMapping.value[header] = commonMappings[header]
      mappedCount++
      console.log(`🔧 DEBUG: Mapped ${header} -> ${commonMappings[header]}`)
    } else {
      console.log(`🔧 DEBUG: No mapping for header: "${header}"`)
    }
  })
  
  console.log(`🔧 DEBUG: Auto-mapping complete. Mapped ${mappedCount} fields.`)
  console.log('🔧 DEBUG: fieldMapping.value:', fieldMapping.value)
}

const clearAllMappings = () => {
  fieldMapping.value = {}
}

const getSampleData = (header) => {
  const firstRecord = csvData.value[0]
  if (!firstRecord) return ''
  
  const value = firstRecord[header]
  if (!value) return ''
  
  // For ClassServices, show the full string including quotes
  if (header === 'ClassServices') {
    return value.includes(',') ? `"${value}"` : value
  }
  
  return value
}

const validateMapping = () => {
  mappingErrors.value = []
  
  const requiredFields = [
    'app.studentData.firstName',
    'app.studentData.lastName',
    'app.studentData.grade'
  ]
  
  const mappedFields = Object.values(fieldMapping.value).filter(field => field)
  
  // Check if we have either top-level ssid OR app.studentData.ssid
  const hasSSID = mappedFields.includes('app.studentData.ssid')
  
  requiredFields.forEach(field => {
    if (!mappedFields.includes(field)) {
      const fieldName = field.split('.').pop()
      mappingErrors.value.push(`Required field "${fieldName}" is not mapped`)
    }
  })
  
  if (!hasSSID) {
    mappingErrors.value.push('SSID (State Student ID) must be mapped to app.studentData.ssid')
  }
  
  // Check for duplicate mappings
  const duplicates = mappedFields.filter((field, index) => 
    mappedFields.indexOf(field) !== index
  )
  
  if (duplicates.length > 0) {
    mappingErrors.value.push(`Duplicate field mappings: ${duplicates.join(', ')}`)
  }
}

const generatePreviewData = () => {
  previewData.value = csvData.value.map(row => {
    const mappedData = mapRowToStudentData(row)
    const errors = validateStudentRecord(mappedData)
    
    // Log the mapping for debugging
    console.log('Row mapping:', {
      original: row,
      mapped: mappedData,
      errors: errors
    })
    
    return {
      data: mappedData,
      errors: errors
    }
  })
}

const mapRowToStudentData = (row) => {
  const studentData = {
    app: {
      studentData: {},
      dates: {},
      providers: {},
      accommodations: {},
      flags: {},
      schedule: {
        periods: {},
        classServices: []
      },
      documents: {}
    }
  }

  // Map each field according to the mapping
  Object.entries(fieldMapping.value).forEach(([csvField, appField]) => {
    if (!appField || !row[csvField]) return
    
    let value = row[csvField].trim()
    if (!value) return

    // Handle special cases
    if (appField === 'app.schedule.classServices') {
      // Handle quoted strings with commas
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1)
      }
      studentData.app.schedule.classServices = value.split(',').map(s => s.trim()).filter(Boolean)
      return
    }

    // Handle teacher IDs in schedule
    if (appField.startsWith('app.schedule.periods.')) {
      const period = appField.split('.').pop()
      const teacherId = value.trim()
      if (teacherId) {
        const mappedId = mapTeacherToUserId(teacherId)
        console.log(`Mapping Period ${period} teacher:`, teacherId, '→', mappedId)
        studentData.app.schedule.periods[period] = mappedId
      }
      return
    }

    // Handle provider IDs
    if (appField.startsWith('app.providers.')) {
      const providerType = appField.split('.').pop()
      const providerId = value.trim()
      if (providerId) {
        const mappedId = mapProviderToUserId(providerId)
        console.log(`Mapping ${providerType} provider:`, providerId, '→', mappedId)
        studentData.app.providers[providerType] = mappedId
      }
      return
    }

    // Handle accommodations
    if (appField === 'app.accommodations.assessment' || appField === 'app.accommodations.instruction') {
      const field = appField.split('.').pop()
      studentData.app.accommodations[field] = value
      return
    }

    // Handle flags
    if (appField.startsWith('app.flags.')) {
      const flagName = appField.split('.').pop()
      studentData.app.flags[flagName] = ['true', '1', 'yes', 'y'].includes(value.toLowerCase())
      return
    }

    // Handle dates
    if (appField.includes('Date')) {
      const [section, subsection, field] = appField.split('.')
      if (!studentData[section][subsection]) {
        studentData[section][subsection] = {}
      }
      studentData[section][subsection][field] = formatDate(value)
      return
    }

    // Handle all other fields by navigating the object path
    const pathParts = appField.split('.')
    let current = studentData
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i]
      if (!current[part]) {
        current[part] = {}
      }
      current = current[part]
    }
    current[pathParts[pathParts.length - 1]] = value
  })

  return studentData
}

const mapCaseManagerToUserId = (caseManagerValue) => {
  // Try to find user by Firebase ID first, then by name, email, or aeriesId
  const user = Object.values(userMap.value).find(u => 
    u.id === caseManagerValue || 
    u.name === caseManagerValue || 
    u.email === caseManagerValue ||
    u.aeriesId === caseManagerValue
  )
  
  console.log('Mapping case manager:', caseManagerValue, 'to Firebase ID:', user?.id)
  return user ? user.id : caseManagerValue
}

const validateStudentRecord = (studentData) => {
  const errors = []
  
  // Required field validation - check both locations for SSID
  const ssid = studentData.ssid || studentData.app?.studentData?.ssid
  if (!ssid) {
    errors.push('SSID is required (either top-level or in app.studentData)')
  }
  
  if (!studentData.app?.studentData?.firstName) {
    errors.push('First name is required')
  }
  
  if (!studentData.app?.studentData?.lastName) {
    errors.push('Last name is required')
  }
  
  if (!studentData.app?.studentData?.grade) {
    errors.push('Grade is required')
  }
  
  // SSID format validation
  if (ssid && !/^\d{9,10}$/.test(ssid)) {
    errors.push('SSID must be 9-10 digits')
  }
  
  // Grade validation
  if (studentData.app?.studentData?.grade && 
      !['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].includes(studentData.app.studentData.grade)) {
    errors.push('Grade must be K-12')
  }
  
  // Plan validation
  if (studentData.app?.studentData?.plan && 
      !['IEP', '504'].includes(studentData.app.studentData.plan)) {
    errors.push('Plan must be IEP or 504')
  }
  
  // Date validations
  if (studentData.app?.dates?.reviewDate && !isValidDate(studentData.app.dates.reviewDate)) {
    errors.push('Invalid review date format (use YYYY-MM-DD)')
  }
  
  if (studentData.app?.dates?.reevalDate && !isValidDate(studentData.app.dates.reevalDate)) {
    errors.push('Invalid reevaluation date format (use YYYY-MM-DD)')
  }
  
  if (studentData.app?.dates?.meetingDate && !isValidDate(studentData.app.dates.meetingDate)) {
    errors.push('Invalid meeting date format (use YYYY-MM-DD)')
  }
  
  return errors
}

// Helper function to validate date format
const isValidDate = (dateString) => {
  if (!dateString) return true // Optional field
  const date = new Date(dateString)
  return !isNaN(date.getTime()) && dateString.match(/^\d{4}-\d{2}-\d{2}$/)
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ''
    
    return date.toISOString().split('T')[0] // YYYY-MM-DD format
  } catch (error) {
    return ''
  }
}

const getFullName = (studentData) => {
  const firstName = studentData.app?.studentData?.firstName || ''
  const lastName = studentData.app?.studentData?.lastName || ''
  return `${firstName} ${lastName}`.trim() || 'Missing Name'
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const nextStep = () => {
  if (step.value === 2) {
    validateMapping()
    if (mappingErrors.value.length > 0) return
    generatePreviewData()
  }
  step.value++
}

const prevStep = () => {
  step.value--
}

const importStudents = async () => {
  isImporting.value = true
  importProgress.value = 0
  
  const startTime = Date.now()
  const recordsToImport = importMode.value === 'valid-only' ? validRecords.value : previewData.value
  
  let successful = 0
  let failed = 0
  const errors = []
  
  try {
    for (let i = 0; i < recordsToImport.length; i++) {
      const record = recordsToImport[i]
      
      try {
        await importSingleStudent(record.data)
        successful++
      } catch (error) {
        failed++
        errors.push(`Row ${i + 1}: ${error.message}`)
      }
      
      // Update progress
      importProgress.value = Math.round(((i + 1) / recordsToImport.length) * 100)
    }
    
    importResults.value = {
      successful,
      failed,
      errors,
      processingTime: Date.now() - startTime
    }
    
    step.value = 4
    emit('imported', { successful, failed })
    
  } catch (error) {
    console.error('Import failed:', error)
    errors.push('Import process failed: ' + error.message)
    importResults.value = { successful, failed, errors, processingTime: Date.now() - startTime }
    step.value = 4
  } finally {
    isImporting.value = false
  }
}

// Helper functions
const mapTeacherToUserId = (teacherId) => {
  if (!teacherId) return ""
  
  console.log('🔍 Mapping teacher ID:', teacherId)
  console.log('📚 Available users:', Object.values(userMap.value).map(u => ({
    name: u.name,
    aeriesId: u.aeriesId,
    id: u.id
  })))
  
  // Try to find by Aeries ID
  const userByAeriesId = Object.values(userMap.value).find(u => {
    const match = String(u.aeriesId) === String(teacherId)
    if (match) {
      console.log('✅ Found exact Aeries ID match:', {
        teacherId,
        user: {
          name: u.name,
          aeriesId: u.aeriesId,
          id: u.id
        }
      })
    }
    return match
  })
  
  if (userByAeriesId) {
    console.log('✅ Using Aeries ID match:', teacherId, '→', userByAeriesId.id, '(', userByAeriesId.name, ')')
    return userByAeriesId.id
  }

  // Then try by exact Firebase ID match
  const userById = Object.values(userMap.value).find(u => u.id === teacherId)
  if (userById) {
    console.log('✅ Using Firebase ID match:', teacherId, '→', userById.id, '(', userById.name, ')')
    return userById.id
  }

  // If no match found, log warning and return original ID
  console.warn('❌ No user found for teacher ID:', teacherId)
  return teacherId
}

const mapProviderToUserId = (providerId) => {
  if (!providerId) return ""
  
  console.log('🔍 Mapping provider ID:', providerId)
  console.log('📚 Available users:', Object.values(userMap.value).map(u => ({
    name: u.name,
    aeriesId: u.aeriesId,
    id: u.id
  })))
  
  // Try to find by Aeries ID
  const userByAeriesId = Object.values(userMap.value).find(u => {
    const match = String(u.aeriesId) === String(providerId)
    if (match) {
      console.log('✅ Found exact Aeries ID match:', {
        providerId,
        user: {
          name: u.name,
          aeriesId: u.aeriesId,
          id: u.id
        }
      })
    }
    return match
  })
  
  if (userByAeriesId) {
    console.log('✅ Using Aeries ID match:', providerId, '→', userByAeriesId.id, '(', userByAeriesId.name, ')')
    return userByAeriesId.id
  }

  // Then try by exact Firebase ID match
  const userById = Object.values(userMap.value).find(u => u.id === providerId)
  if (userById) {
    console.log('✅ Using Firebase ID match:', providerId, '→', userById.id, '(', userById.name, ')')
    return userById.id
  }

  // If no match found, log warning and return original ID
  console.warn('❌ No user found for provider ID:', providerId)
  return providerId
}

// Helper function to validate student data structure
const isValidStudentData = (data) => {
  try {
    return (
      data.app &&
      data.app.studentData &&
      data.app.studentData.ssid &&
      data.app.studentData.firstName &&
      data.app.studentData.lastName &&
      data.app.studentData.grade &&
      data.app.schedule &&
      Array.isArray(data.app.schedule.classServices)
    )
  } catch (error) {
    return false
  }
}

const importSingleStudent = async (studentData) => {
  try {
    const ssid = studentData.app.studentData.ssid
    
    // Check if student already exists
    const studentsRef = collection(db, 'students')
    const q = query(studentsRef, where('app.studentData.ssid', '==', ssid))
    const querySnapshot = await getDocs(q)
    
    if (!querySnapshot.empty && !updateExisting.value) {
      throw new Error(`Student with SSID ${ssid} already exists`)
    }
    
    // Build the exact same structure as the regular student form
    const finalData = {
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      
      app: {
        studentData: {
          firstName: studentData.app.studentData.firstName || "",
          lastName: studentData.app.studentData.lastName || "",
          grade: studentData.app.studentData.grade || "",
          plan: studentData.app.studentData.plan || "",
          caseManagerId: mapCaseManagerToUserId(studentData.app.studentData.caseManagerId) || "",
          ssid: ssid
        },
        
        dates: {
          reviewDate: studentData.app.dates.reviewDate || "",
          reevalDate: studentData.app.dates.reevalDate || "",
          meetingDate: studentData.app.dates.meetingDate || ""
        },
        
                schedule: {
          periods: studentData.app.schedule.periods || {
            1: "",
            2: "",
            3: "",
            4: "",
            5: "",
            6: "",
            7: ""
          },
          classServices: Array.isArray(studentData.app.schedule.classServices) ? 
studentData.app.schedule.classServices : []
        },
        
        providers: studentData.app.providers || {
          speechId: "",
          otId: "",
          ptId: "",
          atId: "",
          audId: "",
          bisId: "",
          dhhId: "",
          hnId: "",
          mhId: "",
          omId: "",
          scId: "",
          swId: "",
          trId: "",
          viId: ""
        },
        
        accommodations: {
          assessment: studentData.app.accommodations.assessment || "",
          instruction: studentData.app.accommodations.instruction || ""
        },
        
        flags: {
          flag1: Boolean(studentData.app.flags.flag1),
          flag2: Boolean(studentData.app.flags.flag2)
        },
        
        documents: {
          bipPdfUrl: studentData.app.documents.bipPdfUrl || null,
          ataglancePdfUrl: studentData.app.documents.ataglancePdfUrl || null
        }
      }
    }

    // Log the final data for debugging
    console.log('Saving student data:', {
      ssid: finalData.app.studentData.ssid,
      schedule: finalData.app.schedule.periods,
      providers: finalData.app.providers
    })

    // Validate data structure before saving
    if (!isValidStudentData(finalData)) {
      throw new Error('Invalid student data structure')
    }
    
    if (!querySnapshot.empty && updateExisting.value) {
      // Update existing student
      const existingDoc = querySnapshot.docs[0]
      await setDoc(doc(db, 'students', existingDoc.id), finalData, { merge: true })
    } else {
      // Create new student
      const newStudentRef = doc(collection(db, 'students'))
      await setDoc(newStudentRef, finalData)
    }
  } catch (error) {
    console.error('Error importing student:', error)
    throw error
  }
}

const startOver = () => {
  step.value = 1
  fileName.value = ''
  fileSize.value = ''
  csvData.value = []
  csvHeaders.value = []
  fieldMapping.value = {}
  uploadError.value = ''
  mappingErrors.value = []
  previewData.value = []
  importResults.value = { successful: 0, failed: 0, errors: [], processingTime: 0 }
  
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}
</script>

<style scoped>
.bulk-importer {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.importer-header {
  text-align: center;
  margin-bottom: 30px;
}

.importer-header h2 {
  color: #2c3e50;
  margin-bottom: 10px;
}

.description {
  color: #666;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}

.step-container {
  background: white;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  margin-bottom: 20px;
}

.step-header {
  margin-bottom: 30px;
  text-align: center;
}

.step-header h3 {
  color: #2c3e50;
  margin-bottom: 10px;
}

.step-header p {
  color: #666;
  margin: 0;
}

/* File Upload Styles */
.file-upload-section {
  margin-bottom: 30px;
}

.file-input-wrapper {
  position: relative;
  display: inline-block;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  display: block;
}

.file-input {
  position: absolute;
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.file-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 20px;
  border: 2px dashed #ddd;
  border-radius: 8px;
  background: #f9f9f9;
  cursor: pointer;
  transition: all 0.3s ease;
}

.file-label:hover {
  border-color: #2a79c9;
  background: #f0f8ff;
}

.file-icon {
  font-size: 24px;
}

.file-text {
  font-weight: 500;
  color: #333;
}

.file-info {
  margin-top: 15px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
  text-align: center;
}

.file-info p {
  margin: 5px 0;
  color: #666;
}

.error-message {
  color: #dc3545;
  background: #f8d7da;
  padding: 10px;
  border-radius: 4px;
  margin-top: 10px;
  text-align: center;
}

/* Sample Format Styles */
.sample-format {
  margin-top: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 6px;
}

.sample-format h4 {
  margin-bottom: 15px;
  color: #2c3e50;
}

.format-example {
  background: #fff;
  padding: 15px;
  border-radius: 4px;
  border: 1px solid #ddd;
  margin-bottom: 15px;
}

.format-example code {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
  color: #333;
}

.format-note {
  color: #666;
  font-size: 14px;
  margin: 0;
}

/* Field Mapping Styles */
.field-mapping-section {
  margin-bottom: 30px;
}

.mapping-grid {
  border: 1px solid #ddd;
  border-radius: 6px;
  overflow: hidden;
}

.mapping-header {
  display: grid;
  grid-template-columns: 1fr 50px 1fr 1fr;
  gap: 15px;
  padding: 15px;
  background: #f8f9fa;
  font-weight: 600;
  border-bottom: 1px solid #ddd;
}

.mapping-row {
  display: grid;
  grid-template-columns: 1fr 50px 1fr 1fr;
  gap: 15px;
  padding: 15px;
  border-bottom: 1px solid #eee;
  align-items: center;
}

.mapping-row:last-child {
  border-bottom: none;
}

.csv-column {
  font-weight: 500;
  color: #2c3e50;
}

.arrow {
  text-align: center;
  color: #666;
  font-size: 18px;
}

.field-select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.sample-data {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #666;
  background: #f8f9fa;
  padding: 5px 8px;
  border-radius: 3px;
}

.auto-mapping-section {
  margin-top: 20px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 6px;
}

.auto-mapping-section h4 {
  margin-bottom: 15px;
  color: #2c3e50;
}

.quick-actions {
  display: flex !important;
  gap: 10px !important;
}

.quick-actions .btn {
  padding: 8px 16px !important;
  font-size: 14px !important;
  min-width: auto !important;
}

.validation-errors {
  margin-top: 20px;
  padding: 15px;
  background: #f8d7da;
  border-radius: 6px;
  border: 1px solid #f5c6cb;
}

.validation-errors h4 {
  color: #721c24;
  margin-bottom: 10px;
}

.error-list {
  margin: 0;
  padding-left: 20px;
}

.error-item {
  color: #721c24;
  margin-bottom: 5px;
}

/* Preview Styles */
.preview-section {
  margin-bottom: 30px;
}

.preview-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-item {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 6px;
  text-align: center;
}

.stat-label {
  display: block;
  color: #666;
  font-size: 14px;
  margin-bottom: 5px;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
}

.stat-value.valid {
  color: #28a745;
}

.stat-value.invalid {
  color: #dc3545;
}

.preview-table-container {
  overflow-x: auto;
  border: 1px solid #ddd;
  border-radius: 6px;
  margin-bottom: 30px;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
}

.preview-table th,
.preview-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.preview-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #2c3e50;
}

.invalid-row {
  background: #fdf2f2;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
}

.status-badge.valid {
  background: #d4edda;
  color: #155724;
}

.status-badge.error {
  background: #f8d7da;
  color: #721c24;
}

.error-list {
  margin: 0;
  padding-left: 15px;
  font-size: 12px;
}

.no-errors {
  color: #28a745;
  font-style: italic;
}

.import-options {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 6px;
}

.import-options h4 {
  margin-bottom: 15px;
  color: #2c3e50;
}

.options-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.option-item input {
  margin: 0;
}

/* Results Styles */
.results-section {
  margin-bottom: 30px;
}

.results-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-item.success .stat-value {
  color: #28a745;
}

.stat-item.error .stat-value {
  color: #dc3545;
}

.import-errors {
  margin-bottom: 30px;
  padding: 20px;
  background: #f8d7da;
  border-radius: 6px;
  border: 1px solid #f5c6cb;
}

.import-errors h4 {
  color: #721c24;
  margin-bottom: 15px;
}

.results-actions {
  display: flex !important;
  gap: 10px !important;
  justify-content: center !important;
  padding: 20px 0 !important;
  border-top: 1px solid #eee !important;
  background: #f8f9fa !important;
}

/* Step Actions */
.step-actions {
  display: flex !important;
  justify-content: center !important;
  gap: 15px !important;
  margin-top: 30px !important;
  padding: 20px 0 !important;
  border-top: 1px solid #eee !important;
  background: #f8f9fa !important;
  min-height: 80px !important;
}

/* Button Styles */
.bulk-importer .btn {
  padding: 12px 24px !important;
  border: none !important;
  border-radius: 6px !important;
  font-size: 16px !important;
  font-weight: 500 !important;
  cursor: pointer !important;
  transition: all 0.3s ease !important;
  text-decoration: none !important;
  display: inline-block !important;
  min-width: 120px !important;
  text-align: center !important;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
  margin: 0 5px !important;
}

.bulk-importer .btn-primary {
  background: #2a79c9 !important;
  color: white !important;
}

.bulk-importer .btn-primary:hover:not(:disabled) {
  background: #1e5a96 !important;
  transform: translateY(-1px) !important;
}

.bulk-importer .btn-secondary {
  background: #6c757d !important;
  color: white !important;
}

.bulk-importer .btn-secondary:hover:not(:disabled) {
  background: #545b62 !important;
  transform: translateY(-1px) !important;
}

.bulk-importer .btn:disabled {
  opacity: 0.6 !important;
  cursor: not-allowed !important;
  transform: none !important;
}

/* Loading Overlay */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-content {
  background: white;
  padding: 40px;
  border-radius: 8px;
  text-align: center;
  max-width: 400px;
  width: 90%;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #2a79c9;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #f3f3f3;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 15px;
}

.progress-fill {
  height: 100%;
  background: #2a79c9;
  transition: width 0.3s ease;
}

/* Responsive Design */
@media (max-width: 768px) {
  .mapping-header,
  .mapping-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  
  .arrow {
    display: none;
  }
  
  .preview-stats,
  .results-stats {
    grid-template-columns: 1fr;
  }
  
  .quick-actions {
    flex-direction: column;
  }
  
  .step-actions {
    flex-direction: column;
  }
}
</style> 