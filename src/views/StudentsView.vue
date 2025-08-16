// /Users/rd/CaseManageVue/src/views/StudentsView.vue

<template>
  <div class="students-view">
    <!-- Navigation Menu -->
    <StudentNavMenu
      :current-user="currentUser"
      :is-admin="isAdmin"
      @action="handleNavAction"
    />
    
    <!-- Page Header with Search -->
    <div class="page-header">
      <div class="header-left">
        <h1>Student Management</h1>
        <div class="search-container">
          <input 
            type="text" 
            v-model="currentFilters.search" 
            @input="debouncedApplyFilters"
            placeholder="Search students..."
            class="search-input"
          >
        </div>
      </div>
      <div class="header-controls">
        <!-- Sort By Dropdown -->
        <div class="filter-group sort-group">
          <ArrowDownWideNarrow :size="16" class="sort-icon" />
          <select v-model="currentFilters.sortBy" @change="applyFilters()" class="sort-select">
            <option value="firstName">First Names</option>
            <option value="lastName">Last Name</option>
            <option value="grade">Grade</option>
            <option value="reviewDate">Plan Review Date</option>
            <option value="reevalDate">Re-evaluation Date</option>
            <option value="meetingDate">Meeting Date</option>
          </select>
        </div>

        <!-- Provider View (based on role-specific options) -->
        <div v-if="providerViewOptions && providerViewOptions.length" class="filter-group">
          <div class="radio-group">
            <label
              v-for="option in providerViewOptions"
              :key="option.value"
              class="radio-btn icon-btn"
              :class="{ active: currentFilters.providerView === option.value }"
              :title="getProviderTooltip(option.value)"
            >
              <input
                type="radio"
                v-model="currentFilters.providerView"
                :value="option.value"
                @change="applyFilters"
              >
              <Users v-if="option.value === 'all_iep'" :size="16" />
              <User v-else-if="option.value === 'case_manager'" :size="16" />
              <Presentation v-else-if="option.value === 'service_provider' || option.value === 'teacher'" :size="16" />
              <Globe v-else-if="option.value === 'all' || option.value === 'iep_504_all'" :size="16" />
            </label>
          </div>
        </div>

        <!-- View Mode -->
        <div class="filter-group">
          <div class="radio-group">
            <label class="radio-btn icon-btn" :class="{ active: currentFilters.viewMode === 'list' }" title="List view">
              <input type="radio" :value="'list'" :checked="currentFilters.viewMode === 'list'" @change="setViewMode('list')">
              <List :size="16" />
            </label>
            <label class="radio-btn icon-btn" :class="{ active: currentFilters.viewMode === 'class', disabled: isClassViewDisabled }" title="Class-period view">
              <input 
                type="radio" 
                :value="'class'"
                :checked="currentFilters.viewMode === 'class'"
                @change="setViewMode('class')"
                :disabled="isClassViewDisabled"
              >
              <Columns :size="16" :class="{ 'strikethrough': isClassViewDisabled }" />
              <span v-if="isClassViewDisabled" class="disabled-icon">🚫</span>
            </label>
            <label v-if="canAccessTesting" class="radio-btn icon-btn" :class="{ active: currentFilters.viewMode === 'testing' }" title="Separate Setting For Testing">
              <input type="radio" :value="'testing'" :checked="currentFilters.viewMode === 'testing'" @change="setViewMode('testing')">
              <ClipboardList :size="16" />
            </label>

          </div>
        </div>

        <!-- Filter Toggle Button -->
        <button 
          v-if="canAccessFilters" 
          @click="toggleFilters" 
          class="radio-btn icon-btn filter-toggle-btn" 
          :class="{ active: showFilters }"
          title="Toggle filters"
        >
          <Filter :size="16" />
        </button>
      </div>
    </div>

    <!-- Selected Radio Button Display -->
    <div v-if="selectedRadioText" class="selected-radio-display">
      {{ selectedRadioText }}
    </div>

    <!-- Hidden Filters Panel -->
    <div v-if="showFilters" class="filters-panel">
      <div class="filters-content">
        <!-- Case Manager Filter -->
        <div class="filter-group">
          <label>Case Manager</label>
          <select v-model="currentFilters.cm" @change="applyFilters()" class="filter-select">
            <option value="all">All Case Managers</option>
            <option v-for="cm in caseManagersWithCounts" :key="cm.id" :value="cm.id">
              {{ cm.displayName || cm.name || cm.email || cm.id }}
            </option>
          </select>
        </div>

        <!-- Teacher Filter -->
        <div class="filter-group">
          <label>Teacher</label>
          <select v-model="currentFilters.teacher" @change="applyFilters()" class="filter-select">
            <option value="all">All Teachers</option>
            <option v-for="t in teacherList" :key="t.id" :value="t.id">
              {{ t.name || t.email || t.id }}
            </option>
          </select>
        </div>

        <!-- Paraeducator Filter -->
        <div class="filter-group">
          <label>Paraeducator</label>
          <select v-model="currentFilters.paraeducator" @change="applyFilters()" class="filter-select">
            <option value="all">All Paraeducators</option>
            <option v-for="p in paraeducators" :key="p.id" :value="p.id">
              {{ p.name || p.email || p.id }}
            </option>
          </select>
        </div>

        <!-- Plan Filter -->
        <div class="filter-group">
          <label>Plan Type</label>
          <select v-model="currentFilters.plan" @change="applyFilters()" class="filter-select">
            <option value="all">All Plans</option>
            <option value="IEP">IEP</option>
            <option value="504">504</option>
          </select>
        </div>

        <!-- Service Provider Filter -->
        <div class="filter-group">
          <label>Service Provider</label>
          <select v-model="currentFilters.serviceProvider" @change="applyFilters()" class="filter-select">
            <option value="all">All Service Providers</option>
            <option v-for="sp in serviceProviders" :key="sp.id" :value="sp.id">
              {{ sp.name || sp.email || sp.id }}
            </option>
          </select>
        </div>
      </div>
    </div>
    
    <div class="content">
      <!-- Print-only user name -->
      <div class="print-user-name">
        {{ authStore.currentUser?.name || authStore.currentUser?.email || authStore.currentUser?.displayName || currentUser?.name || currentUser?.email || 'System User' }}
      </div>
      
      <!-- List View -->
      <div v-if="currentViewMode === 'list'">
        <StudentTable
          :students="visibleStudents"
          :user-map="userMapObj"
          :current-user="currentUser"
          :student-data="studentData"
          :can-edit-all="canEditAllStudents"
          :can-edit-own="canEditOwnStudents"
          :can-view-all="canViewAllStudents"
          :can-access-testing="canAccessTesting"
          :can-access-testing-partial="canAccessTestingPartial"
          :aide-schedule="currentUser?.role === 'paraeducator' ? aideAssignment : {}"
          @edit="editStudent"
          @email="emailStudent"
          @teacher-feedback="handleTeacherFeedback"
        />
      </div>
      
      <!-- By Class View -->
      <div v-else-if="currentViewMode === 'class'" class="view-container">
        <!-- Direct Assignment Section -->
        <div v-if="directAssignmentStudents.length > 0" class="group-section">
          <h3 class="group-header direct-assignment-header">Direct Assignment</h3>
          <StudentTable
            :students="directAssignmentStudents"
            :user-map="userMapObj"
            :current-user="currentUser"
            :student-data="studentData"
            :can-edit-all="canEditAllStudents"
            :can-edit-own="canEditOwnStudents"
            :can-view-all="canViewAllStudents"
            :can-access-testing="canAccessTesting"
            :can-access-testing-partial="canAccessTestingPartial"
            :aide-schedule="currentUser?.role === 'paraeducator' ? aideAssignment : {}"
            @edit="editStudent"
            @email="emailStudent"
            @teacher-feedback="handleTeacherFeedback"
          />
        </div>
        
        <!-- Class Period Sections -->
        <div v-for="(students, period) in studentsByClass" :key="period" class="group-section">
          <h3 class="group-header">Period {{ period }}</h3>
          <StudentTable
            :students="students"
            :user-map="userMapObj"
            :current-user="currentUser"
            :student-data="studentData"
            :can-edit-all="canEditAllStudents"
            :can-edit-own="canEditOwnStudents"
            :can-view-all="canViewAllStudents"
            :can-access-testing="canAccessTesting"
            :can-access-testing-partial="canAccessTestingPartial"
            :aide-schedule="currentUser?.role === 'paraeducator' ? aideAssignment : {}"
            @edit="editStudent"
            @email="emailStudent"
            @teacher-feedback="handleTeacherFeedback"
          />
        </div>
      </div>
      
      <!-- Testing View -->
      <div v-else-if="currentViewMode === 'testing'" class="view-section">
        <StudentTable
          :students="testingViewStudents"
          :user-map="userMapObj"
          :current-user="currentUser"
          :student-data="studentData"
          :can-edit-all="canEditAllStudents"
          :can-edit-own="canEditOwnStudents"
          :can-view-all="canViewAllStudents"
          :can-access-testing="canAccessTesting"
          :can-access-testing-partial="canAccessTestingPartial"
          :testing-view="true"
          :aide-schedule="currentUser?.role === 'paraeducator' ? aideAssignment : {}"
          @edit="editStudent"
          @email="emailStudent"
          @teacher-feedback="handleTeacherFeedback"
        />
      </div>
      


    </div>
    
    <!-- Dialogs -->
    <StudentEditDialog
      v-if="editingStudentId"
      :student-id="editingStudentId"
      :users="{ userRoles }"
      @close="editingStudentId = null"
      @saved="handleStudentSaved"
    />
    
    <StudentsEmailDialog
      v-if="emailingStudentId"
      :student="getStudentById(emailingStudentId)"
      :user-map="userMapObj"
      :current-user="currentUser"
      @close="emailingStudentId = null"
    />
    
    <ExportDialog
      v-if="showExport"
      :students="students"
      :user-map="userMapObj"
      @close="showExport = false"
    />
    
    <StudentForm
      v-if="showAddStudent"
      :users="{ userRoles }"
      @close="showAddStudent = false"
      @saved="handleStudentAdded"
    />
    
    <TeacherFeedbackDialog
      v-if="showFeedbackDialog"
      :student="getStudentById(feedbackStudentId)"
      :current-user="currentUser"
      :user-map="userMapObj"
      @close="showFeedbackDialog = false"
      @form-sent="handleFormSent"
    />
  </div>
