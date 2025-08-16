<template>
  <label>{{ label }}:
    <select :id="id" :value="modelValue" @change="$emit('update:modelValue', $event.target.value)">
      <option value="">--</option>
      <option v-for="p in sortedList" :key="p.id" :value="p.id">
        {{ p.name }}
      </option>
    </select>
  </label>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps(['id', 'label', 'list', 'modelValue'])
defineEmits(['update:modelValue'])

// Sorted list for dropdown (by last name)
const sortedList = computed(() => {
  const list = props.list || []
  return list.sort((a, b) => {
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