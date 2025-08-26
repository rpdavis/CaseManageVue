<template>
  <div class="add-user-wrapper">
    <div class="add-single">
      <h3>Add Single User</h3>
      <form @submit.prevent="addSingleUser" class="form-grid">
        <div>
          <label>
            Name:
            <input
              type="text"
              v-model="singleUser.name"
              required
              autocomplete="off"
              data-lpignore="true"
            />
          </label>
        </div>
        <div>
          <label>
            Email:
            <input
              type="email"
              v-model="singleUser.email"
              required
              autocomplete="off"
              data-lpignore="true"
            />
          </label>
        </div>
        <div>
          <label>
            Role:
            <select v-model="singleUser.role" required>
              <option value="" disabled>Select role...</option>
              <option v-for="role in sortedValidRoles" :key="role" :value="role">
                {{ role }}
              </option>
            </select>
          </label>
        </div>
        <div v-if="providerOptions.length > 0">
          <label>
            Provider Type:
            <select v-model="singleUser.provider">
              <option value="">None</option>
              <option v-for="provider in providerOptions" :key="provider.abbreviation" :value="provider.abbreviation">
                {{ provider.name }} ({{ provider.abbreviation }})
              </option>
            </select>
          </label>
        </div>
        <div>
          <label class="checkbox-label">
            <input
              type="checkbox"
              v-model="singleUser.testingAccess"
            />
            Testing Access - Can view testing accommodations for all students with separate settings
          </label>
          <small class="help-text">
            Grants access to testing accommodations data for students requiring separate testing environments
          </small>
        </div>
        <div>
          <label>
            Aeries ID:
            <input type="text" v-model="singleUser.aeriesId" placeholder="Optional Aeries Teacher ID" />
          </label>
        </div>
        <div>
          <label>
            Room:
            <input type="text" v-model="singleUser.rm" placeholder="Room number (e.g., 101, A-23)" />
          </label>
        </div>
        <div>
          <label>
            Extension:
            <input type="text" v-model="singleUser.ext" placeholder="Phone extension (e.g., 1234)" />
          </label>
        </div>
        <button type="submit">Add User</button>
      </form>
    </div>

    <div class="add-bulk">
      <h3>Bulk Upload Users</h3>
      <div>
        <input
          type="file"
          ref="bulkFileInput"
          accept=".csv, .xls, .xlsx"
          @change="handleFileSelect"
        />
        <button @click="uploadBulkUsers" :disabled="!selectedFile">
          Upload Users
        </button>
      </div>
      <h4>📋 Import Format & Requirements</h4>
      
      <!-- File Format Info -->
      <div class="format-info">
        <p><strong>📁 File Format:</strong> CSV, Excel (.xls, .xlsx) - First row must contain column headers</p>
        <p><strong>⚠️ Important:</strong> Column order matters! Headers must match exactly or use standard order</p>
      </div>

      <!-- Visual Spreadsheet Example -->
      <div class="spreadsheet-example">
        <h5>📊 Example Spreadsheet Layout</h5>
        <div class="table-container">
          <table class="example-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Provider</th>
                <th>AeriesID</th>
                <th>Room</th>
                <th>Extension</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>John Smith</td>
                <td>john.smith@school.org</td>
                <td><span class="role-badge teacher">teacher</span></td>
                <td></td>
                <td>123456</td>
                <td>A-101</td>
                <td>1234</td>
              </tr>
                             <tr>
                 <td>Jane Doe</td>
                 <td>jane.doe@school.org</td>
                 <td><span class="role-badge service-provider">service_provider</span></td>
                 <td><span class="provider-badge">SLP</span></td>
                 <td></td>
                 <td>B-205</td>
                 <td>5678</td>
               </tr>
              <tr>
                <td>Bob Johnson</td>
                <td>bob.johnson@school.org</td>
                <td><span class="role-badge case-manager">case_manager</span></td>
                <td></td>
                <td>789012</td>
                <td>C-150</td>
                <td>9101</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Compact Reference Cards -->
      <div class="reference-cards">
        <!-- First Row: Roles and Service Providers -->
        <div class="reference-card roles-card">
          <div class="card-header roles-header">
            <h5>👥 Available Roles</h5>
            <span class="card-count">10 roles</span>
          </div>
          <div class="card-content">
            <div class="compact-grid">
              <div class="compact-item">
                <span class="role-badge admin">admin</span>
                <span class="compact-desc">Full system access</span>
              </div>
              <div class="compact-item">
                <span class="role-badge school-admin">school_admin</span>
                <span class="compact-desc">School-level admin</span>
              </div>
              <div class="compact-item">
                <span class="role-badge staff-view">staff_view</span>
                <span class="compact-desc">View-only access</span>
              </div>
              <div class="compact-item">
                <span class="role-badge staff-edit">staff_edit</span>
                <span class="compact-desc">Edit students, no admin panel</span>
              </div>
              <div class="compact-item">
                <span class="role-badge admin-504">admin_504</span>
                <span class="compact-desc">504-specific admin</span>
              </div>
              <div class="compact-item">
                <span class="role-badge sped-chair">sped_chair</span>
                <span class="compact-desc">SPED chair access</span>
              </div>
              <div class="compact-item">
                <span class="role-badge case-manager">case_manager</span>
                <span class="compact-desc">Case manager access</span>
              </div>
              <div class="compact-item">
                <span class="role-badge teacher">teacher</span>
                <span class="compact-desc">Teacher access</span>
              </div>
              <div class="compact-item">
                <span class="role-badge service-provider">service_provider</span>
                <span class="compact-desc">Service provider access</span>
              </div>
              <div class="compact-item">
                <span class="role-badge paraeducator">paraeducator</span>
                <span class="compact-desc">Paraeducator access</span>
              </div>
            </div>
          </div>
        </div>

        <div class="reference-card providers-card">
          <div class="card-header providers-header">
            <h5>🏥 Service Providers</h5>
            <span class="card-count">14 types</span>
          </div>
          <div class="card-content">
            <p class="card-note"><strong>📝 Note:</strong> Use abbreviation only in import file</p>
            <div class="compact-grid">
              <div class="compact-item">
                <span class="provider-badge">SLP</span>
                <span class="compact-desc">Speech-Language Therapy</span>
              </div>
              <div class="compact-item">
                <span class="provider-badge">OT</span>
                <span class="compact-desc">Occupational Therapy</span>
              </div>
              <div class="compact-item">
                <span class="provider-badge">PT</span>
                <span class="compact-desc">Physical Therapy</span>
              </div>
              <div class="compact-item">
                <span class="provider-badge">SC</span>
                <span class="compact-desc">School Counseling</span>
              </div>
              <div class="compact-item">
                <span class="provider-badge">MH</span>
                <span class="compact-desc">School-Based Mental Health</span>
              </div>
              <div class="compact-item">
                <span class="provider-badge">TR</span>
                <span class="compact-desc">Transportation</span>
              </div>
              <div class="compact-item">
                <span class="provider-badge">AUD</span>
                <span class="compact-desc">Audiology Services</span>
              </div>
              <div class="compact-item">
                <span class="provider-badge">VI</span>
                <span class="compact-desc">Vision Services</span>
              </div>
              <div class="compact-item">
                <span class="provider-badge">AT</span>
                <span class="compact-desc">Assistive Technology</span>
              </div>
              <div class="compact-item">
                <span class="provider-badge">DHH</span>
                <span class="compact-desc">Deaf and Hard of Hearing</span>
              </div>
              <div class="compact-item">
                <span class="provider-badge">O&M</span>
                <span class="compact-desc">Orientation and Mobility</span>
              </div>
              <div class="compact-item">
                <span class="provider-badge">BIS</span>
                <span class="compact-desc">Behavioral Intervention</span>
              </div>
              <div class="compact-item">
                <span class="provider-badge">HN</span>
                <span class="compact-desc">Health/Nursing Services</span>
              </div>
              <div class="compact-item">
                <span class="provider-badge">SW</span>
                <span class="compact-desc">Social Work Services</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Second Row: Aeries ID (Full Width) -->
        <div class="reference-card aeries-card">
          <div class="card-header aeries-header">
            <h5>🆔 Aeries ID / SIS ID</h5>
            <span class="card-count">6-digit numeric</span>
          </div>
          <div class="card-content">
            <div class="aeries-info">
              <div class="info-item">
                <span class="info-label">Purpose:</span>
                <span class="info-value">Links teachers to classes in Aeries/SIS systems</span>
              </div>
              <div class="info-item">
                <span class="info-label">Format:</span>
                <span class="info-value">123456 (6-digit numeric)</span>
              </div>
              <div class="info-item">
                <span class="info-label">Required for:</span>
                <span class="info-value">Teachers & service providers who teach classes</span>
              </div>
              <div class="info-item">
                <span class="info-label">Optional for:</span>
                <span class="info-value">Admin roles, case managers, paraeducators</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Troubleshooting Notes -->
      <div class="troubleshooting-notes">
        <h5>🔧 Troubleshooting Tips</h5>
        <div class="tips-grid">
          <div class="tip-item">
            <strong>📋 Column Headers:</strong>
            <ul>
              <li>Use exact header names: Name, Email, Role, Provider, AeriesID</li>
              <li>Or use standard order: Name (1st), Email (2nd), Role (3rd), Provider (4th), AeriesID (5th)</li>
            </ul>
          </div>
                     <div class="tip-item">
             <strong>✅ Validation:</strong>
             <ul>
               <li>All emails must be valid format</li>
               <li>Roles must match exactly (case-sensitive)</li>
               <li>Provider types only for service_provider role</li>
               <li>Use provider abbreviations only (SLP, OT, PT, etc.)</li>
             </ul>
           </div>
                     <div class="tip-item">
             <strong>⚠️ Common Issues:</strong>
             <ul>
               <li>Extra spaces in role names</li>
               <li>Missing quotes around values with commas</li>
               <li>Invalid email formats</li>
               <li>Non-numeric Aeries IDs</li>
               <li>Using full provider names instead of abbreviations</li>
             </ul>
           </div>
        </div>
      </div>
    </div>

    <!-- Status Messages -->
    <div v-if="statusMessage" :class="['status-msg', { error: isError }]">
      {{ statusMessage }}
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase.js'
import { getFirestore, collection, addDoc } from 'firebase/firestore'
import { VALID_ROLES, isApprovedRole } from '../config/roles.js'
import { useAppSettings } from '@/composables/useAppSettings'
import { auditLogger } from '@/utils/auditLogger'
import { 
  validateUserData, 
  sanitizeUserFormData, 
  checkSecurityThreats,
  validateFile,
  checkRateLimit
} from '@/utils/validation.js'

