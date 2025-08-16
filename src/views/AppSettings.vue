<template>
  <div class="app-settings-panel" v-if="isAdmin">
    <h2>App Settings</h2>
    <form @submit.prevent="saveSettings">
      <!-- Grades -->
      <section class="settings-section">
        <fieldset>
        <legend>Grades</legend>
        <div class="grades-checkboxes">
          <label>
            <input type="checkbox" :checked="allGradesSelected" @change="toggleAllGrades" />
            <span>Select All</span>
          </label>
          <label v-for="grade in gradeOptions" :key="grade.value">
            <input type="checkbox" v-model="settings.grades" :value="grade.value" />
            <span>{{ grade.label }}</span>
          </label>
        </div></fieldset>
      </section>

      <!-- Class Services -->
      <section class="settings-section">
        <h3>Class Services</h3>
        <div class="class-service-fieldset" v-if="settings.classServices[0] && settings.classServices[0].enabledSubcategories">
          <fieldset>
            <legend>SDC</legend>
            <div class="checkbox-inline-group">
              <label v-for="sub in CORE_SUBCATEGORIES" :key="sub">
                <input type="checkbox" v-model="settings.classServices[0].enabledSubcategories" :value="sub" />
                {{ sub }}
              </label>
            </div>
          </fieldset>
        </div>
        <div class="class-service-fieldset" v-if="settings.classServices[1] && settings.classServices[1].enabledSubcategories">
          <fieldset>
            <legend>Co-teach</legend>
            <div class="checkbox-inline-group">
              <label v-for="sub in CORE_SUBCATEGORIES" :key="sub">
                <input type="checkbox" v-model="settings.classServices[1].enabledSubcategories" :value="sub" />
                {{ sub }}
              </label>
            </div>
          </fieldset>
        </div>
        <div class="class-service-fieldset" v-if="settings.classServices[2] && settings.classServices[2].enabledSubcategories">
          <fieldset>
            <legend>RSP</legend>
            <div class="checkbox-inline-group">
              <label v-for="sub in CORE_SUBCATEGORIES" :key="sub">
                <input type="checkbox" v-model="settings.classServices[2].enabledSubcategories" :value="sub" />
                {{ sub }}
              </label>
            </div>
          </fieldset>
        </div>
        <div class="class-service-fieldset" v-if="settings.classServices[3] && settings.classServices[3].enabledSubcategories">
          <fieldset>
            <legend>Other</legend>
            <div class="checkbox-inline-group">
              <label v-for="sub in ['FA', 'Directed Studies', 'DS: Reading Intv']" :key="sub">
                <input type="checkbox" v-model="settings.classServices[3].enabledSubcategories" :value="sub" />
                {{ sub }}
              </label>
            </div>
          </fieldset>
        </div>
        <div v-for="(service, sIdx) in settings.classServices.slice(4)" :key="service.name" class="class-service-fieldset">
          <fieldset>
            <legend>{{ service.name }}
              <button type="button" @click="removeClassService(sIdx + 4)" title="Remove Service">×</button>
            </legend>
            <div class="checkbox-inline-group">
              <label v-for="(sub, subIdx) in service.subcategories" :key="sub">
                <input type="checkbox" :checked="true" disabled />
                {{ sub }}
                <button type="button" @click="removeSubcategory(sIdx + 4, subIdx)" title="Remove Subcategory">×</button>
              </label>
              <button type="button" @click="addSubcategory(sIdx + 4)">+ Add Subcategory</button>
            </div>
          </fieldset>
        </div>
        <div class="add-class-service">
          <input type="text" v-model="newServiceName" placeholder="New Service Name" maxlength="18" />
          <input type="text" v-model="newServiceSubcat" placeholder="Add Subcategory" maxlength="18" @keyup.enter="addNewServiceSubcat" />
          <button type="button" @click="addNewServiceSubcat">+ Add Subcategory</button>
          <div class="custom-chips">
            <span v-for="(sub, idx) in newServiceSubcats" :key="sub" class="chip">
              {{ sub }} <button type="button" @click="removeNewServiceSubcat(idx)">×</button>
            </span>
          </div>
          <button type="button" @click="addClassService">+ Add Class Service</button>
        </div>
      </section>

      <!-- Service Providers -->
      <section class="settings-section">
        <fieldset>
          <legend>Service Providers</legend>
          <div class="service-providers-defaults">
            <label v-for="service in serviceProviders" :key="service.abbreviation">
              <input type="checkbox" v-model="settings.serviceProviders" :value="service.abbreviation" />
              <span>{{ service.name }} ({{ service.abbreviation }})</span>
            </label>
          </div>
          <div class="service-providers-custom">
            <label>Add Custom Service Provider:</label>
            <div class="custom-provider-inputs">
              <input type="text" v-model="customServiceProviderName" placeholder="Full Name" maxlength="100" />
              <input type="text" v-model="customServiceProviderAbbr" placeholder="Abbreviation" maxlength="10" />
              <button type="button" @click="addCustomServiceProvider">Add</button>
            </div>
            <div class="custom-chips">
              <span v-for="(svc, idx) in settings.customServiceProviders" :key="idx" class="chip">
                {{ svc.name }} ({{ svc.abbreviation }}) <button type="button" @click="removeCustomServiceProvider(idx)">×</button>
              </span>
            </div>
          </div>
        </fieldset>
      </section>

      <!-- Periods -->
      <section class="settings-section">
        <fieldset>
          <legend>Periods</legend>
          <div class="periods-controls">
            <div class="period-number-control">
              <label>
                Number of Periods:
                <select v-model="settings.numPeriods" class="period-number-select">
                  <option v-for="n in 15" :key="n" :value="n">{{ n }}</option>
                </select>
              </label>
            </div>
            
            <div class="period-labels" v-if="settings.numPeriods > 0">
              <h4>Period Labels (3 chars max each):</h4>
              <div class="period-labels-grid">
                <div v-for="i in settings.numPeriods" :key="i" class="period-label-item">
                  <label>
                    Period {{ i }}:
                    <input 
                      type="text" 
                      v-model="settings.periodLabels[i-1]" 
                      maxlength="3" 
                      :placeholder="`Per${i}`"
                      class="period-label-input"
                    />
                  </label>
                </div>
              </div>
            </div>
            
            <div class="period-preview" v-if="settings.numPeriods > 0">
              <strong>Preview:</strong> 
              <span v-for="i in settings.numPeriods" :key="i" class="period-preview-item">
                {{ settings.periodLabels[i-1] || `Per${i}` }}
              </span>
            </div>
          </div>
        </fieldset>
      </section>

      <!-- Gmail API Settings -->
      <section class="settings-section">
        <fieldset>
          <legend>Gmail API Settings</legend>
          <div class="gmail-api-settings">
            <div class="gmail-api-status">
              <h4>Status:</h4>
              <div class="status-indicators">
                <div class="status-item">
                  <span class="status-label">Google Workspace:</span>
                  <span :class="['status-value', settings.gmailApi?.isWorkspace ? 'enabled' : 'disabled']">
                    {{ settings.gmailApi?.isWorkspace ? 'Yes' : 'No' }}
                  </span>
                </div>
                <div class="status-item">
                  <span class="status-label">Internal OAuth:</span>
                  <span :class="['status-value', settings.gmailApi?.isInternalOAuth ? 'enabled' : 'disabled']">
                    {{ settings.gmailApi?.isInternalOAuth ? 'Yes' : 'No' }}
                  </span>
                </div>
                <div class="status-item">
                  <span class="status-label">Gmail API:</span>
                  <span :class="['status-value', settings.gmailApi?.enabled ? 'enabled' : 'disabled']">
                    {{ settings.gmailApi?.enabled ? 'Enabled' : 'Disabled' }}
                  </span>
                </div>
              </div>
              <div class="status-message" v-if="!settings.gmailApi?.enabled">
                <p>Gmail API features are currently disabled. To enable them, you need:</p>
                <ul>
                  <li>A Google Workspace organization (not a personal Gmail account)</li>
                  <li>OAuth consent screen set to "Internal" in Google Cloud Console</li>
                </ul>
                <p>Contact your Google Workspace administrator to configure these settings.</p>
              </div>
              <div class="last-check" v-if="settings.gmailApi?.lastCheck">
                Last checked: {{ new Date(settings.gmailApi.lastCheck).toLocaleString() }}
              </div>
            </div>
            <div class="gmail-api-actions">
              <button type="button" @click="checkGmailApiStatusHandler" :disabled="loading">
                Check Gmail API Status
              </button>
            </div>
          </div>
        </fieldset>
      </section>

      <!-- Save/Load/Reset -->
      <section class="settings-section">
        <div class="admin-action-btns">
          <button type="submit" :disabled="saveLoading || loading" class="admin-action-btn primary" style="min-width: 140px; max-width: 140px;">💾 Save Settings</button>
          <button type="button" @click="() => loadSettings(true)" :disabled="loading" class="admin-action-btn info" style="min-width: 100px; max-width: 100px;">📂 Load</button>
          <button type="button" @click="resetSettings" :disabled="loading" class="admin-action-btn warning" style="min-width: 100px; max-width: 100px;">↩️ Reset</button>
        </div>
        <div v-if="status" class="status-message" :class="{ error: statusError, success: !statusError }">
          {{ status }}
        </div>
      </section>
    </form>
  </div>
  <div v-else class="not-admin">
    <h2>App Settings</h2>
    <p>Access denied. You must be an admin to view this page.</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAppSettings } from '../composables/useAppSettings.js'
