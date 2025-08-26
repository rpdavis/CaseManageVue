<template>
  <table class="students-table" :class="{ 'testing-view': testingView }">
    <thead>
      <tr>
        <!-- Testing View Headers -->
        <template v-if="testingView">
          <th class="print">Student Info</th>
          <th class="print">Schedule</th>
          <th class="print">Assessment Accommodations</th>
        </template>
        <!-- Regular View Headers -->
        <template v-else>
          <th class="print student-info-column">Student Info</th>
          <th class="print service-column">Services</th>
          <th class="print schedule-column">Schedule</th>
          <th class="print instruction-column">Instruction Accommodations</th>
          <th class="print assessment-column">Assessment Accommodations</th>
          <th class="print documents-column">Docs</th>
          <th class="print actions-column">Actions</th>
        </template>
      </tr>
    </thead>
    <tbody>
      <tr v-for="student in students" :key="student.id">
        <!-- Testing View Cells -->
        <template v-if="testingView">
          <!-- Student Info Cell (same format as regular view) -->
          <td>
            <div class="student-name"><strong>{{ getDisplayValue(student, 'firstName') }} {{ getDisplayValue(student, 'lastName') }}</strong></div>
            <div class="std-info-subheading">
              <div>Grd: {{ getDisplayValue(student, 'grade') }} | Prg: {{ getDisplayValue(student, 'plan') }}</div>
              <div>CM: <span 
                class="case-manager-name" 
                :data-tooltip="getCaseManagerTooltip(getCaseManagerId(student))"
                @mouseenter="$event.target.classList.add('tooltip-active')"
                @mouseleave="$event.target.classList.remove('tooltip-active')"
              >{{ getUserName(getCaseManagerId(student)) }}</span></div>
              <div v-if="(student.app?.flags?.customFlags || []).length" class="custom-flags">
              <span
                v-for="color in ['blue', 'yellow', 'red']"
                v-if="(student.app?.flags?.customFlags || []).filter(f => f.color === color).length"
                :key="color"
                class="flag-chip"
                :class="color"
                :data-tooltip="(student.app?.flags?.customFlags || []).filter(f => f.color === color).map(f => `• ${f.text}`).join('\n')"
              >
                <span class="flag-dot"></span>{{ (student.app?.flags?.customFlags || []).filter(f => f.color === color).length }}
              </span>
            </div>
            </div>
          </td>
          
          <!-- Schedule Cell with proper co-teaching display -->
          <td>
            <div v-if="getSchedule(student)" class="schedule-list">
              <ul>
                <li v-for="(periodData, period) in getSchedule(student)" :key="period" class="schedule-period">
                  <div class="period-assignment">
                    <div class="primary-line">
                      <span class="period-label">{{ getPeriodLabel ? getPeriodLabel(period) : period }}:</span>
                      <span 
                        class="primary-teacher teacher-name" 
                        :data-tooltip="getUserTooltip(periodData.teacherId || periodData)"
                        @mouseenter="$event.target.classList.add('tooltip-active')"
                        @mouseleave="$event.target.classList.remove('tooltip-active')"
                      >{{ getUserInitialLastName(periodData.teacherId || periodData) }}</span>
                    </div>
                    <div v-if="isCoTeaching(periodData)" class="coteaching-info">
                      <span 
                        class="coteaching-indicator teacher-name"
                        :title="`Co-teach ${periodData.coTeaching.subject}`"
                        :data-tooltip="getUserTooltip(periodData.coTeaching.caseManagerId)"
                        @mouseenter="$event.target.classList.add('tooltip-active')"
                        @mouseleave="$event.target.classList.remove('tooltip-active')"
                      >
                        {{ getUserInitialLastName(periodData.coTeaching.caseManagerId) }} (C{{ periodData.coTeaching.subject.charAt(0) }})
                      </span>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
            <div v-else class="no-schedule">—</div>
          </td>
          
          <!-- Assessment Accommodations Cell (same as regular view) -->
          <td class="instruction-cell" :class="{ 'with-flag': getFlagValue(student, 'flag2') }">
            <div v-if="getFlagValue(student, 'flag2')" class="flag-overlay flag-separate-setting">Separate setting</div>
            <div v-if="getDisplayValue(student, 'assessment')" class="bullet-list">
              <div v-html="formatListFromText(getDisplayValue(student, 'assessment'))"></div>
            </div>
            <div v-else>—</div>
          </td>
        </template>
        
        <!-- Regular View Cells -->
        <template v-else>
          <!-- Student Info Cell -->
          <td class="student-info-column">
            <div class="student-name">
              <strong>{{ getDisplayValue(student, 'firstName') }} {{ getDisplayValue(student, 'lastName') }}</strong>
              <span class="data-source" :title="`Data source: ${getSourceValue(student, 'firstName')}`">
                {{ getSourceValue(student, 'firstName') === 'Override' ? '🔒' : 
                   getSourceValue(student, 'firstName') === 'App' ? '' :
                   getSourceValue(student, 'firstName') === 'Aeries' ? '📊' :
                   getSourceValue(student, 'firstName') === 'SEIS' ? '📋' : '' }}
              </span>
            </div>
            <div class="std-info-subheading">
              <div>Grd: {{ getDisplayValue(student, 'grade') }} | Prg: {{ getDisplayValue(student, 'plan') }}</div>
              <div>CM: <span 
                class="case-manager-name" 
                :data-tooltip="getCaseManagerTooltip(getCaseManagerId(student))"
                @mouseenter="$event.target.classList.add('tooltip-active')"
                @mouseleave="$event.target.classList.remove('tooltip-active')"
              >{{ getUserName(getCaseManagerId(student)) }}</span></div>
              <div v-if="(student.app?.flags?.customFlags || []).length" class="custom-flags">
                <template v-for="color in ['blue', 'yellow', 'red']" :key="color">
                  <span
                    v-if="(student.app?.flags?.customFlags || []).filter(f => f.color === color).length"
                    class="flag-chip"
                    :class="`flag-${color}`"
                    :data-tooltip="(student.app?.flags?.customFlags || []).filter(f => f.color === color).map(f => `• ${f.text}`).join('\n')"
                  >
                    <Flag :size="16" class="lucide-flag" />
                    <span class="flag-count">{{ (student.app?.flags?.customFlags || []).filter(f => f.color === color).length }}</span>
                  </span>
                </template>
              </div>
            </div>
            <div class="student-dates print">
              <span class="badge badge-review plan-review" :class="getReviewUrgencyClass(student)">PR: {{ formatDate(getDisplayValue(student, 'reviewDate')) }}</span>
              <span class="badge badge-reeval reeval-due" :class="getReevalUrgencyClass(student)">RE: {{ formatDate(getDisplayValue(student, 'reevalDate')) }}</span>
              <span class="badge badge-meeting meeting-date" :class="[getMeetingUrgencyClass(student), getDisplayValue(student, 'meetingDate') ? 'date-set' : '']">
                🗓 {{ formatDate(getDisplayValue(student, 'meetingDate')) || 'Not set' }}
              </span>
            </div>
            
            <!-- Direct Assignment Badge for Paraeducators -->
            <div v-if="currentUser?.role === 'paraeducator' && isDirectAssignment(student.id)" class="direct-assignment-badge">
              <span class="badge badge-direct">Direct Assignment</span>
            </div>
          </td>
          
          <!-- Services Cell -->
          <ServicesCell
            :student="student"
            :app-settings="appSettings"
            :get-class-services="getClassServices"
            :get-other-services="getOtherServices"
            :has-service-providers="hasServiceProviders"
            :get-service-provider-id="getServiceProviderId"
            :get-provider-field-name="getProviderFieldName"
            :get-user-initial-last-name="getUserInitialLastName"
          />
          
          <!-- Schedule Cell -->
          <ScheduleCell
            :student="student"
            :get-schedule="getSchedule"
            :get-user-initial-last-name="getUserInitialLastName"
            :get-period-label="getPeriodLabel"
            :get-user-tooltip="getUserTooltip"
          />
          
          <!-- Instruction Accom. Cell -->
          <AccommodationsCell
            :student="student"
            :field-name="'instruction'"
            :flag-type="'flag1'"
            :flag-text="'Preferential Seating'"
            :flag-class="'flag-preferential-seating'"
            :get-flag-value="getFlagValue"
            :format-list-from-text="formatListFromText"
          />
          
          <!-- Assessment Accom. Cell -->
          <AccommodationsCell
            :student="student"
            :field-name="'assessment'"
            :flag-type="'flag2'"
            :flag-text="'Separate Setting'"
            :flag-class="'flag-separate-setting'"
            :get-flag-value="getFlagValue"
            :format-list-from-text="formatListFromText"
          />
          
          <!-- Docs Cell -->
          <StudentDocsCell 
            :student="student" 
            :get-document-url="getDocumentUrl" 
            :get-additional-documents="getAdditionalDocuments"
          />
          
          <!-- Actions Cell -->
          <ActionsCell
            :student="student"
            :current-user="currentUser"
            :student-data="studentData"
            :get-user-name="getUserName"
            :format-date="formatDate"
            @edit="$emit('edit', student.id)"
            @email="$emit('email', student.id)"
            @teacher-feedback="$emit('teacher-feedback', student.id)"
          />
        </template>
      </tr>
    </tbody>
  </table>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { getDisplayValue, getSourceValue } from '@/utils/studentUtils'
