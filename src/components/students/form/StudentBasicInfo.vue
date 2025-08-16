<template>
  <fieldset class="form-col">
    <legend>Student Info</legend>
    <div class="inner-grid-3">
      <!-- SSID Field (only for new students) -->
      <label v-if="mode === 'new'" class="ssid-field">
        <span class="field-label">SSID (State Student ID) *</span>
        <input 
          v-model="form.ssid" 
          type="text" 
          required 
          placeholder="Enter student SSID" 
          class="ssid-input"
        />
        <div class="field-help">
          <strong>Required:</strong> This can be found in your Student Information System (SIS) such as Aeries, or in SEIS. 
          The SSID is used to link student data across different systems.
        </div>
      </label>

      <!-- Basic Info Fields -->
      <label>
        First Name:
        <input v-model="form.firstName" type="text" required />
      </label>
      
      <label>
        Last Name:
        <input v-model="form.lastName" type="text" required />
      </label>
      
      <label>
        Grade:
        <select v-model="form.grade">
          <option v-for="grade in gradeOptions" :key="grade" :value="grade">
            {{ grade }}
          </option>
        </select>
      </label>
      
      <label>
        Plan Type:
        <select v-model="form.plan">
          <option value="IEP">IEP</option>
          <option value="504">504</option>
        </select>
      </label>
      
      <!-- Important Dates -->
      <label>
        Review Date:
        <input v-model="form.reviewDate" type="date" />
      </label>
      
      <label>
        Reevaluation Date:
        <input v-model="form.reevalDate" type="date" />
      </label>
      
      <label>
        Meeting Date:
        <input v-model="form.meetingDate" type="date" />
      </label>
      
      <!-- Case Manager Selection -->
      <label>
        Case Manager:
        <select v-model="form.caseManagerId">
          <option value="">-- Select Case Manager --</option>
          <option v-for="cm in sortedCaseManagers" :key="cm.id" :value="cm.id">
            {{ cm.name || cm.email || cm.id }}
          </option>
        </select>
      </label>
    </div>
  </fieldset>
</template>

<script setup>
import { computed } from 'vue'

// Props
const props = defineProps({
  form: { type: Object, required: true },
  mode: { type: String, default: 'new' },
  gradeOptions: { type: Array, required: true },
  userRoles: { type: Object, required: true }
})

// Sorted case managers for dropdown (by last name)
const sortedCaseManagers = computed(() => {
  const caseManagers = props.userRoles.caseManagers || []
  return caseManagers.sort((a, b) => {
    // Extract last names for sorting
    const getLastName = (user) => {
      const fullName = user.name || user.email || user.id
      const nameParts = fullName.split(' ')
      return nameParts.length > 1 ? nameParts[nameParts.length - 1] : fullName
    }
    return getLastName(a).localeCompare(getLastName(b))
  })
})
</script>

<style scoped>
.ssid-field {
  grid-column: span 3;
  margin-bottom: 20px;
}

.field-label {
  font-weight: 600;
  color: #d32f2f;
  display: block;
  margin-bottom: 8px;
}

.ssid-input {
  border: 2px solid #d32f2f;
  background-color: #fff3f3;
}

.ssid-input:focus {
  border-color: #1976d2;
  background-color: #fff;
}

.field-help {
  font-size: 12px;
  color: #666;
  margin-top: 6px;
  padding: 8px;
  background-color: #f5f5f5;
  border-radius: 4px;
  border-left: 3px solid #1976d2;
}
</style> 