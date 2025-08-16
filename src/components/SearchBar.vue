<template>
  <div class="admin-form-row">
    <input 
      type="text" 
      v-model="searchTerm" 
      :placeholder="placeholder"
    />
    <select v-model="searchType" @change="handleSearch">
      <option v-for="type in types" :key="type" :value="type">
        {{ type.charAt(0).toUpperCase() + type.slice(1) }}
      </option>
    </select>
    <button 
      v-if="showDeleteAll" 
      @click="handleDeleteAll" 
      id="delete-all"
    >
      Delete All
    </button>
  </div>
</template>

<script>
import { ref, watch } from 'vue'
import { sanitizeString, checkSecurityThreats, checkRateLimit } from '@/utils/validation.js'

export default {
  name: 'SearchBar',
  props: {
    placeholder: {
      type: String,
      default: 'Search...'
    },
    types: {
      type: Array,
      default: () => ['name', 'email']
    },
    showDeleteAll: {
      type: Boolean,
      default: false
    }
  },
  emits: ['search', 'delete-all', 'security-threat'],
  setup(props, { emit }) {
    const searchTerm = ref('')
    const searchType = ref(props.types[0])

    const handleSearch = () => {
      // Rate limiting for search queries
      const rateCheck = checkRateLimit('search', 10, 60000) // 10 searches per minute
      if (!rateCheck.allowed) {
        emit('security-threat', 'Too many search requests. Please wait before searching again.')
        return
      }

      // Sanitize search term
      const sanitizedTerm = sanitizeString(searchTerm.value, {
        trim: true,
        maxLength: 100,
        removeDangerous: true
      })

      // Security threat detection
      const securityCheck = checkSecurityThreats(sanitizedTerm)
      if (!securityCheck.isSafe) {
        emit('security-threat', `Security threat detected in search: ${securityCheck.threats.join(', ')}`)
        searchTerm.value = sanitizedTerm // Apply sanitized version
        return
      }

      // Apply sanitized term back to the input
      if (sanitizedTerm !== searchTerm.value) {
        searchTerm.value = sanitizedTerm
      }

      emit('search', searchType.value, sanitizedTerm)
    }

    const handleDeleteAll = () => {
      // Rate limiting for delete all operations
      const rateCheck = checkRateLimit('deleteAll', 1, 300000) // 1 delete all per 5 minutes
      if (!rateCheck.allowed) {
        emit('security-threat', 'Delete all operation rate limited. Please wait before trying again.')
        return
      }

      emit('delete-all')
    }

    // Debounce search with validation
    let searchTimeout
    watch(searchTerm, (newValue) => {
      clearTimeout(searchTimeout)
      
      // Basic length check
      if (newValue.length > 100) {
        searchTerm.value = newValue.substring(0, 100)
        emit('security-threat', 'Search term too long. Truncated to 100 characters.')
        return
      }

      searchTimeout = setTimeout(handleSearch, 300)
    })

    return {
      searchTerm,
      searchType,
      handleSearch,
      handleDeleteAll
    }
  }
}
</script>

<style scoped>
/* Component styles included in main.css */
</style>