export default {
  name: 'UserAddForm',
  setup() {
    const addUserWithRoleCallable = httpsCallable(functions, 'addUserWithRole')
    const db = getFirestore()

    const singleUser = reactive({
      name: '',
      email: '',
      role: '',
      provider: '',
      aeriesId: '',
      rm: '',
      ext: '',
      testingAccess: false
    })

    const selectedFile = ref(null)
    const statusMessage = ref('')
    const isError = ref(false)
    const bulkFileInput = ref(null)

    const validRoles = VALID_ROLES

    const { appSettings, loadAppSettings } = useAppSettings()

    // Sorted roles for dropdown (alphabetical order)
    const sortedValidRoles = computed(() => {
      return [...VALID_ROLES].sort()
    })

    const providerOptions = computed(() => {
      if (appSettings && appSettings.value && appSettings.value.serviceProviders) {
        const DEFAULT_SERVICE_PROVIDERS = [
          { name: 'Speech-Language Therapy', abbreviation: 'SLP' },
          { name: 'Occupational Therapy', abbreviation: 'OT' },
          { name: 'Physical Therapy', abbreviation: 'PT' },
          { name: 'School Counseling', abbreviation: 'SC' },
          { name: 'School-Based Mental Health Services', abbreviation: 'MH' },
          { name: 'Transportation', abbreviation: 'TR' },
          { name: 'Audiology Services', abbreviation: 'AUD' },
          { name: 'Vision Services', abbreviation: 'VI' },
          { name: 'Assistive Technology', abbreviation: 'AT' },
          { name: 'Deaf and Hard of Hearing Services', abbreviation: 'DHH' },
          { name: 'Orientation and Mobility', abbreviation: 'O&M' },
          { name: 'Behavioral Intervention Services', abbreviation: 'BIS' },
          { name: 'Health/Nursing Services', abbreviation: 'HN' },
          { name: 'Social Work Services', abbreviation: 'SW' }
        ]
        return appSettings.value.serviceProviders
          .map(abbr => DEFAULT_SERVICE_PROVIDERS.find(p => p.abbreviation === abbr) || { name: abbr, abbreviation: abbr })
          .sort((a, b) => a.name.localeCompare(b.name))
      }
      return []
    })

    const showStatus = (message, error = false) => {
      statusMessage.value = message
      isError.value = error
      setTimeout(() => {
        statusMessage.value = ''
        isError.value = false
      }, 5000)
    }

    const createUserInFirestore = async (name, email, role, provider, aeriesId, rm, ext) => {
      try {
        const userData = {
          name: name,
          email: email,
          role: role,
          provider: provider,
          aeriesId: aeriesId,
          rm: rm,
          ext: ext,
          createdAt: new Date(),
          status: 'active'
        }
        const docRef = await addDoc(collection(db, 'users'), userData)
        
        // Log user creation
        await auditLogger.logUserManagement(docRef.id, 'create', {
          userData: {
            name: name,
            email: email,
            role: role,
            provider: provider,
            aeriesId: aeriesId,
            rm: rm,
            ext: ext
          },
          method: 'firestore_direct'
        })
        
        return { success: true, userId: docRef.id }
      } catch (error) {
        // Log creation failure
        await auditLogger.logUserManagement('unknown', 'create_failed', {
          error: error.message,
          attemptedData: { name, email, role, provider, aeriesId, rm, ext },
          method: 'firestore_direct'
        })
        
        throw error
      }
    }

    const addUserToFirestore = async (name, email, role, provider, aeriesId, rm, ext) => {
      try {
        try {
          await addUserWithRoleCallable({ name, email, role, provider, aeriesId, rm, ext })
          
          // Log successful user creation via cloud function
          await auditLogger.logUserManagement('cloud_function_user', 'create', {
            userData: { name, email, role, provider, aeriesId, rm, ext },
            method: 'cloud_function'
          })
          
          return { success: true, method: 'cloud-function' }
        } catch (cloudError) {
          // Check if the error is because user already exists
          if (cloudError.code === 'functions/already-exists' || 
              cloudError.message?.includes('409') || 
              cloudError.message?.includes('already exists')) {
            console.log(`User ${email} already exists in Firebase Auth, skipping...`)
            
            // Log existing user attempt
            await auditLogger.logUserManagement('existing_user', 'create_skipped', {
              userData: { name, email, role, provider, aeriesId, rm, ext },
              reason: 'user_already_exists',
              method: 'cloud_function'
            })
            
            return { success: true, method: 'already-exists', message: 'User already exists' }
          }
          
          // For other errors, try creating in Firestore only
          await createUserInFirestore(name, email, role, provider, aeriesId, rm, ext)
          return { success: true, method: 'firestore' }
        }
      } catch (error) {
        // Log overall creation failure
        await auditLogger.logUserManagement('unknown', 'create_failed', {
          error: error.message,
          attemptedData: { name, email, role, provider, aeriesId, rm, ext },
          method: 'addUserToFirestore'
        })
        
        return { success: false, error: error.message }
      }
    }

    const addSingleUser = async () => {
      // Rate limiting check
      const rateCheck = checkRateLimit('addUser', 5, 60000) // 5 requests per minute
      if (!rateCheck.allowed) {
        showStatus('Too many requests. Please wait before adding another user.', true)
        return
      }
      
      // Sanitize input data
      const sanitizedData = sanitizeUserFormData(singleUser)
      
      // Comprehensive validation
      const validation = validateUserData(sanitizedData)
      if (!validation.isValid) {
        showStatus(`Please fix the following errors:\n${validation.errors.join('\n')}`, true)
        return
      }
      
      // Security threat detection
      const textFields = ['name', 'email', 'aeriesId', 'rm', 'ext']
      for (const field of textFields) {
        if (sanitizedData[field]) {
          const securityCheck = checkSecurityThreats(sanitizedData[field])
          if (!securityCheck.isSafe) {
            showStatus(`Security threat detected in ${field}: ${securityCheck.threats.join(', ')}`, true)
            return
          }
        }
      }
      
      // Apply sanitized data
      Object.assign(singleUser, sanitizedData)
      
      const result = await addUserToFirestore(
        singleUser.name,
        singleUser.email,
        singleUser.role,
        singleUser.provider,
        singleUser.aeriesId,
        singleUser.rm,
        singleUser.ext
      )
      if (result.success) {
        showStatus(`User ${singleUser.name} added successfully!`)
        singleUser.name = ''
        singleUser.email = ''
        singleUser.role = ''
        singleUser.provider = ''
        singleUser.aeriesId = ''
        singleUser.rm = ''
        singleUser.ext = ''
      } else {
        showStatus(`Error adding user: ${result.error}`, true)
      }
    }

    const handleFileSelect = (event) => {
      const file = event.target.files[0]
      if (file) {
        // Validate file
        const fileValidation = validateFile(file, {
          allowedTypes: ['csv', 'excel'],
          maxSize: 5 * 1024 * 1024, // 5MB for CSV/Excel files
          fieldName: 'User Import File'
        })
        
        if (!fileValidation.isValid) {
          showStatus(fileValidation.error, true)
          event.target.value = '' // Clear the file input
          return
        }
        
        // Check for security threats in filename
        const securityCheck = checkSecurityThreats(file.name)
        if (!securityCheck.isSafe) {
          showStatus(`File name contains potentially dangerous content: ${securityCheck.threats.join(', ')}`, true)
          event.target.value = '' // Clear the file input
          return
        }
        
        selectedFile.value = file
      }
    }

    const uploadBulkUsers = async () => {
      if (!selectedFile.value) {
        showStatus('Please select a file first', true)
        return
      }

      const fileName = selectedFile.value.name.toLowerCase()
      if (!(fileName.endsWith('.csv') || fileName.endsWith('.xls') || fileName.endsWith('.xlsx'))) {
        showStatus('Unsupported file type. Please upload a .csv, .xls, or .xlsx file.', true)
        return
      }

      showStatus('Processing file...')

      try {
        if (fileName.endsWith('.csv')) {
          await processCSVFile(selectedFile.value)
        } else {
          await processExcelFile(selectedFile.value)
        }
      } catch (error) {
        showStatus(`Error processing file: ${error.message}`, true)
        console.error('Bulk upload error:', error)
      }
    }

    const processCSVFile = async (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = async (e) => {
          try {
            const text = e.target.result
            const lines = text.trim().split(/\r?\n/)
            if (lines.length === 0) {
              reject(new Error('The CSV file is empty.'))
              return
            }

            // Simple CSV parser that handles quoted fields
            const parseCSVLine = (line) => {
              const result = []
              let current = ''
              let inQuotes = false
              
              for (let i = 0; i < line.length; i++) {
                const char = line[i]
                if (char === '"') {
                  inQuotes = !inQuotes
                } else if (char === ',' && !inQuotes) {
                  result.push(current.trim())
                  current = ''
                } else {
                  current += char
                }
              }
              result.push(current.trim())
              return result
            }

            let startIndex = 0
            const colIndex = { name: 0, email: 1, role: 2, provider: 3, aeriesId: 4, rm: 5, ext: 6 }
            const firstLineCols = parseCSVLine(lines[0])
            const headerDetected = firstLineCols.map(h => h.toLowerCase())
              .some(h => h.includes('name') || h.includes('email') || h.includes('role'))

            if (headerDetected) {
              firstLineCols.forEach((header, idx) => {
                const headerLC = header.trim().toLowerCase()
                if (headerLC === 'name' || headerLC === 'displayname') colIndex.name = idx
                if (headerLC === 'email') colIndex.email = idx
                if (headerLC === 'role') colIndex.role = idx
                if (headerLC === 'provider' || headerLC === 'providertype') colIndex.provider = idx
                if (headerLC === 'aeriesid' || headerLC === 'aeries_id' || headerLC === 'teacherid') colIndex.aeriesId = idx
                if (headerLC === 'rm' || headerLC === 'room') colIndex.rm = idx
                if (headerLC === 'ext' || headerLC === 'extension') colIndex.ext = idx
              })
              startIndex = 1
            }

            let successCount = 0
            const errorMessages = []

            for (let i = startIndex; i < lines.length; i++) {
              const line = lines[i].trim()
              if (!line) continue

              const parts = parseCSVLine(line)
              const name = (parts[colIndex.name] || '').trim()
              const email = (parts[colIndex.email] || '').trim()
              const role = (parts[colIndex.role] || '').trim()
              const provider = (parts[colIndex.provider] || '').trim()
              const aeriesId = (parts[colIndex.aeriesId] || '').trim()
              const rm = (parts[colIndex.rm] || '').trim()
              const ext = (parts[colIndex.ext] || '').trim()

              // Remove quotes from values
              const cleanName = name.replace(/^"|"$/g, '')
              const cleanEmail = email.replace(/^"|"$/g, '')
              const cleanRole = role.replace(/^"|"$/g, '')
              const cleanProvider = provider.replace(/^"|"$/g, '')
              const cleanAeriesId = aeriesId.replace(/^"|"$/g, '')
              const cleanRm = rm.replace(/^"|"$/g, '')
              const cleanExt = ext.replace(/^"|"$/g, '')

              if (!cleanName || !cleanEmail || !cleanRole) {
                errorMessages.push(`Line ${i + 1}: Missing name, email, or role.`)
                continue
              }

              if (!isApprovedRole(cleanRole)) {
                errorMessages.push(`Line ${i + 1}: Invalid role "${cleanRole}".`)
                continue
              }

              const result = await addUserToFirestore(cleanName, cleanEmail, cleanRole, cleanProvider, cleanAeriesId, cleanRm, cleanExt)
              if (result.success) {
                successCount++
                if (result.method === 'already-exists') {
                  console.log(`Line ${i + 1}: User ${cleanEmail} already exists, skipped`)
                }
              } else {
                errorMessages.push(`Line ${i + 1}: ${result.error}`)
              }
            }

            let summary = `${successCount} users added successfully.`
            if (errorMessages.length > 0) {
              summary += `\n${errorMessages.length} errors:\n` + errorMessages.join('\n')
            }
            showStatus(summary, errorMessages.length > 0)
            selectedFile.value = null
            if (bulkFileInput.value) {
              bulkFileInput.value.value = ''
            }
            resolve()
          } catch (err) {
            reject(new Error(`Error processing CSV file: ${err.message}`))
          }
        }
        reader.onerror = () => reject(new Error('Failed to read the CSV file.'))
        reader.readAsText(file)
      })
    }

    const processExcelFile = async (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = async (e) => {
          try {
            if (typeof XLSX === 'undefined') {
              reject(new Error('Excel upload requires SheetJS (XLSX) library. Please include it in your page.'))
              return
            }

            const data = new Uint8Array(e.target.result)
            const workbook = XLSX.read(data, { type: 'array' })
            const firstSheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[firstSheetName]
            const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

            if (rows.length === 0) {
              reject(new Error('The Excel file is empty or unrecognized.'))
              return
            }

            let successCount = 0
            const errorMessages = []

            for (let index = 0; index < rows.length; index++) {
              const row = rows[index]
              let name = '', email = '', role = '', provider = '', aeriesId = '', rm = '', ext = ''

              for (const key in row) {
                const keyLC = key.toLowerCase()
                const value = ('' + row[key]).trim()
                if ((keyLC === 'name' || keyLC === 'displayname') && !name) name = value
                else if (keyLC === 'email' && !email) email = value
                else if (keyLC === 'role' && !role) role = value
                else if ((keyLC === 'provider' || keyLC === 'providertype') && !provider) provider = value
                else if ((keyLC === 'aeriesid' || keyLC === 'aeries_id' || keyLC === 'teacherid') && !aeriesId) aeriesId = value
                else if ((keyLC === 'rm' || keyLC === 'room') && !rm) rm = value
                else if ((keyLC === 'ext' || keyLC === 'extension') && !ext) ext = value
              }

              // Fallback to column order if field names not found
              const rowValues = Object.values(row).map(val => ('' + val).trim())
              if (!name && rowValues[0]) name = rowValues[0]
              if (!email && rowValues[1]) email = rowValues[1]
              if (!role && rowValues[2]) role = rowValues[2]
              if (!provider && rowValues[3]) provider = rowValues[3]
              if (!aeriesId && rowValues[4]) aeriesId = rowValues[4]
              if (!rm && rowValues[5]) rm = rowValues[5]
              if (!ext && rowValues[6]) ext = rowValues[6]

              if (!name || !email || !role) {
                errorMessages.push(`Row ${index + 1}: Missing name, email, or role.`)
                continue
              }

              if (!isApprovedRole(role)) {
                errorMessages.push(`Row ${index + 1}: Invalid role "${role}".`)
                continue
              }

              const result = await addUserToFirestore(name, email, role, provider, aeriesId, rm, ext)
              if (result.success) {
                successCount++
                if (result.method === 'already-exists') {
                  console.log(`Row ${index + 1}: User ${email} already exists, skipped`)
                }
              } else {
                errorMessages.push(`Row ${index + 1}: ${result.error}`)
              }
            }

            let summary = `${successCount} users added successfully.`
            if (errorMessages.length > 0) {
              summary += `\n${errorMessages.length} errors:\n` + errorMessages.join('\n')
            }
            showStatus(summary, errorMessages.length > 0)
            selectedFile.value = null
            if (bulkFileInput.value) {
              bulkFileInput.value.value = ''
            }
            resolve()
          } catch (err) {
            reject(new Error(`Error processing Excel file: ${err.message}`))
          }
        }
        reader.onerror = () => reject(new Error('Failed to read the Excel file.'))
        reader.readAsArrayBuffer(file)
      })
    }

    onMounted(async () => {
      await loadAppSettings()
    })

    return {
      singleUser,
      validRoles,
      sortedValidRoles,
      providerOptions,
      addSingleUser,
      selectedFile,
      statusMessage,
      isError,
      bulkFileInput,
      handleFileSelect,
      uploadBulkUsers,
      appSettings
    }
  }
}
</script>