import { useStudentTable } from './table/useStudentTable.js'
import './table/StudentTable.css'
import StudentDocsCell from './table/StudentDocsCell.vue'
import ActionsCell from './table/StudentActionsCell.vue'
import ScheduleCell from './table/StudentScheduleCell.vue'
import ServicesCell from './table/StudentServicesCell.vue'
import AccommodationsCell from './table/AccommodationsCell.vue'
import { Flag } from 'lucide-vue-next'

const props = defineProps({
  students: {
    type: Array,
    default: () => []
  },
  userMap: {
    type: Object,
    default: () => ({})
  },
  currentUser: {
    type: Object,
    default: null
  },
  studentData: {
    type: Object,
    default: null
  },
  testingView: {
    type: Boolean,
    default: false
  },
  aideSchedule: {
    type: Object,
    default: () => ({})
  },
  appSettings: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['edit', 'email', 'teacher-feedback'])

// Use the composable for all helper functions and app settings
const {
  // App settings
  appSettings,
  appSettingsLoading,
  appSettingsError,

// Helper functions
  getUserName,
  getUserInitials,
  getUserInitialLastName,
  getUserTooltip,
  getCaseManagerTooltip,
  formatDate,
  getFlagClass,
  hasFlags,
  getDateUrgencyClass,
  getMeetingUrgencyClass,
  getReviewUrgencyClass,
  getReevalUrgencyClass,
  getCaseManagerId,
  getFlagValue,
  getDocumentUrl,
  getSchedule,
  getClassServices,
  getOtherServices,
  hasServiceProviders,
  getServiceProviderId,
  getProviderFieldName,
  isDirectAssignment,
  formatListFromText,
  getPeriodLabel,
  getAdditionalDocuments
} = useStudentTable(props)

// Helper function to check if a period has co-teaching data
const isCoTeaching = (periodData) => {
  return periodData && typeof periodData === 'object' && periodData.coTeaching && periodData.teacherId
}

// All helper functions now provided by useStudentTable composable





</script>