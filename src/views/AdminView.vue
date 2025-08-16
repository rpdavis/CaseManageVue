<!-- src/views/AdminView.vue -->
<template>
  <div>
    <div class="admin-header">
      <h1>Admin Panel</h1>
      <div class="admin-nav">
        <button 
          v-if="categoryHasTabs('dashboard')"
          @click="setActiveCategory('dashboard')" 
          :class="{ active: activeCategory === 'dashboard' }"
          class="category-btn"
        >
          Dashboard
        </button>
        <button 
          v-if="categoryHasTabs('users-students')"
          @click="setActiveCategory('users-students')" 
          :class="{ active: activeCategory === 'users-students' }"
          class="category-btn"
        >
          User & Student
        </button>
        <button 
          v-if="categoryHasTabs('aide-management')"
          @click="setActiveCategory('aide-management')" 
          :class="{ active: activeCategory === 'aide-management' }"
          class="category-btn"
        >
          Paraprofessionals
        </button>
        <button 
          v-if="categoryHasTabs('data-integration')"
          @click="setActiveCategory('data-integration')" 
          :class="{ active: activeCategory === 'data-integration' }"
          class="category-btn"
        >
          Data & Integration
        </button>
        <button 
          v-if="categoryHasTabs('system-config')"
          @click="setActiveCategory('system-config')" 
          :class="{ active: activeCategory === 'system-config' }"
          class="category-btn"
        >
          Configuration
        </button>
        <button 
          v-if="categoryHasTabs('monitoring')"
          @click="setActiveCategory('monitoring')" 
          :class="{ active: activeCategory === 'monitoring' }"
          class="category-btn"
        >
          System
        </button>
      </div>
      <div class="admin-actions">
        <button @click="goToStudents" class="return-btn">
          <span>←</span> 
        </button>
      </div>
    </div>
    
    <!-- Sub Tab Bar - Only show when a category is selected -->
    <div v-if="activeCategory" class="sub-tab-container">
      <TabBar 
        :tabs="getTabsForCategory(activeCategory)" 
        :active-tab="activeTab" 
        @tab-change="handleTabChange" 
      />
    </div>

    <!-- Tab Content -->
    <div class="admin-section">
      <!-- Dashboard Tab -->
      <div v-if="activeTab === 'dashboard'" class="admin-section">
        <AdminDashboard 
          @go-to-category="handleGoToCategory"
          @go-to-students="goToStudents"
        />
      </div>

      <!-- Add Users Tab -->
      <div v-if="activeTab === 'usersAdd'" class="admin-section">
        <UserAddForm />
      </div>

      <!-- Edit Users Tab -->
      <div v-if="activeTab === 'usersEdit'" class="admin-section">
        <UserTable />
      </div>

      <!-- Students Tab -->
      <div v-if="activeTab === 'students'" class="admin-section">
        <AdminStudents />
      </div>

      <!-- Add Students Tab -->
      <div v-if="activeTab === 'addStudents'" class="admin-section">
        <StudentBulkImporter @close="handleBulkImporterClose" @imported="handleStudentsImported" />
      </div>

      <!-- Permissions Tab -->
      <div v-if="activeTab === 'permissions'" class="admin-section">
        <AdminPermissions />
      </div>

      <!-- Aide Assignment Tab -->
      <div v-if="activeTab === 'aide-assignment'" class="admin-section">
        <AdminAideAssignment />
      </div>

      <!-- Aide Schedule Tab -->
      <div v-if="activeTab === 'aide-schedule'" class="admin-section">
        <AdminAideSchedule />
      </div>

      <!-- Time Table Tab -->
      <div v-if="activeTab === 'time-table'" class="admin-section">
        <AdminTimeTable />
      </div>

      <!-- SEIS Import Tab -->
      <div v-if="activeTab === 'seis'" class="admin-section">
        <SeisImport />
      </div>

      <!-- Aeries Import Tab -->
      <div v-if="activeTab === 'aeries'" class="admin-section">
        <AeriesAPIConnector />
        <hr style="margin: 2rem 0; border: 1px solid #ddd;">
        <AeriesImport />
      </div>

      <!-- App Settings Tab -->
      <div v-if="activeTab === 'settings'" class="admin-section">
        <AppSettings />
      </div>

      <!-- Theme Customization Tab -->
      <div v-if="activeTab === 'theme'" class="admin-section">
        <ThemeManager />
      </div>

      <!-- Testing Links Tab -->
      <div v-if="activeTab === 'testing-links'" class="admin-section">
        <TestingLinks :students="students" :userMap="userMap" />
      </div>

      <!-- Teacher Feedback Forms Tab -->
      <div v-if="activeTab === 'teacher-feedback'" class="admin-section">
        <AdminTeacherFeedback />
      </div>

      <!-- Backup & Restore Tab -->
      <div v-if="activeTab === 'backup-restore'" class="admin-section">
        <AdminBackupRestore />
      </div>

      <!-- Audit Logs Tab -->
      <div v-if="activeTab === 'audit-logs'" class="admin-section">
        <AdminAuditLogs />
      </div>

      <!-- IEP Data Security Tab -->
      <div v-if="activeTab === 'iep-security'" class="admin-section">
        <h2>IEP Data Security</h2>
        <DebugEncryption :selected-student="currentStudent" />
      </div>

      <!-- Security Controls Tab -->
      <div v-if="activeTab === 'security'" class="admin-section">
        <SecurityControlCenter :selected-student="currentStudent" />
      </div>

      <!-- Component Health Dashboard Tab -->
      <div v-if="activeTab === 'component-health'" class="admin-section">
        <ComponentHealthDashboard />
      </div>

      <!-- Admin Panel Permissions Tab (Admin Only) -->
      <div v-if="activeTab === 'admin-permissions'" class="admin-section">
        <AdminPermissionsMatrix />
      </div>

      <!-- App Settings Testing Tab -->
      <div v-if="activeTab === 'app-settings-testing'" class="admin-section">
        <TestingView />
      </div>
    </div>
  </div>