import { useAuthStore } from '@/store/authStore.js'
import { 
  sanitizeString, 
  checkSecurityThreats, 
  validateStringLength,
  checkRateLimit,
  sanitizeNumeric
} from '@/utils/validation.js'

// Import the checkGmailApiStatus function
const { appSettings, loadAppSettings, saveAppSettings, resetAppSettings, checkGmailApiStatus } = useAppSettings()

const authStore = useAuthStore()
const currentUser = computed(() => authStore.currentUser)
const userRole = computed(() => currentUser.value?.role || null)
const isAdmin = computed(() => [
  'admin',
  'school_admin',
  'admin_504',
  'sped_chair'
].includes(userRole.value))

const gradeOptions = [
  { value: 'K', label: 'K' },
  ...Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString(), label: (i + 1).toString() }))
]

const CORE_SUBCATEGORIES = ['English', 'Math', 'History', 'Science']

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



const loading = ref(false)
const saveLoading = ref(false)
const preventWatchers = ref(false)
const status = ref('')
const statusError = ref(false)
const customServiceProviderName = ref('')
const customServiceProviderAbbr = ref('')

// Variables for adding new class services
const newServiceName = ref('')
const newServiceSubcat = ref('')
const newServiceSubcats = ref([])

// Initialize default settings structure
const settings = ref({
  grades: ['7', '8'],
  classServices: [
    {
      name: 'SDC',
      subcategories: [...CORE_SUBCATEGORIES],
      enabledSubcategories: [...CORE_SUBCATEGORIES]
    },
    {
      name: 'Co-teach',
      subcategories: [...CORE_SUBCATEGORIES],
      enabledSubcategories: [...CORE_SUBCATEGORIES]
    },
    {
      name: 'RSP',
      subcategories: [...CORE_SUBCATEGORIES],
      enabledSubcategories: [...CORE_SUBCATEGORIES]
    },
    {
      name: 'Other',
      subcategories: ['FA', 'Directed Studies', 'DS: Reading Intv'],
      enabledSubcategories: ['FA', 'Directed Studies', 'DS: Reading Intv']
    }
  ],
  serviceProviders: ['SLP', 'OT', 'MH'],
  serviceProvidersDetails: DEFAULT_SERVICE_PROVIDERS,
  customServiceProviders: [],
  numPeriods: 7,
  periodLabels: ['1', '2', '3', '4', '5', '6', 'sh']
})

