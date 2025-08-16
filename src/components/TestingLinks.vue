<template>
  <div class="testing-links-container">
    <h3>Testing Links & Google Sheets Integration</h3>
    
    <!-- Google Sheets Integration Section -->
    <GoogleSheetsConnector
      :linked-sheet-id="linkedSheetId"
      :last-sync-time="lastSyncTime"
      :sync-status="syncStatus"
      :sync-message="syncMessage"
      @open-google-sheet="openGoogleSheet"
      @sync-now="syncNow"
      @unlink-sheet="unlinkSheet"
      @create-linked-google-sheet="createLinkedGoogleSheet"
      @create-google-sheet-with-data="createGoogleSheetWithData"
      @create-blank-google-sheet="createBlankGoogleSheet"
      @export-to-csv="exportToCSV"
    />
    
    <!-- Custom Tabs Section (only show if sheet is linked) -->
    <CustomTabManager
      v-if="linkedSheetId"
      :custom-tabs="customTabs"
      :show-add-tab-form="showAddTabForm"
      :new-tab-name="newTabName"
      :selected-teachers="selectedTeachers"
      :selected-excluded-periods="selectedExcludedPeriods"
      :max-custom-tabs="maxCustomTabs"
      :available-teachers="availableTeachers"
      :available-periods="availablePeriods"
      :filtered-students-preview="filteredStudentsPreview"
      :get-student-teacher-periods="getStudentTeacherPeriods"
      @toggle-add-tab-form="toggleAddTabForm"
      @update:new-tab-name="newTabName = $event"
      @update-selected-teachers="updateSelectedTeachers"
      @update-selected-excluded-periods="updateSelectedExcludedPeriods"
      @add-custom-tab="handleAddCustomTab"
      @remove-custom-tab="removeCustomTab"
      @reset-form="resetForm"
    />
    

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import useStudents from '@/composables/useStudents'
import useUsers from '@/composables/useUsers'
import { useAppSettings } from '@/composables/useAppSettings'
import { useTestingData } from '@/composables/useTestingData'
import { useGoogleSheetsIntegration } from '@/composables/useGoogleSheetsIntegration'
import { useCustomTabs } from '@/composables/useCustomTabs'

// Components
import GoogleSheetsConnector from './testing/GoogleSheetsConnector.vue'
import CustomTabManager from './testing/CustomTabManager.vue'

// Composables
const { students, fetchStudents } = useStudents()
const { userList: users, fetchUsers } = useUsers()
const { appSettings, loadAppSettings } = useAppSettings()

// Initialize testing data composable
const testingData = useTestingData(students, users, appSettings)
const {
  availablePeriods,
  availableTeachers,
  getStudentsForTeachers,
  getStudentTeacherPeriods
} = testingData

// Initialize Google Sheets integration
const googleSheetsIntegration = useGoogleSheetsIntegration(students, users, testingData)
const {
  linkedSheetId,
  lastSyncTime,
  syncStatus,
  syncMessage,
  initializeIntegration,
  createLinkedGoogleSheet,
  syncNow,
  openGoogleSheet,
  unlinkSheet,
  createGoogleSheetWithData,
  createBlankGoogleSheet,
  exportToCSV,
  cleanupAutoSync
} = googleSheetsIntegration

// Initialize custom tabs
const customTabsLogic = useCustomTabs(testingData, googleSheetsIntegration)
const {
  customTabs,
  showAddTabForm,
  newTabName,
  selectedTeachers,
  selectedExcludedPeriods,
  maxCustomTabs,
  filteredStudentsPreview,
  addCustomTab,
  removeCustomTab,
  resetForm,
  toggleAddTabForm
} = customTabsLogic

// Handle teacher selection updates
const updateSelectedTeachers = (teacherId, isChecked) => {
  if (isChecked) {
    if (!selectedTeachers.value.includes(teacherId)) {
      selectedTeachers.value.push(teacherId)
    }
  } else {
    const index = selectedTeachers.value.indexOf(teacherId)
    if (index > -1) {
      selectedTeachers.value.splice(index, 1)
    }
  }
}

// Handle excluded periods updates
const updateSelectedExcludedPeriods = (periodValue, isChecked) => {
  if (isChecked) {
    if (!selectedExcludedPeriods.value.includes(periodValue)) {
      selectedExcludedPeriods.value.push(periodValue)
    }
  } else {
    const index = selectedExcludedPeriods.value.indexOf(periodValue)
    if (index > -1) {
      selectedExcludedPeriods.value.splice(index, 1)
    }
  }
}

// Handle add custom tab with users parameter
const handleAddCustomTab = async () => {
  await addCustomTab(users.value)
}

// Initialize on mount
onMounted(async () => {
  try {
    // Fetch students and users data first
    await Promise.all([
      fetchStudents(),
      fetchUsers(),
      loadAppSettings()
    ])
    console.log('Students loaded:', students.value.length)
    console.log('Users loaded:', users.value.length)
    console.log('App settings loaded:', appSettings.value)
    
    // Initialize Google Sheets integration
    await initializeIntegration()
  } catch (error) {
    console.error('Failed to initialize TestingLinks:', error)
  }
})

// Cleanup on unmount
onUnmounted(() => {
  cleanupAutoSync()
})
</script>

<style scoped>
.testing-links-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.testing-links-container h3 {
  margin-bottom: 2rem;
  color: #333;
  font-size: 1.5rem;
}
</style> 