</template>

<script>
// Admin panel styles now included in main.css
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import useStudents from '@/composables/useStudents.js'
import useUsers from '@/composables/useUsers.js'
import TabBar from '../components/TabBar.vue'
import UserAddForm from '../components/UserAddForm.vue'
import UserTable from '../components/UserTable.vue'

import AdminStudents from './AdminStudents.vue'
import StudentBulkImporter from '../components/StudentBulkImporter.vue'

import AdminPermissions from './AdminPermissions.vue'
import SeisImport from '../components/SeisImport.vue'
import AeriesImport from '../components/AeriesImport.vue'
import AeriesAPIConnector from '../components/AeriesAPIConnector.vue'

import AppSettings from './AppSettings.vue'
import AdminAideAssignment from './AdminAideAssignment.vue'
import AdminTimeTable from './AdminTimeTable.vue'
import AdminAideSchedule from './AdminAideSchedule.vue'
import AdminBackupRestore from './AdminBackupRestore.vue'
import AdminAuditLogs from './AdminAuditLogs.vue'
import AdminTeacherFeedback from './AdminTeacherFeedback.vue'
import TestingLinks from '../components/TestingLinks.vue'
import AdminDashboard from '../components/AdminDashboard.vue'

import DebugEncryption from '@/components/DebugEncryption.vue'
import SecurityControlCenter from '@/components/SecurityControlCenter.vue'

import ComponentHealthDashboard from '@/components/ComponentHealthDashboard.vue'
import AdminPermissionsMatrix from '@/components/AdminPermissionsMatrix.vue'
import ThemeManager from '@/components/ThemeManager.vue'
import TestingView from '@/views/TestingView.vue'
import { useAuthStore } from '@/store/authStore'
import { useAdminPermissions } from '@/composables/useAdminPermissions'
import { auditLogger } from '@/utils/auditLogger'