</template>

<script setup>
// Vue imports
import { computed, ref, watch } from 'vue'

// Store
import { useAuthStore } from '@/store/authStore.js'

// Initialize auth store
const authStore = useAuthStore()

// Composables
import { useStudentData } from '@/composables/useStudentData.js'
import { useStudentFilters } from '@/composables/useStudentFilters.js'
import { useRoleBasedView } from '@/composables/roles/useRoleBasedView.js'
import { useStudentViews } from '@/composables/useStudentViews.js'
import { useStudentNavActions } from '@/composables/useStudentNavActions.js'
import { useStudentQueries } from '@/composables/useStudentQueries.js'

// Lucide Icons
import {
  List,
  Columns,
  ClipboardList,
  Globe,
  User,
  Users,
  Presentation,
  ArrowDownWideNarrow,
  Filter
} from 'lucide-vue-next'

// Components
import StudentNavMenu from '@/components/students/StudentNavMenu.vue'
import StudentTable from '@/components/students/StudentTable.vue'
import StudentEditDialog from '@/components/students/StudentEditDialog.vue'
import StudentsEmailDialog from '@/components/students/StudentsEmailDialog.vue'
import StudentForm from '@/components/students/StudentForm.vue'
import ExportDialog from '@/components/ExportDialog.vue'
import TeacherFeedbackDialog from '@/components/students/TeacherFeedbackDialog.vue'