// Enhanced validation functions
const validateSettings = () => {
  // Validate number of periods
  const sanitizedNumPeriods = sanitizeNumeric(settings.value.numPeriods, {
    min: 1,
    max: 15,
    decimals: 0
  })
  
  if (sanitizedNumPeriods === null) {
    showStatus('Invalid number of periods. Must be between 1 and 15.', true)
    return false
  }
  
  settings.value.numPeriods = sanitizedNumPeriods

  // Validate period labels
  for (let i = 0; i < settings.value.numPeriods; i++) {
    if (!settings.value.periodLabels[i]) {
      settings.value.periodLabels[i] = `Per${i + 1}`
    }

    // Sanitize period label
    const sanitizedLabel = sanitizeString(settings.value.periodLabels[i], {
      trim: true,
      maxLength: 3,
      removeDangerous: true
    })

    // Security threat detection
    const securityCheck = checkSecurityThreats(sanitizedLabel)
    if (!securityCheck.isSafe) {
      showStatus(`Security threat detected in period ${i + 1} label: ${securityCheck.threats.join(', ')}`, true)
      return false
    }

    // Validate length
    const lengthValidation = validateStringLength(sanitizedLabel, { max: 3, fieldName: `Period ${i + 1} label` })
    if (!lengthValidation.isValid) {
      showStatus(lengthValidation.error, true)
      return false
    }

    settings.value.periodLabels[i] = sanitizedLabel
  }

  // Validate custom service providers (original validateSettings logic)
  if (settings.value.customServiceProviders) {
    for (let i = 0; i < settings.value.customServiceProviders.length; i++) {
      const provider = settings.value.customServiceProviders[i]
      
      if (provider.name) {
        const sanitizedName = sanitizeString(provider.name, {
          trim: true,
          maxLength: 100,
          removeDangerous: true
        })

        const securityCheck = checkSecurityThreats(sanitizedName)
        if (!securityCheck.isSafe) {
          showStatus(`Security threat detected in custom provider ${i + 1}: ${securityCheck.threats.join(', ')}`, true)
          return false
        }

        provider.name = sanitizedName
      }

      if (provider.abbreviation) {
        const sanitizedAbbr = sanitizeString(provider.abbreviation, {
          trim: true,
          maxLength: 10,
          removeDangerous: true
        })

        const securityCheck = checkSecurityThreats(sanitizedAbbr)
        if (!securityCheck.isSafe) {
          showStatus(`Security threat detected in custom provider abbreviation ${i + 1}: ${securityCheck.threats.join(', ')}`, true)
          return false
        }

        provider.abbreviation = sanitizedAbbr
      }
    }
  }

  return true
}