<style scoped>
/* Add your styles here */
/* Import Format & Requirements */
.format-info {
  margin: 1rem 0;
  padding: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.format-info p {
  margin: 0.5rem 0;
  font-size: 0.9rem;
}

/* Spreadsheet Example */
.spreadsheet-example {
  margin: 1.5rem 0;
}

.spreadsheet-example h5 {
  color: #2c3e50;
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.table-container {
  width: 100%;
  overflow-x: auto;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.example-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  font-size: 0.9rem;
}

.example-table th {
  background: #34495e;
  color: white;
  padding: 12px 8px;
  text-align: left;
  font-weight: 600;
  border: 1px solid #2c3e50;
}

.example-table td {
  padding: 10px 8px;
  border: 1px solid #ecf0f1;
  vertical-align: middle;
}

.example-table tr:nth-child(even) {
  background-color: #f8f9fa;
}

.example-table tr:hover {
  background-color: #e3f2fd;
}

/* Role Badges - Matching Permissions Overview Colors */
.role-badge {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: white;
  min-width: 80px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.role-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

/* Matching Permissions Overview gradient colors */
.role-badge.admin { background: linear-gradient(135deg, #6c757d 0%, #adb5bd 100%); }
.role-badge.school-admin { background: linear-gradient(135deg, #6f42c1 0%, #9775fa 100%); }
.role-badge.staff-view { background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%); }
.role-badge.staff-edit { background: linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%); }
.role-badge.admin-504 { background: linear-gradient(135deg, #10b981 0%, #34d399 100%); }
.role-badge.sped-chair { background: linear-gradient(135deg, #84cc16 0%, #a3e635 100%); }
.role-badge.case-manager { background: linear-gradient(135deg, #eab308 0%, #facc15 100%); }
.role-badge.teacher { background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); color: #2c3e50; }
.role-badge.service-provider { background: linear-gradient(135deg, #ef4444 0%, #f87171 100%); }
.role-badge.paraeducator { background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%); }

/* Provider Badge */
.provider-badge {
  display: inline-block;
  padding: 6px 12px;
  background: linear-gradient(135deg, #3498db 0%, #5dade2 100%);
  color: white;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.provider-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

/* Compact Reference Cards */
.reference-cards {
 
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin: 2rem 0;
}

/* First row: Roles and Service Providers (50% each) */
.roles-card,
.providers-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #e9ecef;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.roles-card:hover,
.providers-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

/* Second row: Aeries ID (full width) */
.aeries-card {
  grid-column: 1 / -1;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #e9ecef;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.aeries-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  color: white;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

/* Role header with professional gradient */
.roles-header {
  background:  linear-gradient(135deg, #d0d0d0, #c5c5c5);
}

/* Provider header with medical theme */
.providers-header {
  background:  linear-gradient(135deg, #d0d0d0, #c5c5c5);
}

/* Aeries header with tech theme */
.aeries-header {
  background: linear-gradient(135deg, #d0d0d0, #c5c5c5);
}

.card-header h5 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.card-count {
  font-size: 0.8rem;
  opacity: 0.9;
  background: rgba(255, 255, 255, 0.2);
  padding: 0.4rem 0.8rem;
  border-radius: 12px;
  font-weight: 500;
}

.card-content {
  padding: 1.5rem;
}

.card-note {
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: rgba(52, 152, 219, 0.1);
  border-left: 3px solid #3498db;
  border-radius: 4px;
  font-size: 0.85rem;
  color: #2c3e50;
}

.compact-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
}

.compact-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  text-align: center;
  transition: all 0.2s ease;
}

.compact-item:hover {
  background: #e9ecef;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.compact-desc {
  font-size: 0.75rem;
  color: #6c757d;
  line-height: 1.2;
  text-align: center;
  font-weight: 500;
}

.aeries-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #3498db;
  transition: all 0.2s ease;
}

.info-item:hover {
  background: #e9ecef;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.info-label {
  font-weight: 600;
  color: #495057;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 0.9rem;
  color: #6c757d;
  line-height: 1.4;
  font-weight: 500;
}

/* Troubleshooting Notes */
.troubleshooting-notes {
  margin: 1.5rem 0;
  padding: 1.5rem;
  background: linear-gradient(135deg, #353333, #6e6b6b);
  color: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.troubleshooting-notes h5 {
  color: white;
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.tips-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
}

.tip-item {
  background: rgba(255, 255, 255, 0.1);
  padding: 1rem;
  border-radius: 6px;
  backdrop-filter: blur(10px);
}

.tip-item strong {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
}

.tip-item ul {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}

.tip-item li {
  margin: 0.25rem 0;
  font-size: 0.85rem;
  line-height: 1.3;
}

/* Responsive Design */
@media (max-width: 768px) {
  .role-grid {
    grid-template-columns: 1fr;
  }
  
  .provider-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }
  
  .tips-grid {
    grid-template-columns: 1fr;
  }
  
  .example-table {
    font-size: 0.8rem;
  }
  
  .example-table th,
  .example-table td {
    padding: 8px 6px;
  }
}

.example-format strong {
  color: #495057;
}

/* Button Styles - Force visibility */
.add-user-wrapper button {
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
  margin: 10px 5px !important;
}

.add-user-wrapper button[type="submit"] {
  background: #007bff !important;
  color: white !important;
}

.add-user-wrapper button[type="submit"]:hover:not(:disabled) {
  background: #0056b3 !important;
}

.add-user-wrapper button:not([type="submit"]) {
  background: #28a745 !important;
  color: white !important;
}

.add-user-wrapper button:not([type="submit"]):hover:not(:disabled) {
  background: #1e7e34 !important;
}

.add-user-wrapper button:disabled {
  opacity: 0.6 !important;
  cursor: not-allowed !important;
  background: #6c757d !important;
}

/* Form layout */
.add-user-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.add-single, .add-bulk {
  background: white;
  border-radius: 8px;
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.form-grid label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-weight: 500;
}

.form-grid input, .form-grid select {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

/* File upload section */
.add-bulk > div {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
  flex-direction: column;
}

.add-bulk input[type="file"] {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  flex: 1;
}

/* Status messages */
.status-msg {
  padding: 15px;
  border-radius: 6px;
  margin-top: 20px;
  text-align: center;
}

.status-msg:not(.error) {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.status-msg.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}
.reference-card{
  width: 100%;
}
</style>