export default {
  name: 'AdminView',
  components: {
    TabBar,
    UserAddForm,
    UserTable,

    AdminStudents,
    StudentBulkImporter,

    AdminPermissions,
    SeisImport,
    AeriesImport,
    AeriesAPIConnector,
    AppSettings,
    AdminAideAssignment,
    AdminTimeTable,
    AdminAideSchedule,
    AdminBackupRestore,
    AdminAuditLogs,
    AdminTeacherFeedback,
    TestingLinks,
    AdminDashboard,
    DebugEncryption,
    SecurityControlCenter,
    ComponentHealthDashboard,
    AdminPermissionsMatrix,
    ThemeManager,
    TestingView
  },
  setup() {
    const router = useRouter()
    const route = useRoute()
    const activeTab = ref('dashboard')
    const activeCategory = ref('dashboard')
    
    // Load students and users data
    const { students, fetchStudents } = useStudents()
    const { users: userMap, fetchUsers } = useUsers()
    
    // Get current user for admin-only features
    const authStore = useAuthStore()
    const currentUser = computed(() => authStore.currentUser)
    
    // Get admin permissions system
    const { loadPermissions, getPermittedTabs, permissionsLoaded } = useAdminPermissions()
    
    // Fetch data on mount
    onMounted(async () => {
      try {
        await Promise.all([
          fetchStudents(), 
          fetchUsers(),
          loadPermissions() // Load admin permissions
        ])
        
        // Log admin panel access
        if (currentUser.value) {
          await auditLogger.logSystemAccess('admin_panel_access', {
            userRole: currentUser.value.role,
            accessTime: new Date().toISOString(),
            initialCategory: route.query.category || 'dashboard'
          })
        }
        
        // Check for category parameter in URL
        const categoryParam = route.query.category
        if (categoryParam) {
          setActiveCategory(categoryParam)
        }
      } catch (error) {
        console.error('Error loading data:', error)
      }
    })

    // Base tabs available to all admin users (now filtered by permissions)
    const baseTabs = [
      { key: 'dashboard', label: 'Dashboard', category: 'dashboard' },
      { key: 'usersAdd', label: 'Add Users', category: 'users-students' },
      { key: 'usersEdit', label: 'Manage Users', category: 'users-students' },
      { key: 'students', label: 'Students', category: 'users-students' },
      { key: 'addStudents', label: 'Add Students', category: 'users-students' },
      { key: 'aide-assignment', label: 'Aide Assignment', category: 'aide-management' },
      { key: 'aide-schedule', label: 'Aide Schedule', category: 'aide-management', status: 'not-working' },
      { key: 'time-table', label: 'Time Table', category: 'aide-management' },
      { key: 'seis', label: 'SEIS Import', category: 'data-integration', status: 'not-active' },
      { key: 'aeries', label: 'Aeries API & Import', category: 'data-integration', status: 'not-active' },
      { key: 'testing-links', label: 'Testing Links', category: 'data-integration' },
      { key: 'teacher-feedback', label: 'Teacher Feedback Forms', category: 'data-integration' },
      { key: 'backup-restore', label: 'Backup & Restore', category: 'data-integration' },
      { key: 'permissions', label: 'Permissions', category: 'system-config' },
      { key: 'settings', label: 'App Settings', category: 'system-config' },
      { key: 'theme', label: 'Theme Customization', category: 'system-config' },
      { key: 'audit-logs', label: 'Audit Logs', category: 'monitoring' },
      //{ key: 'iep-security', label: 'IEP Security', category: 'monitoring' },
      { key: 'security', label: 'Security Controls', category: 'monitoring' },
      { key: 'component-health', label: 'Component Debug', category: 'monitoring' },
      { key: 'app-settings-testing', label: 'App Settings Testing', category: 'monitoring' }
    ]
    
    // Admin-only tabs (only visible to 'admin' role)
    const adminOnlyTabs = [
      { key: 'admin-permissions', label: 'Admin Panel Permissions', category: 'monitoring' }
    ]
    
    // Combine tabs based on user role and permissions
    const tabs = computed(() => {
      const userRole = currentUser.value?.role
      
      // If permissions aren't loaded yet, return empty array
      if (!permissionsLoaded.value) return []
      
      let allTabs = [...baseTabs]
      
      // Add admin-only tabs for admin role
      if (userRole === 'admin') {
        allTabs = [...allTabs, ...adminOnlyTabs]
      }
      
      // Filter tabs based on permissions
      return getPermittedTabs(allTabs, userRole)
    })

    const getTabsForCategory = (categoryKey) => {
      return tabs.value.filter(tab => tab.category === categoryKey)
    }

    // Check if a category has any permitted tabs
    const categoryHasTabs = (categoryKey) => {
      return getTabsForCategory(categoryKey).length > 0
    }

    const setActiveCategory = async (categoryKey) => {
      activeCategory.value = categoryKey
      // Set the first tab of the selected category as active
      const categoryTabs = getTabsForCategory(categoryKey)
      if (categoryTabs.length > 0) {
        activeTab.value = categoryTabs[0].key
      }
      
      // Log category navigation
      if (currentUser.value) {
        await auditLogger.logSystemAccess('admin_category_access', {
          category: categoryKey,
          userRole: currentUser.value.role,
          availableTabs: categoryTabs.map(tab => tab.key)
        })
      }
    }

    const handleTabChange = async (tabKey) => {
      activeTab.value = tabKey
      
      // Log tab access
      if (currentUser.value) {
        await auditLogger.logSystemAccess('admin_tab_access', {
          tab: tabKey,
          category: activeCategory.value,
          userRole: currentUser.value.role
        })
      }
    }

    const goToStudents = () => {
      router.push('/students')
    }

    const goToDashboard = () => {
      router.push('/admin/dashboard')
    }

    const handleGoToCategory = (categoryKey) => {
      setActiveCategory(categoryKey)
    }

    const handleBulkImporterClose = () => {
      // Switch back to students tab
      activeTab.value = 'students'
    }

    const handleStudentsImported = async (result) => {
      console.log('Students imported:', result)
      // Refresh students data
      try {
        await fetchStudents()
      } catch (error) {
        console.error('Failed to refresh students after import:', error)
      }
    }

    return {
      activeTab,
      activeCategory,
      getTabsForCategory,
      categoryHasTabs,
      setActiveCategory,
      handleTabChange,
      goToStudents,
      goToDashboard,
      handleGoToCategory,
      handleBulkImporterClose,
      students,
      userMap,
      currentUser,
      permissionsLoaded
    }
  }
}
</script>