// Non-reactive validation function for save operations
const validateSettingsCopy = (settingsCopy) => {
  // Validate number of periods
  const sanitizedNumPeriods = sanitizeNumeric(settingsCopy.numPeriods, {
    min: 1,
    max: 15,
    decimals: 0
  })
  
  if (sanitizedNumPeriods === null) {
    showStatus('Invalid number of periods. Must be between 1 and 15.', true)
    return false
  }
  
  settingsCopy.numPeriods = sanitizedNumPeriods
  
  // Ensure we never save invalid numPeriods
  if (settingsCopy.numPeriods <= 0) {
    console.log('🔧 Preventing save of invalid numPeriods, setting to 7')
    settingsCopy.numPeriods = 7
  }

  // Validate period labels
  for (let i = 0; i < settingsCopy.numPeriods; i++) {
    if (!settingsCopy.periodLabels[i]) {
      settingsCopy.periodLabels[i] = `Per${i + 1}`
    }

    // Sanitize period label
    const sanitizedLabel = sanitizeString(settingsCopy.periodLabels[i], {
      trim: true,
      maxLength: 3,
      removeDangerous: true
    })

    // Security threat detection
    const securityCheck = checkSecurityThreats(sanitizedLabel)
    if (!securityCheck.isSafe) {
      showStatus(`Security threat detected in period ${i + 1} label: ${securityCheck.threats.join(', ')}`, true)
      return false
    }

    // Validate length
    const lengthValidation = validateStringLength(sanitizedLabel, { max: 3, fieldName: `Period ${i + 1} label` })
    if (!lengthValidation.isValid) {
      showStatus(lengthValidation.error, true)
      return false
    }

    settingsCopy.periodLabels[i] = sanitizedLabel
  }

  // Validate custom service providers
  if (settingsCopy.customServiceProviders) {
    for (let i = 0; i < settingsCopy.customServiceProviders.length; i++) {
      const provider = settingsCopy.customServiceProviders[i]
      
      if (provider.name) {
        const sanitizedName = sanitizeString(provider.name, {
          trim: true,
          maxLength: 100,
          removeDangerous: true
        })

        const securityCheck = checkSecurityThreats(sanitizedName)
        if (!securityCheck.isSafe) {
          showStatus(`Security threat detected in custom provider ${i + 1}: ${securityCheck.threats.join(', ')}`, true)
          return false
        }

        provider.name = sanitizedName
      }

      if (provider.abbreviation) {
        const sanitizedAbbr = sanitizeString(provider.abbreviation, {
          trim: true,
          maxLength: 10,
          removeDangerous: true
        })

        const securityCheck = checkSecurityThreats(sanitizedAbbr)
        if (!securityCheck.isSafe) {
          showStatus(`Security threat detected in custom provider abbreviation ${i + 1}: ${securityCheck.threats.join(', ')}`, true)
          return false
        }

        provider.abbreviation = sanitizedAbbr
      }
    }
  }

  return true
}

// Computed properties
const serviceProviders = computed(() => {
  return DEFAULT_SERVICE_PROVIDERS
})

const allGradesSelected = computed(() => {
  return gradeOptions.every(grade => settings.value.grades.includes(grade.value))
})