// Initialize composables
const studentData = useStudentData()
const filterData = useStudentFilters(studentData)
  const roleView = useRoleBasedView(studentData, filterData)

// Debug: Watch for paraeducator visible students changes
console.log('🔍 STUDENTS VIEW DEBUG: Setting up watcher, currentRole:', roleView.currentRole?.value)
watch(() => roleView.currentRole?.value, (newRole) => {
  console.log('🔍 STUDENTS VIEW DEBUG: Role changed to:', newRole)
  if (newRole === 'paraeducator') {
    console.log('🔍 STUDENTS VIEW DEBUG: Paraeducator role detected, setting up visibleStudents watcher')
    watch(() => roleView.visibleStudents?.value, (newStudents) => {
      console.log('🔍 STUDENTS VIEW: Paraeducator visibleStudents changed:', {
        count: newStudents?.length || 0,
        studentNames: newStudents?.map(s => 
          `${s.app?.studentData?.firstName || 'Unknown'} ${s.app?.studentData?.lastName || 'Unknown'}`
        ) || []
      })
    }, { immediate: true })
  }
}, { immediate: true })
const navActions = useStudentNavActions(studentData)

// Extract data from composables
const {
  // Data
  students,
  userMapObj,
  caseManagers,
  caseManagersWithCounts,
  teacherList,
  userRoles,
  aideAssignment,
  paraeducators,
  serviceProviders,
  // Computed
  currentUser,
  isAdmin,
  showProviderView,
  // Methods
  getStudentById
} = studentData