<style scoped>
/* Admin panel styles now included in main.css */

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-top: 15px;
  padding-bottom: 15px;
  border-bottom: 2px solid #e0e0e0;
}

.admin-header h1 {
  margin: 0;
  color: #333;
  font-size: 2rem;
}

.admin-nav {
  display: flex;
  gap: 1rem;
}

.category-btn {
  padding: 12px 20px;
  background: #f8f9fa;
  color: #495057;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.2s ease;
  text-transform: none;
  letter-spacing: normal;
}

.category-btn:hover {
  background: #e9ecef;
  border-color: #dee2e6;
  color: #212529;
}

.category-btn.active {
  background: #2a79c9;
  border-color: #2a79c9;
  color: white;
  box-shadow: 0 2px 4px rgba(42, 121, 201, 0.3);
}



.return-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  font-size: 1rem;
}

.return-btn:hover {
  background: #545b62;
}

.return-btn span {
  font-size: 1.2rem;
}

.sub-tab-container {
  margin-bottom: 1.5em;
}

.placeholder-content {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 2rem;
  margin-top: 1rem;
}

.placeholder-content h3 {
  color: #495057;
  margin-bottom: 1rem;
}

.placeholder-content ul {
  margin-left: 1.5rem;
}

.placeholder-content li {
  margin-bottom: 0.5rem;
  color: #6c757d;
}

.admin-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.debug-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  font-weight: var(--font-weight-medium);
  transition: var(--transition-base);
}

.debug-btn:hover {
  background: var(--bg-muted);
  color: var(--text-primary);
}

.admin-section {
  margin: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.admin-section h2 {
  margin-bottom: 20px;
  color: #2c3e50;
}
</style>