const toggleAllGrades = (event) => {
  if (event.target.checked) {
    settings.value.grades = gradeOptions.map(g => g.value)
  } else {
    settings.value.grades = []
  }
}

// Service provider management
const addCustomServiceProvider = () => {
  if (!customServiceProviderName.value.trim() || !customServiceProviderAbbr.value.trim()) {
    showStatus('Both name and abbreviation are required for custom service providers', true)
    return
  }
  
  // Check for duplicates
  const isDuplicate = settings.value.customServiceProviders.some(provider => 
    provider.abbreviation.toLowerCase() === customServiceProviderAbbr.value.toLowerCase()
  )
  
  if (isDuplicate) {
    showStatus('A service provider with this abbreviation already exists', true)
    return
  }
  
  settings.value.customServiceProviders.push({
    name: customServiceProviderName.value.trim(),
    abbreviation: customServiceProviderAbbr.value.trim()
  })
  
  // Clear input fields
  customServiceProviderName.value = ''
  customServiceProviderAbbr.value = ''
  
  showStatus('Custom service provider added successfully')
}

const removeCustomServiceProvider = (index) => {
  settings.value.customServiceProviders.splice(index, 1)
}

// Watchers for validation - FIXED to prevent infinite loops
watch(() => settings.value.numPeriods, (newVal, oldVal) => {
  // Prevent infinite loops during save operations or loading
  if (saveLoading.value || preventWatchers.value || loading.value) return;
  
  // Only process if value actually changed
  if (newVal === oldVal) return;
  
  // Sanitize and validate on change
  const sanitizedVal = sanitizeNumeric(newVal, { min: 1, max: 15, decimals: 0 })
  if (sanitizedVal !== null && sanitizedVal !== newVal) {
    // Temporarily prevent watchers to avoid loops
    preventWatchers.value = true
    settings.value.numPeriods = sanitizedVal
    setTimeout(() => { preventWatchers.value = false }, 50)
    return
  }

  // Only adjust period labels if we have a valid number
  if (sanitizedVal !== null && sanitizedVal > 0) {
    const defaultLabels = ['1', '2', '3', '4', '5', '6', 'sh']
    const currentLabels = [...(settings.value.periodLabels || [])]
    
    // Temporarily prevent watchers to avoid loops
    preventWatchers.value = true
    
    // Ensure period labels array matches number of periods
    if (currentLabels.length < sanitizedVal) {
      // Add missing labels using defaults
      for (let i = currentLabels.length; i < sanitizedVal; i++) {
        currentLabels.push(defaultLabels[i] || `${i + 1}`)
      }
      settings.value.periodLabels = currentLabels
    } else if (currentLabels.length > sanitizedVal) {
      // Trim excess labels
      settings.value.periodLabels = currentLabels.slice(0, sanitizedVal)
    }
    
    setTimeout(() => { preventWatchers.value = false }, 50)
  }
})

// Watch period labels for validation - SIMPLIFIED to prevent loops
watch(() => settings.value.periodLabels, (newLabels, oldLabels) => {
  // Prevent infinite loops during save operations or loading
  if (saveLoading.value || preventWatchers.value || loading.value) return;
  
  // Only process if labels actually changed
  if (!newLabels || !Array.isArray(newLabels)) return;
  
  let needsUpdate = false
  const updatedLabels = [...newLabels]
  
  newLabels.forEach((label, index) => {
    if (label && typeof label === 'string' && label.length > 3) {
      updatedLabels[index] = label.substring(0, 3)
      needsUpdate = true
    }
  })
  
  if (needsUpdate) {
    // Temporarily prevent watchers to avoid loops
    preventWatchers.value = true
    settings.value.periodLabels = updatedLabels
    setTimeout(() => { preventWatchers.value = false }, 50)
  }
}, { deep: true })

// Status message helper
const showStatus = (message, isError = false) => {
  status.value = message
  statusError.value = isError
  setTimeout(() => {
    status.value = ''
    statusError.value = false
  }, 5000)
}