const {
  // State
  showFilters,
  filteredStudents,
  currentFilters,
  // Methods
  toggleFilters,
  clearFilters,
  applyFilters,
  debouncedApplyFilters
} = filterData

const {
  // Role-based data
  visibleStudents,
  currentRole,
  // Permissions
  canEditAllStudents,
  canEditOwnStudents,
  canViewAllStudents,
  canManageUsers,
  canManageAides,
  canAccessTesting,
  canAccessTestingPartial,
  hasAnyTestingAccess,
  // UI Permissions (from base role view)
  canAccessFilters,
  isClassViewDisabled,
  isAdminRole,
  // Grouping functions (role-specific)
  groupStudentsByGrade,
  groupStudentsByPlan,
  // View mode and filtering
  setViewMode,
  filterByName,
  filterByCaseManager,
  filterByTeacher,
  // Provider view options (for sped roles)
  providerViewOptions
} = roleView

// For backward compatibility, we'll get view-specific data from the existing useStudentViews
// SECURITY: Pass role-based visibleStudents to ensure case managers only see authorized students
const viewData = useStudentViews(studentData, filterData, computed(() => roleView.visibleStudents.value))
const {
  // State
  currentViewMode,
  // Computed data
  studentsByClass,
  directAssignmentStudents,
  testingViewStudents
} = viewData

const {
  // Dialog states
  editingStudentId,
  emailingStudentId,
  showExport,
  showAddStudent,
  showFeedbackDialog,
  feedbackStudentId,
  // Student actions
  editStudent,
  emailStudent,
  handleTeacherFeedback,
  // Event handlers
  handleFormSent,
  handleStudentAdded,
  handleStudentSaved,
  // Navigation
  handleNavAction
} = navActions













