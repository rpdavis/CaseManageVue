<template>
  <td class="instruction-cell" :class="{ 'with-flag': getFlagValue(student, flagType) }">
    <div v-if="getFlagValue(student, flagType)" class="flag-overlay" :class="flagClass">
      {{ flagText }}
    </div>
    <div v-if="getDisplayValue(student, fieldName)" class="pill-list">
      <div v-html="formatListFromText(getDisplayValue(student, fieldName))"></div>
    </div>
    <div v-else>—</div>
  </td>
</template>

<script setup>
import { getDisplayValue } from '@/utils/studentUtils'

const props = defineProps({
  student: {
    type: Object,
    required: true
  },
  fieldName: {
    type: String,
    required: true
  },
  flagType: {
    type: String,
    required: true
  },
  flagText: {
    type: String,
    required: true
  },
  flagClass: {
    type: String,
    required: true
  },
  // Functions from parent composable
  getFlagValue: {
    type: Function,
    required: true
  },
  formatListFromText: {
    type: Function,
    required: true
  }
})
</script> 