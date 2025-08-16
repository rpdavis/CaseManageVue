<template>
  <fieldset>
    <legend>Flags</legend>
    
    <!-- System Flags -->
    <div class="flags-section">
      <h4>System Flags</h4>
      <div class="flags-container">
        <label class="checkbox-label">
          <input type="checkbox" v-model="form.flag1" />
          Preferential seating
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="form.flag2" />
          Separate setting
        </label>
      </div>
    </div>

    <!-- Custom Flags -->
    <div class="flags-section">
      <h4>Custom Flags</h4>
      
      <!-- Add New Flag -->
      <div class="new-flag">
        <input
          v-model="newFlag.text"
          :maxlength="50"
          placeholder="Enter flag note (max 50 chars)"
          class="flag-input"
        />
        <div class="flag-colors">
          <label class="color-option">
            <input type="radio" value="blue" v-model="newFlag.color" />
            <span class="color-dot blue"></span>
            Info
          </label>
          <label class="color-option">
            <input type="radio" value="yellow" v-model="newFlag.color" />
            <span class="color-dot yellow"></span>
            Caution
          </label>
          <label class="color-option">
            <input type="radio" value="red" v-model="newFlag.color" />
            <span class="color-dot red"></span>
            Alert
          </label>
        </div>
        <button type="button" @click="addCustomFlag" :disabled="!canAddFlag" class="add-flag-btn">
          Add Flag
        </button>
      </div>

      <!-- Current Custom Flags -->
      <ul class="current-flags" v-if="customFlags.length">
        <li v-for="(flag, index) in customFlags" :key="index" :class="flag.color" class="flag-item">
          <span class="color-dot" :class="flag.color"></span>
          <span class="flag-text">{{ flag.text }}</span>
          <button type="button" class="remove-flag" @click="removeCustomFlag(index)" title="Remove flag">×</button>
        </li>
      </ul>
      
      <div v-if="!customFlags.length" class="no-flags">
        No custom flags added yet
      </div>
    </div>
  </fieldset>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { getAuth } from 'firebase/auth'

// Props
const props = defineProps({
  form: { type: Object, required: true }
})

// Initialize custom flags if not present
if (!props.form.app) {
  props.form.app = {}
}
if (!props.form.app.flags) {
  props.form.app.flags = {}
}
if (!props.form.app.flags.customFlags) {
  props.form.app.flags.customFlags = []
}

// Custom flags management
const customFlags = computed({
  get: () => props.form.app?.flags?.customFlags || [],
  set: (value) => {
    if (!props.form.app) props.form.app = {}
    if (!props.form.app.flags) props.form.app.flags = {}
    props.form.app.flags.customFlags = value
  }
})

// New flag state
const newFlag = reactive({
  text: '',
  color: 'red' // Default to red (alert)
})

// Computed properties
const canAddFlag = computed(() => {
  return newFlag.text.trim().length > 0 && newFlag.text.length <= 50
})

// Methods
const addCustomFlag = () => {
  if (!canAddFlag.value) return
  
  const auth = getAuth()
  const flagToAdd = {
    color: newFlag.color,
    text: newFlag.text.trim(),
    createdAt: new Date().toISOString(),
    createdBy: auth.currentUser?.uid || 'system'
  }
  
  customFlags.value = [...customFlags.value, flagToAdd]
  
  // Reset form
  newFlag.text = ''
  newFlag.color = 'red'
}

const removeCustomFlag = (index) => {
  const updatedFlags = [...customFlags.value]
  updatedFlags.splice(index, 1)
  customFlags.value = updatedFlags
}
</script>

<style scoped>
/* Section styling */
.flags-section {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e0e0e0;
}

.flags-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.flags-section h4 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 14px;
  font-weight: 600;
}

/* System flags */
.flags-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  cursor: pointer;
}

/* Custom flags */
.new-flag {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.flag-input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.flag-input:focus {
  outline: none;
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.1);
}

.flag-colors {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.color-option {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 13px;
}

.color-option input[type="radio"] {
  margin: 0;
}

.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
  border: 1px solid rgba(0,0,0,0.1);
}

.color-dot.blue {
  background: #1976d2;
}

.color-dot.yellow {
  background: #f57f17;
}

.color-dot.red {
  background: #d32f2f;
}

.add-flag-btn {
  padding: 6px 12px;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  align-self: flex-start;
}

.add-flag-btn:hover:not(:disabled) {
  background: #1565c0;
}

.add-flag-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* Current flags list */
.current-flags {
  list-style: none;
  padding: 0;
  margin: 10px 0 0 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.flag-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 13px;
}

.flag-item.blue {
  background: #e3f2fd;
  color: #1565c0;
  border: 1px solid #bbdefb;
}

.flag-item.yellow {
  background: #fff8e1;
  color: #f57f17;
  border: 1px solid #ffecb3;
}

.flag-item.red {
  background: #ffebee;
  color: #d32f2f;
  border: 1px solid #ffcdd2;
}

.flag-text {
  flex: 1;
  word-break: break-word;
}

.remove-flag {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 16px;
  line-height: 1;
  opacity: 0.7;
}

.remove-flag:hover {
  opacity: 1;
  background: rgba(0,0,0,0.1);
}

.no-flags {
  color: #666;
  font-style: italic;
  font-size: 13px;
  padding: 10px 0;
}
</style> 