// Get tooltip for provider view option
const getProviderTooltip = (value) => {
  const role = currentUser.value?.role
  switch (value) {
    case 'all_iep':
      return 'CM+SP'
    case 'case_manager': 
      return 'Case Manager'
    case 'service_provider': 
      return 'Service Provider'
    case 'teacher':
      return 'Service Provider'
    case 'iep_504_all':
      return 'All IEP/504 students'
    case 'all': 
      return role === 'sped_chair' ? 'All students (with IEPs)' : 'All students'
    default: 
      return 'All students'
  }
}

// Fallback provider view options for roles that don't have custom options
const defaultProviderViewOptions = computed(() => {
  if (providerViewOptions?.value) {
    return providerViewOptions.value
  }
  
  // Default options for case managers and other roles
  const role = currentUser.value?.role
  if (role === 'case_manager') {
    return [
      { value: 'all', label: 'All' },
      { value: 'case_manager', label: 'CM' },
      { value: 'service_provider', label: 'SP' }
    ]
  }
  
  return [
    { value: 'all', label: 'All' },
    { value: 'case_manager', label: 'CM' },
    { value: 'service_provider', label: 'SP' }
  ]
})

// Generate text for selected radio buttons
const selectedRadioText = computed(() => {
  const texts = []
  
  // Student radio button (provider view) - show first if exists
  if (currentFilters.providerView && providerViewOptions?.value?.length) {
    const providerText = getProviderTooltip(currentFilters.providerView)
    if (providerText) {
      texts.push(providerText)
    }
  }
  
  // View mode radio button
  if (currentFilters.viewMode) {
    let viewModeText = ''
    switch (currentFilters.viewMode) {
      case 'list':
        viewModeText = 'List view'
        break
      case 'class':
        viewModeText = 'Class-period view'
        break
      case 'testing':
        viewModeText = 'Separate Setting For Testing'
        break
    }
    if (viewModeText) {
      texts.push(viewModeText)
    }
  }
  
  return texts.length > 0 ? texts.join(' | ') : ''
})
</script>

<style>
.students-view {
  padding: 23px 10px 10px;
  max-width: 1600px;
  margin: 0 auto;
}

.selected-radio-display {
  font-size: 0.9rem;
  font-family: 'Roboto', sans-serif;
  color: #999999;
  font-weight: 500;
  margin-bottom: 10px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1px;
  padding-bottom: 15px;
  border-bottom: 2px solid #e0e0e0;
  gap: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.header-left h1 {
  margin: 0;
  color: #333;
  font-size: 2rem;
  white-space: nowrap;
}

.search-container {
  display: flex;
  align-items: center;
}

.search-input {
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.9rem;
  background: white;
  min-width: 250px;
}

.search-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* Filter toggle button specific styling */
.filter-toggle-btn {
  border: 1px solid #ced4da !important;
  border-radius: 6px !important;
  background: #f8f9fa !important;
}

.filter-toggle-btn:hover {
  background: #e9ecef !important;
  border-color: #adb5bd !important;
}

.filter-toggle-btn.active {
  background: #007bff !important;
  border-color: #007bff !important;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.students-view .radio-group {
  display: flex;
  align-items: center;
  gap: 0;
  border: 1px solid #ced4da;
  border-radius: 6px;
  overflow: hidden;
  background: #f8f9fa;
  flex-direction: row;
}

.students-view .radio-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
  color: #6c757d;
  position: relative;
}

.students-view .radio-btn:hover {
  background: #e9ecef;
  color: #495057;
}

.students-view .radio-btn.active {
  background: #007bff;
  color: white;
  font-weight: 600;
}

.students-view .radio-btn.active:hover {
  background: #0056b3;
  color: white;
}

.students-view .radio-btn.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.students-view .radio-btn.disabled:hover {
  background: #f8f9fa;
  color: #6c757d;
}

.strikethrough {
  text-decoration: line-through;
  text-decoration-color: #dc3545;
  text-decoration-thickness: 2px;
}

.students-view .radio-btn input[type="radio"] {
  margin: 0;
  opacity: 0;
  position: absolute;
}

/* Reset button removed - filter button moved to its position */

