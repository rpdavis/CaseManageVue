<template>
  <div class="assignment-dialog-overlay" @click.self="$emit('close')">
    <div class="assignment-dialog-modal">
      <h2>Add Assignment</h2>
      <form @submit.prevent="handleSave">
        <div class="form-row">
          <label>Type:</label>
          <select v-model="type">
            <option value="lunch">Lunch</option>
            <option value="break">Break</option>
            <option value="class">Class</option>
            <option value="student">Student</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div class="form-row" v-if="type === 'class'">
          <label>Teacher:</label>
          <select v-model="teacherId">
            <option value="">Select teacher...</option>
            <option v-for="t in sortedTeachers" :key="t.id" :value="t.id">{{ t.name || t.email || t.id }}</option>
          </select>
        </div>
        <div class="form-row" v-if="type === 'student'">
          <label>Student:</label>
          <select v-model="studentId">
            <option value="">Select student...</option>
            <option v-for="s in students" :key="s.id" :value="s.id">{{ s.firstName }} {{ s.lastName }}</option>
          </select>
        </div>
        <div class="form-row" v-if="type === 'other'">
          <label>Label:</label>
          <input v-model="customLabel" placeholder="Custom label" />
        </div>
        <div class="form-row">
          <label>Start Time:</label>
          <input v-model="start" type="time" required />
        </div>
        <div class="form-row">
          <label>End Time:</label>
          <input v-model="end" type="time" required />
        </div>
        <div class="form-row">
          <label>Note:</label>
          <input v-model="note" placeholder="Optional note" />
        </div>
        <div class="dialog-actions">
          <button type="submit" class="btn btn-primary">Add</button>
          <button type="button" class="btn btn-secondary" @click="$emit('close')">Cancel</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
const props = defineProps({
  teachers: Array,
  students: Array,
  assignment: Object
})
const emit = defineEmits(['save', 'close'])

const type = ref('lunch')
const teacherId = ref('')
const studentId = ref('')
const customLabel = ref('')
const start = ref('12:00')
const end = ref('12:30')
const note = ref('')
const id = ref('')
const blockId = ref('')

watch(() => props.assignment, (val) => {
  if (val) {
    id.value = val.id || Date.now().toString()
    blockId.value = val.blockId || id.value || `block-${Date.now()}`
    type.value = val.type || 'lunch'
    teacherId.value = val.teacherId || ''
    studentId.value = val.studentId || ''
    customLabel.value = val.type === 'other' ? val.label : ''
    start.value = val.start || '12:00'
    end.value = val.end || '12:30'
    note.value = val.note || ''
  } else {
    id.value = Date.now().toString()
    blockId.value = `block-${id.value}`
    type.value = 'lunch'
    teacherId.value = ''
    studentId.value = ''
    customLabel.value = ''
    start.value = '12:00'
    end.value = '12:30'
    note.value = ''
  }
}, { immediate: true })

const sortedTeachers = computed(() => {
  const teachers = props.teachers || []
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

const label = computed(() => {
  if (type.value === 'lunch') return 'Lunch'
  if (type.value === 'break') return 'Break'
  if (type.value === 'class') {
    const t = props.teachers.find(t => t.id === teacherId.value)
    return t ? t.name || t.email || t.id : ''
  }
  if (type.value === 'student') {
    const s = props.students.find(s => s.id === studentId.value)
    return s ? `${s.firstName} ${s.lastName}` : ''
  }
  if (type.value === 'other') return customLabel.value
  return ''
})

function handleSave() {
  if (!start.value || !end.value) return
  if (type.value === 'class' && !teacherId.value) return
  if (type.value === 'student' && !studentId.value) return
  if (type.value === 'other' && !customLabel.value) return
  emit('save', {
    id: id.value,
    blockId: blockId.value,
    type: type.value,
    label: label.value,
    start: start.value,
    end: end.value,
    note: note.value,
    teacherId: teacherId.value,
    studentId: studentId.value
  })
}
</script>

<style scoped>
.assignment-dialog-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.25);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.assignment-dialog-modal {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 32px rgba(42,121,201,0.18);
  padding: 32px 28px 24px 28px;
  min-width: 340px;
  max-width: 95vw;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}
.form-row {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  gap: 12px;
}
.form-row label {
  min-width: 90px;
  font-weight: 500;
}
input, select {
  font-size: 1em;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #b3c6e0;
}
.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 18px;
}
.btn.btn-primary {
  background: #2a79c9;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 18px;
  font-size: 1em;
  cursor: pointer;
}
.btn.btn-secondary {
  background: #e0e0e0;
  color: #333;
  border: none;
  border-radius: 6px;
  padding: 8px 18px;
  font-size: 1em;
  cursor: pointer;
}
.btn.btn-primary:hover {
  background: #1a4e8a;
}
.btn.btn-secondary:hover {
  background: #b3c6e0;
}
</style> 