// Main functions
const loadSettings = async (showMessage = false) => {
  loading.value = true
  try {
    const loadedSettings = await loadAppSettings()
    
    if (loadedSettings) {
      // Temporarily disable watchers during merge to prevent loops
      preventWatchers.value = true
      
      // Merge with defaults to ensure all properties exist
      settings.value = {
        ...settings.value,
        ...loadedSettings
      }
      
      // Fix any NaN or invalid values that might cause input errors
      if (isNaN(settings.value.numPeriods) || settings.value.numPeriods === null || settings.value.numPeriods === undefined || settings.value.numPeriods <= 0) {
        console.log('🔧 Fixing invalid numPeriods, setting to 7')
        settings.value.numPeriods = 7
      }
      
      // Ensure periodLabels is an array and has valid values
      if (!Array.isArray(settings.value.periodLabels)) {
        settings.value.periodLabels = []
      }
      
      // Ensure periodLabels array exists and has correct length
      if (!settings.value.periodLabels || settings.value.periodLabels.length < settings.value.numPeriods) {
        // Use the correct defaults from the composable: ['1', '2', '3', '4', '5', '6', 'sh']
        const defaultLabels = ['1', '2', '3', '4', '5', '6', 'sh']
        const currentLabels = settings.value.periodLabels || []
        const newLabels = []
        
        for (let i = 0; i < settings.value.numPeriods; i++) {
          // Use existing label, or default, or fallback
          newLabels[i] = currentLabels[i] || defaultLabels[i] || `${i + 1}`
        }
        settings.value.periodLabels = newLabels
      }
      
      // Re-enable watchers after merge
      setTimeout(() => {
        preventWatchers.value = false
      }, 100)
      
      if (showMessage) showStatus('Settings loaded successfully')
    }
  } catch (error) {
    console.error('Load settings error:', error)
    showStatus('Error loading settings', true)
  } finally {
    loading.value = false
  }
}

const saveSettings = async () => {
  console.log('🔧 STEP 1: Starting save operation...')
  
  // Rate limiting for save operations
  const rateCheck = checkRateLimit('saveAppSettings', 10, 60000) // 10 saves per minute
  if (!rateCheck.allowed) {
    console.log('❌ STEP 1 FAILED: Rate limit exceeded')
    showStatus('Too many save requests. Please wait before saving again.', true)
    return
  }
  console.log('✅ STEP 1 COMPLETE: Rate limit check passed')

  console.log('🔧 STEP 2: Preventing watchers and preparing settings...')
  // Prevent watchers from running during validation and save
  preventWatchers.value = true
  saveLoading.value = true
  
  try {
    console.log('🔧 STEP 3: Creating non-reactive copy for validation...')
    
    // Create a non-reactive copy for validation and saving
    const settingsToSave = JSON.parse(JSON.stringify(settings.value))
    
    console.log('🔧 STEP 4: Validating settings copy...')
    // Validate the copy instead of the reactive object
    if (!validateSettingsCopy(settingsToSave)) {
      console.log('❌ STEP 4 FAILED: Validation failed')
      preventWatchers.value = false
      saveLoading.value = false
      return
    }
    console.log('✅ STEP 4 COMPLETE: Validation passed')
    
    console.log('🔧 STEP 5: Calling saveAppSettings...')
    await saveAppSettings(settingsToSave)
    console.log('✅ STEP 5 COMPLETE: saveAppSettings returned successfully')
    
    showStatus('Settings saved successfully')
    console.log('✅ SAVE OPERATION COMPLETED SUCCESSFULLY')
    
  } catch (error) {
    console.error('❌ SAVE OPERATION FAILED at some step')
    console.error('❌ Error:', error)
    console.error('❌ Error message:', error.message)
    console.error('❌ Error stack:', error.stack)
    
    if (error.message === 'Save operation timed out') {
      showStatus('Save operation timed out. Please try again.', true)
    } else if (error.message && error.message.includes('quota')) {
      showStatus('Storage quota exceeded. Please contact administrator.', true)
    } else if (error.message && error.message.includes('permission')) {
      showStatus('Permission denied. Please check your access rights.', true)
    } else {
      showStatus('Error saving settings: ' + (error.message || 'Unknown error'), true)
    }
  } finally {
    console.log('👉 saveSettings: before cleanup')
    console.log('🔧 STEP 7: Cleaning up - setting saveLoading to false')
    saveLoading.value = false
    
    // Reset preventWatchers after a small delay to ensure UI updates first
    setTimeout(() => {
      preventWatchers.value = false
    }, 100)
    
    console.log('👉 saveSettings: after cleanup')
    console.log('✅ STEP 7 COMPLETE: Cleanup finished')
  }
}