/* Sort Dropdown Styling */
.sort-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-icon {
  color: #6c757d;
  flex-shrink: 0;
}

.sort-select {
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.9rem;
  background: white;
  min-width: 140px;
  cursor: pointer;
  height: 36px; /* Match radio button height (8px padding * 2 + 20px content) */
  box-sizing: border-box;
}

.sort-select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

/* Filters Panel */
.filters-panel {
  margin-bottom: 20px;
  padding: 20px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
}

.filters-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.filters-content .filter-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.filters-content .filter-group label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #495057;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.9rem;
  background: white;
  width: 100%;
}

.filter-select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

/* Responsive design for filters */
@media (max-width: 1200px) {
  .header-controls {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .filter-group {
    justify-content: flex-start;
  }
  
  .search-input {
    min-width: 100%;
  }
  
  .sort-select {
    min-width: 120px;
  }
}

@media (max-width: 768px) {
  .students-view .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
  }
  
  .students-view .header-controls {
    flex-direction: column;
    gap: 8px;
  }
  
  .students-view .filter-group {
    align-items: flex-start;
  }
  
  .students-view .radio-group {
    justify-content: center;
  }
  
  .students-view .sort-select {
    width: 100%;
    min-width: auto;
  }
  
  /* Make filters panel more mobile friendly */
  .students-view .filters-panel {
    padding: 10px;
  }
  
  .students-view .filters-content {
    grid-template-columns: 1fr;
    gap: 15px;
  }
}

.content {
 
  
  /* box-shadow: 0 2px 4px rgba(0,0,0,0.1); */
  overflow: hidden;
}
.content > div:first-child {
  border-radius: 8px;
  box-shadow: 2px 1px 20px 0px #0000001a;
}
/* View Mode Styles */
.view-container {
  padding: 20px;
}

.group-section {
  margin-bottom: 30px;
}

.group-section:last-child {
  margin-bottom: 0;
}

.group-header {
  margin: 0 0 15px 0;
  color: #1976d2;
  font-size: 1.3rem;
  font-weight: 600;
  border-bottom: 2px solid #e3eaf6;
  padding-bottom: 8px;
}

.direct-assignment-header {
  color: #007bff;
  border-bottom: 2px solid #007bff;
  padding-bottom: 8px;
  margin-bottom: 15px;
}

.testing-all-header {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 20px;
}

.testing-all-header h3 {
  margin: 0 0 8px 0;
  color: #dc3545;
  font-size: 1.2rem;
  font-weight: 600;
}

/* Icon Button Styles */
.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  position: relative;
  min-width: 36px;
}

.disabled-icon {
  font-size: 0.7rem;
  position: absolute;
  top: -2px;
  right: -2px;
}

/* Tooltip Styles */
.icon-btn[title]:hover::after {
  content: attr(title);
  position: absolute;
  bottom: -2.5rem;
  left: 50%;
  transform: translateX(-50%);
  background: #333;
  color: white;
  padding: 0.4rem 0.6rem;
  border-radius: 4px;
  font-size: 0.75rem;
  white-space: nowrap;
  z-index: 1000;
  opacity: 0;
  animation: tooltipFadeIn 0.2s ease-in-out 0.3s forwards;
  pointer-events: none;
}

