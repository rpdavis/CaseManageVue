<template>
  <div class="seis-import">
    <h3>Upload SEIS CSV</h3>
    <input type="file" ref="fileInput" accept=".csv" @change="handleFileSelect" />
    <button @click="previewFile" :disabled="!selectedFile">Preview</button>

    <div v-if="fieldOptions.length > 0" id="seis-field-options">
      <h4>Select fields to import:</h4>
      <label v-for="field in fieldOptions" :key="field">
        <input 
          type="checkbox" 
          :value="field" 
          v-model="selectedFields"
          checked 
        /> {{ field }}
      </label>
    </div>

    <div v-if="previewData.length > 0" id="seis-preview-container" style="margin-top:1rem;">
      <table border="1" cellpadding="4">
        <thead>
          <tr>
            <th v-for="field in fieldOptions" :key="field">{{ field }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in previewData" :key="index">
            <td v-for="field in fieldOptions" :key="field">{{ row[field] || '' }}</td>
          </tr>
        </tbody>
      </table>
      <p>Showing first {{ previewData.length }} of {{ parsedData.length }} rows.</p>
    </div>

    <button @click="importData" :disabled="!canImport">Import to Firestore</button>
    <p :class="['status-msg', { error: isError }]">{{ statusMessage }}</p>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { parseSeisCSVAndPreview, importFilteredSeisRecords } from '../composables/useImporters.js'
import { 
  validateFile, 
  checkSecurityThreats, 
  sanitizeString,
  checkRateLimit
} from '@/utils/validation.js'

export default {
  name: 'SeisImport',
  setup() {
    const fileInput = ref(null)
    const selectedFile = ref(null)
    const parsedData = ref([])
    const fieldOptions = ref([])
    const selectedFields = ref([])
    const previewData = ref([])
    const statusMessage = ref('')
    const isError = ref(false)

    const canImport = computed(() => {
      return parsedData.value.length > 0 && selectedFields.value.length > 0
    })

    const showStatus = (message, error = false) => {
      statusMessage.value = message
      isError.value = error
      setTimeout(() => {
        statusMessage.value = ''
        isError.value = false
      }, 5000)
    }

    const handleFileSelect = (event) => {
      const file = event.target.files[0]
      
      if (file) {
        // Validate file with security checks
        const fileValidation = validateFile(file, {
          allowedTypes: ['csv'],
          maxSize: 10 * 1024 * 1024, // 10MB
          fieldName: 'SEIS Import File'
        })

        if (!fileValidation.isValid) {
          showStatus(fileValidation.error, true)
          event.target.value = '' // Clear the file input
          return
        }

        // Check filename for security threats
        const securityCheck = checkSecurityThreats(file.name)
        if (!securityCheck.isSafe) {
          showStatus(`File name contains potentially dangerous content: ${securityCheck.threats.join(', ')}`, true)
          event.target.value = '' // Clear the file input
          return
        }

        selectedFile.value = file
      }
    }

    const previewFile = async () => {
      const file = selectedFile.value
      if (!file) {
        showStatus('❌ Please select a CSV file.', true)
        return
      }

      // Rate limiting for preview operations
      const rateCheck = checkRateLimit('seisPreview', 5, 300000) // 5 previews per 5 minutes
      if (!rateCheck.allowed) {
        showStatus('Too many preview requests. Please wait before previewing again.', true)
        return
      }

      showStatus('Parsing file...')
      previewData.value = []
      fieldOptions.value = []
      selectedFields.value = []

      try {
        const rawData = await parseSeisCSVAndPreview(file)
        
        // Sanitize the parsed data
        const sanitizedData = rawData.map(row => {
          const sanitizedRow = {}
          Object.entries(row).forEach(([key, value]) => {
            // Sanitize field names and values
            const sanitizedKey = sanitizeString(key, {
              trim: true,
              maxLength: 100,
              removeDangerous: true
            })
            
            let sanitizedValue = value
            if (typeof value === 'string') {
              sanitizedValue = sanitizeString(value, {
                trim: true,
                maxLength: 500,
                removeDangerous: true
              })
              
              // Security check for values
              const valueSecurityCheck = checkSecurityThreats(sanitizedValue)
              if (!valueSecurityCheck.isSafe) {
                console.warn(`Security threat detected in SEIS data: ${valueSecurityCheck.threats.join(', ')}`)
                sanitizedValue = '' // Clear potentially dangerous values
              }
            }
            
            sanitizedRow[sanitizedKey] = sanitizedValue
          })
          return sanitizedRow
        })

        parsedData.value = sanitizedData
        showStatus(`✅ Loaded ${parsedData.value.length} rows.`)

        // Field selector with sanitized field names
        const fields = Object.keys(parsedData.value[0] || {}).filter(field => field.length > 0)
        fieldOptions.value = fields
        selectedFields.value = [...fields] // Select all by default

        // Preview table (first 5 rows)
        previewData.value = parsedData.value.slice(0, 5)
      } catch (err) {
        showStatus(`❌ Error: ${err.message}`, true)
        console.error('SEIS Parse Error:', err)
      }
    }

    const importData = async () => {
      if (!canImport.value) {
        showStatus('❌ Cannot import: No data or fields selected.', true)
        return
      }

      // Rate limiting for import operations
      const rateCheck = checkRateLimit('seisImport', 2, 600000) // 2 imports per 10 minutes
      if (!rateCheck.allowed) {
        showStatus('Too many import requests. Please wait before importing again.', true)
        return
      }

      if (!confirm(`Import ${parsedData.value.length} SEIS records? This will update existing students with matching SSIDs.`)) {
        return
      }

      showStatus('Importing data...')

      try {
        // Filter data to only include selected fields
        const filteredData = parsedData.value.map(row => {
          const filtered = {}
          selectedFields.value.forEach(field => {
            if (row[field] !== undefined) {
              filtered[field] = row[field]
            }
          })
          return filtered
        })

        // Additional validation before import
        const validRecords = filteredData.filter(record => {
          // Basic validation - ensure we have some essential data
          const hasEssentialData = Object.values(record).some(value => 
            value && typeof value === 'string' && value.trim().length > 0
          )
          return hasEssentialData
        })

        if (validRecords.length === 0) {
          showStatus('❌ No valid records found to import.', true)
          return
        }

        if (validRecords.length !== filteredData.length) {
          const skipped = filteredData.length - validRecords.length
          showStatus(`⚠️ Skipping ${skipped} invalid records. Importing ${validRecords.length} valid records.`)
        }

        await importFilteredSeisRecords(validRecords, selectedFields.value)
        showStatus(`✅ Successfully imported ${validRecords.length} SEIS records.`)

        // Clear the form
        selectedFile.value = null
        parsedData.value = []
        fieldOptions.value = []
        selectedFields.value = []
        previewData.value = []
        if (fileInput.value) {
          fileInput.value.value = ''
        }

      } catch (err) {
        showStatus(`❌ Import failed: ${err.message}`, true)
        console.error('SEIS Import Error:', err)
      }
    }

    return {
      fileInput,
      selectedFile,
      parsedData,
      fieldOptions,
      selectedFields,
      previewData,
      statusMessage,
      isError,
      canImport,
      handleFileSelect,
      previewFile,
      importData
    }
  }
}
</script>

<style scoped>
/* Component styles included in main.css */
</style> 