const resetSettings = () => {
  if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
    settings.value = {
      grades: ['7', '8'],
      classServices: [
        {
          name: 'SDC',
          subcategories: [...CORE_SUBCATEGORIES],
          enabledSubcategories: [...CORE_SUBCATEGORIES]
        },
        {
          name: 'Co-teach',
          subcategories: [...CORE_SUBCATEGORIES],
          enabledSubcategories: [...CORE_SUBCATEGORIES]
        },
        {
          name: 'RSP',
          subcategories: [...CORE_SUBCATEGORIES],
          enabledSubcategories: [...CORE_SUBCATEGORIES]
        },
        {
          name: 'Other',
          subcategories: ['FA', 'Directed Studies', 'DS: Reading Intv'],
          enabledSubcategories: ['FA', 'Directed Studies', 'DS: Reading Intv']
        }
      ],
      serviceProviders: ['SLP', 'OT', 'MH'],
      serviceProvidersDetails: DEFAULT_SERVICE_PROVIDERS,
      customServiceProviders: [],
      numPeriods: 7,
      periodLabels: ['1', '2', '3', '4', '5', '6', 'sh']
    }
    showStatus('Settings reset to defaults')
  }
}

// Functions for adding/removing subcategories and class services
const addSubcategory = (serviceIndex) => {
  const newSubcat = prompt('Enter new subcategory name:')
  if (newSubcat && newSubcat.trim()) {
    const sanitized = sanitizeString(newSubcat.trim(), {
      maxLength: 18,
      removeDangerous: true
    })
    
    if (sanitized) {
      // Add to the specific service's subcategories
      if (!settings.value.classServices[serviceIndex]) {
        settings.value.classServices[serviceIndex] = { name: '', subcategories: [], enabledSubcategories: [] }
      }
      
      if (!settings.value.classServices[serviceIndex].subcategories.includes(sanitized)) {
        settings.value.classServices[serviceIndex].subcategories.push(sanitized)
        settings.value.classServices[serviceIndex].enabledSubcategories.push(sanitized)
        showStatus('Subcategory added successfully')
      } else {
        showStatus('Subcategory already exists', true)
      }
    }
  }
}

const removeSubcategory = (serviceIndex, subcategoryIndex) => {
  if (confirm('Are you sure you want to remove this subcategory?')) {
    const service = settings.value.classServices[serviceIndex]
    const subcatName = service.subcategories[subcategoryIndex]
    
    // Remove from subcategories array
    service.subcategories.splice(subcategoryIndex, 1)
    
    // Remove from enabled subcategories array
    const enabledIndex = service.enabledSubcategories.indexOf(subcatName)
    if (enabledIndex > -1) {
      service.enabledSubcategories.splice(enabledIndex, 1)
    }
    
    showStatus('Subcategory removed successfully')
  }
}

const addNewServiceSubcat = () => {
  if (newServiceSubcat.value && newServiceSubcat.value.trim()) {
    const sanitized = sanitizeString(newServiceSubcat.value.trim(), {
      maxLength: 18,
      removeDangerous: true
    })
    
    if (sanitized && !newServiceSubcats.value.includes(sanitized)) {
      newServiceSubcats.value.push(sanitized)
      newServiceSubcat.value = ''
    } else if (newServiceSubcats.value.includes(sanitized)) {
      showStatus('Subcategory already added', true)
    }
  }
}

const removeNewServiceSubcat = (index) => {
  newServiceSubcats.value.splice(index, 1)
}

const addClassService = () => {
  if (!newServiceName.value || !newServiceName.value.trim()) {
    showStatus('Please enter a service name', true)
    return
  }
  
  if (newServiceSubcats.value.length === 0) {
    showStatus('Please add at least one subcategory', true)
    return
  }
  
  const sanitizedName = sanitizeString(newServiceName.value.trim(), {
    maxLength: 18,
    removeDangerous: true
  })
  
  if (sanitizedName) {
    // Check if service already exists
    const existingService = settings.value.classServices.find(service => service.name === sanitizedName)
    if (existingService) {
      showStatus('Service with this name already exists', true)
      return
    }
    
    // Add new service
    const newService = {
      name: sanitizedName,
      subcategories: [...newServiceSubcats.value],
      enabledSubcategories: [...newServiceSubcats.value]
    }
    
    settings.value.classServices.push(newService)
    
    // Clear form
    newServiceName.value = ''
    newServiceSubcat.value = ''
    newServiceSubcats.value = []
    
    showStatus('Class service added successfully')
  }
}

const removeClassService = (serviceIndex) => {
  if (confirm('Are you sure you want to remove this class service?')) {
    settings.value.classServices.splice(serviceIndex, 1)
    showStatus('Class service removed successfully')
  }
}