.icon-btn[title]:hover::before {
  content: '';
  position: absolute;
  bottom: -0.6rem;
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-bottom-color: #333;
  z-index: 1001;
  opacity: 0;
  animation: tooltipFadeIn 0.2s ease-in-out 0.3s forwards;
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* Hide user name on screen */
.print-user-name {
  display: none !important;
}

/* Print-specific styles */
@media print {
  .page-header {
    display: none !important;
  }
  
  .selected-radio-display {
    display: none !important;
  }
  
  .students-view .print-user-name {
    visibility: visible !important;
    display: block !important;
    font-size: 16px !important;
    font-weight: 700 !important;
    color: #000 !important;
    margin-bottom: 10px !important;
    padding-bottom: 10px !important;
    border-bottom: 2px solid #000 !important;
    text-align: left !important;
    background: none !important;
    position: relative !important;
    z-index: 9999 !important;
    border-radius: 0 !important;
  }
  
  /* Ensure table is right under username and full width */
  .students-view .content {
    visibility: visible !important;
    margin-top: 0 !important;
    padding-top: 0 !important;
  }
  
  .students-view table {
    width: 100% !important;
    margin-top: 0 !important;
    max-width: 100% !important;
  }
  
  .students-view {
    visibility: visible !important;
  }
}

/* Mobile/Phone View - Only show student info and accommodation columns */
@media (max-width: 768px) {


.header-left {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-direction: column;
}
  /* Use maximum specificity to override any other CSS */
  .students-view .students-table tbody th:nth-child(2), /* Services */
  .students-view .students-table tbody td:nth-child(2),
  .students-view .students-table thead th:nth-child(2),
  .students-view .students-table th:nth-child(2),
  .students-view .students-table td:nth-child(2),
  .students-view .students-table tbody th:nth-child(3), /* Schedule */
  .students-view .students-table tbody td:nth-child(3),
  .students-view .students-table thead th:nth-child(3),
  .students-view .students-table th:nth-child(3),
  .students-view .students-table td:nth-child(3),
  .students-view .students-table tbody th:nth-child(6), /* Documents */
  .students-view .students-table tbody td:nth-child(6),
  .students-view .students-table thead th:nth-child(6),
  .students-view .students-table th:nth-child(6),
  .students-view .students-table td:nth-child(6),
  .students-view .students-table tbody th:nth-child(7), /* Actions */
  .students-view .students-table tbody td:nth-child(7),
  .students-view .students-table thead th:nth-child(7),
  .students-view .students-table th:nth-child(7),
  .students-view .students-table td:nth-child(7) {
    display: none !important;
    visibility: hidden !important;
    width: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
    border: none !important;
  }
  
  /* Adjust column widths for remaining columns */
  .students-view .students-table th:nth-child(1), /* Student Info */
  .students-view .students-table td:nth-child(1) {
    width: 35% !important;
  }
  
  .students-view .students-table th:nth-child(4), /* Assessment Accommodations */
  .students-view .students-table td:nth-child(4) {
    width: 32.5% !important;
  }
  
  .students-view .students-table th:nth-child(5), /* Instruction Accommodations */
  .students-view .students-table td:nth-child(5) {
    width: 32.5% !important;
  }
  
  /* Reduce table font size for mobile */
  .students-view .students-table {
    font-size: 0.8rem !important;
  }
  
  /* Reduce cell padding */
  .students-view .students-table th,
  .students-view .students-table td {
    padding: 4px ;
  }
  
  /* Flag styles with higher specificity - MUST come after general padding */
  .students-view .students-table td.instruction-cell.with-flag {
    padding-top: calc(5px + var(--spacing-md)) !important;
    padding-right: 4px !important;
    padding-bottom: 4px !important;
    padding-left: 4px !important;
  }
 
    
  /* Adjust row height for mobile */
  .students-view .students-table tbody tr {
    height: 8rem !important;
  }
  
  .students-view .students-table tbody td {
    height: 8rem !important;
  }
}

/* Search bar full width on mobile */
@media (max-width: 768px) {
  .students-view .search-bar,
  .students-view .search-bar input,
  .students-view .search-container,
  .students-view .search-input {
    width: 100% !important;
    max-width: 100% !important;
  }
}

/* Alternative mobile approach - hide by class if nth-child isn't working */
@media (max-width: 768px) {
  .students-view .service-column,
  .students-view .schedule-column,
  .students-view .documents-column,
  .students-view .actions-column {
    display: none !important;
  }
}

</style>