// Gmail API status check
const checkGmailApiStatusHandler = async () => {
  loading.value = true
  try {
    const status = await checkGmailApiStatus()
    if (status.enabled) {
      showStatus('Gmail API is enabled and ready to use!')
    } else {
      showStatus(`Gmail API status: Workspace: ${status.isWorkspace ? 'Yes' : 'No'}, Internal OAuth: ${status.isInternalOAuth ? 'Yes' : 'No'}`, true)
    }
  } catch (error) {
    showStatus('Failed to check Gmail API status: ' + error.message, true)
  } finally {
    loading.value = false
  }
}

// Initialize on mount
onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.app-settings-panel {
  max-width: 700px;
  margin: 2rem auto;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  padding: 2rem;
}
.settings-section {
  margin-bottom: 2rem;
}
.grades-checkboxes, .class-services-defaults, .related-services-defaults {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
.class-services-subcats {
  margin: 1rem 0 0 0;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}
.class-services-custom, .related-services-custom {
  margin-top: 1rem;
}
.custom-provider-inputs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.custom-provider-inputs input {
  flex: 1;
  min-width: 150px;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.custom-chips {
  margin-top: 0.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.chip {
  background: #e3f2fd;
  border-radius: 16px;
  padding: 0.25rem 0.75rem;
  display: flex;
  align-items: center;
  font-size: 14px;
}
.chip button {
  background: none;
  border: none;
  color: #1976d2;
  font-size: 16px;
  margin-left: 0.5rem;
  cursor: pointer;
}
button[type="submit"] {
  background: #1976d2;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1.5rem;
  font-size: 16px;
  margin-right: 1rem;
  cursor: pointer;
}
button[type="button"] {
  background: #e0e0e0;
  color: #333;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1.5rem;
  font-size: 16px;
  margin-right: 1rem;
  cursor: pointer;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.not-admin {
  max-width: 500px;
  margin: 4rem auto;
  background: #fff3f3;
  border: 1px solid #f8d7da;
  border-radius: 10px;
  padding: 2rem;
  text-align: center;
  color: #b71c1c;
}
.error {
  color: #b71c1c;
  margin-left: 1rem;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.status-message {
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-weight: 500;
  margin-top: 1rem;
}

.status-message.success {
  background-color: #e8f5e8;
  color: #2e7d32;
  border: 1px solid #a5d6a7;
}

.status-message.error {
  background-color: #ffebee;
  color: #b71c1c;
  border: 1px solid #ef9a9a;
}
.related-services-defaults {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}
.related-services-defaults label {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5em;
  font-size: 1rem;
  padding: 0.25em 0.5em;
}
.periods-controls {
  margin-bottom: 1rem;
}
.period-number-control {
  flex: 1;
}
.period-labels {
  flex: 1;
}
.period-labels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}
.period-label-item {
  display: flex;
  flex-direction: column;
}
.period-label-item label {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-weight: 500;
}
.period-label-input {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}
.period-number-select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  width: 100px;
  background: white;
  cursor: pointer;
}
.period-preview {
  margin-top: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 4px;
}
.period-preview-item {
  display: inline-block;
  margin-right: 0.5rem;
  padding: 0.25rem 0.5rem;
  background: #e3f2fd;
  border-radius: 4px;
  font-family: monospace;
  font-weight: 500;
}

.service-providers-defaults {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.service-providers-defaults label {
  display: flex;
  flex-direction: row;
  gap: 5px;
  width: 100%;
  font-weight: 500;
}

.service-providers-custom {
  margin-top: 1rem;
}

/* Gmail API Settings */
.gmail-api-settings {
  padding: 1rem;
}

.gmail-api-status {
  margin-bottom: 1rem;
}

.status-indicators {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-sm);
}

.status-label {
  font-weight: 500;
}

.status-value {
  padding: 0.25rem 0.75rem;
  border-radius: var(--border-radius-pill);
  font-weight: 500;
}

.status-value.enabled {
  background: var(--success-color);
  color: white;
}

.status-value.disabled {
  background: var(--warning-color);
  color: white;
}

.gmail-api-status .status-message {
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-sm);
  padding: 1rem;
  margin: 1rem 0;
}

.gmail-api-status .status-message ul {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}

.gmail-api-status .last-check {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

.gmail-api-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}

.gmail-api-actions button {
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--border-radius-sm);
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.gmail-api-actions button:hover {
  background: var(--primary-hover);
}

.gmail-api-actions button:disabled {
  background: var(--bg-muted);
  cursor: not-allowed;
}
</style> 