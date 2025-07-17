<template>
  <div class="user-role-switcher" v-if="canShowDebugMenu && isDebugMenuVisible" :class="{ collapsed: !isExpanded }">
    <div class="switcher-header" @click="toggleExpanded" :title="isExpanded ? 'Collapse Debug Panel' : 'Expand Debug Panel'">
      <span class="debug-icon">🔧</span>
      <span v-if="isExpanded" class="debug-label">Debug</span>
      <button @click.stop="hideDebugMenu" class="close-debug-btn" title="Close Debug Menu">×</button>
    </div>
    
    <div v-if="isExpanded" class="switcher-content">
      <div class="current-user-info">
        <strong>Current User:</strong> {{ currentUser?.name || currentUser?.email || 'Unknown' }}
        <br>
        <strong>Role:</strong> <span :class="'role-' + currentUser?.role">{{ currentUser?.role || 'None' }}</span>
        <br>
        <strong>UID:</strong> {{ currentUser?.uid || 'None' }}
      </div>
      
      <div class="role-selector">
        <label for="role-select">Switch to Role:</label>
        <select id="role-select" v-model="selectedRole">
          <option value="">-- Select Role --</option>
          <option v-for="role in availableRoles" :key="role.value" :value="role.value">
            {{ role.label }}
          </option>
        </select>
      </div>
      
      <div class="real-user-selector">
        <label for="real-user-select">Switch to User:</label>
        <select id="real-user-select" v-model="selectedRealUserId">
          <option value="">-- Select User --</option>
          <optgroup v-for="role in availableRoles" :label="role.label" :key="role.value">
            <option v-for="user in usersByRole[role.value]" :key="user.id" :value="user.id">
              {{ user.name || user.email }}
            </option>
          </optgroup>
        </select>
      </div>
      
      <div class="test-users">
        <h5>Quick Test Users:</h5>
        <div class="test-user-buttons">
          <button 
            v-for="user in testUsers" 
            :key="user.uid"
            @click="switchToUser(user)"
            :class="['test-user-btn', { active: currentUser?.uid === user.uid }]"
          >
            {{ user.name }}
            <small>({{ user.role }})</small>
          </button>
        </div>
      </div>
      
      <div class="permission-info">
        <h5>Current Permissions:</h5>
        <div v-if="loadingPermissions" class="loading-permissions">
          Loading permissions...
        </div>
        <div v-else class="permission-list">
          <div 
            v-for="permission in currentPermissions" 
            :key="permission.action"
            :class="['permission-item', { granted: permission.granted }]"
          >
            <span class="permission-icon">{{ permission.granted ? '✅' : '❌' }}</span>
            {{ permission.label }}
          </div>
        </div>
      </div>
      
      <div class="testing-scenarios">
        <h5>🧪 Testing Scenarios:</h5>
        <div class="scenario-list">
          <div class="scenario-item">
            <strong>Students Page:</strong>
            <ul>
              <li>✅ Can view students</li>
              <li>✅ Can edit own caseload (CM)</li>
              <li>✅ Can edit all students (Admin)</li>
              <li>✅ Paraeducator filter works</li>
            </ul>
          </div>
          <div class="scenario-item">
            <strong>Admin Panel:</strong>
            <ul>
              <li>✅ Users management</li>
              <li>✅ Permissions matrix</li>
              <li>✅ Aide assignments</li>
              <li>✅ App settings</li>
            </ul>
          </div>
          <div class="scenario-item">
            <strong>Navigation:</strong>
            <ul>
              <li>✅ Admin button visibility</li>
              <li>✅ My Schedule button (Para)</li>
              <li>✅ Role-based menu items</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div class="actions">
        <button @click="resetToRealUser" class="reset-btn">
          🔄 Reset to Real User
        </button>
        <button @click="refreshPage" class="refresh-btn">
          🔄 Refresh Page
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/store/authStore'
import { usePermissions } from '@/composables/usePermissions'
import { useDebugMenu } from '@/composables/useDebugMenu'
import { VALID_ROLES, PERMISSION_ACTIONS } from '@/config/roles'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import useUsers from '@/composables/useUsers'

export default {
  name: 'UserRoleSwitcher',
  setup() {
    const authStore = useAuthStore()
    const { hasPermission } = usePermissions()
    const { isDebugMenuVisible, canShowDebugMenu, hideDebugMenu } = useDebugMenu()
    
    const isExpanded = ref(false)
    const selectedRole = ref('')
    const permissionsMatrix = ref({})
    const loadingPermissions = ref(false)
    
    const currentUser = computed(() => authStore.user)
    
        const availableRoles = [
      { value: 'admin', label: 'Admin' },
      { value: 'administrator', label: 'Administrator' },
      { value: 'administrator_504_CM', label: 'Administrator 504/CM' },
      { value: 'sped_chair', label: 'SPED Chair' },
      { value: 'case_manager', label: 'Case Manager' },
      { value: 'paraeducator', label: 'Paraeducator' },
      { value: 'teacher', label: 'Teacher' },
      { value: 'service_provider', label: 'Service Provider' }
    ]
    
    // Real users for debug dropdown
    const { userList, fetchUsers } = useUsers()
    const selectedRealUserId = ref('')
    const usersByRole = computed(() => {
      const map = {}
      availableRoles.forEach(role => {
        map[role.value] = userList.value.filter(u => u.role === role.value)
      })
      return map
    })

    // Test users for quick switching
    const testUsers = [
      {
        uid: 'test-admin',
        name: 'Test Admin',
        email: 'admin@test.com',
        role: 'admin'
      },
      {
        uid: 'test-administrator',
        name: 'Test Administrator',
        email: 'administrator@test.com',
        role: 'administrator'
      },
      {
        uid: 'test-administrator-504-cm',
        name: 'Test Admin 504/CM',
        email: 'admin504@test.com',
        role: 'administrator_504_CM'
      },
      {
        uid: 'test-sped-chair',
        name: 'Test SPED Chair',
        email: 'spedchair@test.com',
        role: 'sped_chair'
      },
      {
        uid: 'test-case-manager',
        name: 'Test Case Manager',
        email: 'cm@test.com',
        role: 'case_manager'
      },
      {
        uid: 'test-paraeducator',
        name: 'Test Paraeducator',
        email: 'para@test.com',
        role: 'paraeducator'
      },
      {
        uid: 'test-teacher',
        name: 'Test Teacher',
        email: 'teacher@test.com',
        role: 'teacher'
      },
      {
        uid: 'test-service-provider',
        name: 'Test Service Provider',
        email: 'service@test.com',
        role: 'service_provider'
      },

    ]
    
    // Switch to a real user fetched from Firestore
    const switchToRealUser = () => {
      if (!selectedRealUserId.value) return
      const u = userList.value.find(u => u.id === selectedRealUserId.value)
      if (u) {
        const debugUser = {
          uid: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          lastSyncTrigger: new Date().toISOString()
        }
        authStore.setUser(debugUser)
        localStorage.setItem('debug-user', JSON.stringify(debugUser))
      }
      selectedRealUserId.value = ''
    }

    // Load permissions matrix from database
    const loadPermissionsMatrix = async () => {
      loadingPermissions.value = true
      try {
        const docRef = doc(db, 'config', 'permissions_matrix')
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          permissionsMatrix.value = docSnap.data()
        } else {
          console.warn('Permissions matrix not found in database')
          permissionsMatrix.value = {}
        }
      } catch (error) {
        console.error('Error loading permissions matrix:', error)
        permissionsMatrix.value = {}
      } finally {
        loadingPermissions.value = false
      }
    }

    // Get current permissions for the user from database
    const currentPermissions = computed(() => {
      const permissions = [
        { action: PERMISSION_ACTIONS.VIEW_USERS, label: 'View Users' },
        { action: PERMISSION_ACTIONS.EDIT_USER, label: 'Edit User' },
        { action: PERMISSION_ACTIONS.DELETE_USER, label: 'Delete User' },
        { action: PERMISSION_ACTIONS.MANAGE_SUBJECTS, label: 'Manage Subjects' },
        { action: PERMISSION_ACTIONS.MANAGE_ROLES, label: 'Manage Roles' },
        { action: PERMISSION_ACTIONS.VIEW_STUDENTS, label: 'View Students' },
        { action: PERMISSION_ACTIONS.EDIT_STUDENT_CM, label: 'Edit Students (Own Caseload)' },
        { action: PERMISSION_ACTIONS.EDIT_STUDENT_ALL, label: 'Edit All Students' },
        { action: PERMISSION_ACTIONS.TESTING, label: 'Testing' }
      ]
      
      const currentRole = currentUser.value?.role
      const rolePermissions = permissionsMatrix.value[currentRole] || []
      
      return permissions.map(permission => ({
        ...permission,
        granted: rolePermissions.includes(permission.action)
      }))
    })
    
    const toggleExpanded = () => {
      isExpanded.value = !isExpanded.value
    }
    
    const switchRole = () => {
      if (!selectedRole.value) return
      
      // Create a mock user with the selected role
      const mockUser = {
        uid: `test-${selectedRole.value}-${Date.now()}`,
        email: `${selectedRole.value}@test.com`,
        name: `Test ${selectedRole.value.charAt(0).toUpperCase() + selectedRole.value.slice(1)}`,
        role: selectedRole.value,
        lastSyncTrigger: new Date().toISOString()
      }
      
      // Update the auth store
      authStore.setUser(mockUser)
      
      // Store in localStorage for persistence
      localStorage.setItem('debug-user', JSON.stringify(mockUser))
      
      selectedRole.value = ''
    }

    // Switch to a quick test user
    const switchToUser = (user) => {
      authStore.setUser(user)
      localStorage.setItem('debug-user', JSON.stringify(user))
    }

    // Watch dropdown selections and trigger switch with debug logs
    watch(selectedRole, (newRole, oldRole) => {
      console.debug('[DebugMenu] Role dropdown changed:', oldRole, '->', newRole)
      if (newRole) switchRole()
    })
    watch(selectedRealUserId, (newId, oldId) => {
      console.debug('[DebugMenu] User dropdown changed:', oldId, '->', newId)
      if (newId) switchToRealUser()
    })

    const resetToRealUser = () => {
      // Remove debug user from localStorage
      localStorage.removeItem('debug-user')
      
      // Refresh the page to get the real user
      window.location.reload()
    }
    
    const refreshPage = () => {
      window.location.reload()
    }
    
    onMounted(async () => {
      // Load real users for debug
      await fetchUsers()
      // Load permissions matrix from database
      await loadPermissionsMatrix()
      
      // Check if there's a debug user in localStorage
      const debugUser = localStorage.getItem('debug-user')
      if (debugUser) {
        try {
          const user = JSON.parse(debugUser)
          authStore.setUser(user)
        } catch (error) {
          console.error('Error parsing debug user:', error)
          localStorage.removeItem('debug-user')
        }
      }
      
      // Add keyboard shortcut (Ctrl+Shift+D) to toggle the debug menu
      const handleKeydown = (event) => {
        if (event.ctrlKey && event.shiftKey && event.key === 'D') {
          event.preventDefault()
          if (canShowDebugMenu.value) {
            if (isDebugMenuVisible.value) {
              toggleExpanded()
            } else {
              isDebugMenuVisible.value = true
              isExpanded.value = true
            }
          }
        }
      }
      
      document.addEventListener('keydown', handleKeydown)
      
      // Cleanup on unmount
      return () => {
        document.removeEventListener('keydown', handleKeydown)
      }
    })
    
    return {
      isDebugMenuVisible,
      canShowDebugMenu,
      hideDebugMenu,
      isExpanded,
      selectedRole,
      currentUser,
      availableRoles,
      testUsers,
      currentPermissions,
      loadingPermissions,
      toggleExpanded,
      switchRole,
      switchToUser,
      resetToRealUser,
      refreshPage,
      // Expose new debug user selector state
      userList,
      selectedRealUserId,
      usersByRole,
      switchToRealUser
    }
  }
}
</script>

<style scoped>
.user-role-switcher {
  position: fixed;
  top: 20px;
  left: 20px;
  background: #2c3e50;
  color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 9999;
  min-width: 300px;
  max-width: 400px;
  transition: all 0.3s ease;
}

.user-role-switcher.collapsed {
  min-width: auto;
  max-width: auto;
}

.switcher-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #34495e;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.user-role-switcher.collapsed .switcher-header {
  border-radius: 8px;
}

.switcher-header:hover {
  background: #4a5f7a;
}

.debug-icon {
  font-size: 16px;
  cursor: pointer;
}

.debug-label {
  font-size: 12px;
  font-weight: 600;
  color: #ecf0f1;
  flex: 1;
}

.close-debug-btn {
  background: none;
  border: none;
  color: #ecf0f1;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  margin-left: 8px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  transition: background-color 0.2s;
}

.close-debug-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.switcher-content {
  padding: 16px;
  max-height: 70vh;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #34495e #2c3e50;
}

.switcher-content::-webkit-scrollbar {
  width: 6px;
}

.switcher-content::-webkit-scrollbar-track {
  background: #2c3e50;
  border-radius: 3px;
}

.switcher-content::-webkit-scrollbar-thumb {
  background: #34495e;
  border-radius: 3px;
}

.switcher-content::-webkit-scrollbar-thumb:hover {
  background: #4a5f7a;
}

.current-user-info {
  background: #34495e;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 12px;
  line-height: 1.4;
}

.role-selector {
  margin-bottom: 16px;
}

.role-selector label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 12px;
}

.role-selector select {
  width: 100%;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ddd;
  background: white;
  color: #333;
}

.real-user-selector {
  margin-bottom: 16px;
}

.real-user-selector label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 12px;
}

.real-user-selector select {
  width: 100%;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ddd;
  background: white;
  color: #333;
}

.test-users h5 {
  margin: 0 0 12px 0;
  font-size: 12px;
  font-weight: 600;
}

.test-user-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.test-user-btn {
  background: #3498db;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  text-align: left;
  transition: background-color 0.2s;
}

.test-user-btn:hover {
  background: #2980b9;
}

.test-user-btn.active {
  background: #27ae60;
}

.test-user-btn small {
  display: block;
  opacity: 0.8;
  margin-top: 2px;
}

.permission-info h5 {
  margin: 0 0 12px 0;
  font-size: 12px;
  font-weight: 600;
}

.permission-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.permission-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  padding: 4px 0;
}

.permission-icon {
  font-size: 10px;
}

.permission-item.granted {
  color: #27ae60;
}

.loading-permissions {
  font-size: 11px;
  color: #95a5a6;
  font-style: italic;
  text-align: center;
  padding: 10px;
}

.testing-scenarios h5 {
  margin: 0 0 12px 0;
  font-size: 12px;
  font-weight: 600;
}

.scenario-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.scenario-item {
  background: #34495e;
  padding: 10px;
  border-radius: 4px;
  font-size: 11px;
}

.scenario-item strong {
  display: block;
  margin-bottom: 6px;
  color: #3498db;
}

.scenario-item ul {
  margin: 0;
  padding-left: 16px;
}

.scenario-item li {
  margin: 2px 0;
  font-size: 10px;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.reset-btn, .refresh-btn {
  flex: 1;
  background: #e74c3c;
  color: white;
  border: none;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  transition: background-color 0.2s;
}

.reset-btn:hover {
  background: #c0392b;
}

.refresh-btn {
  background: #f39c12;
}

.refresh-btn:hover {
  background: #e67e22;
}

/* Role-specific colors */
.role-admin { color: #e74c3c; }
.role-administrator { color: #e74c3c; }
.role-administrator_504_CM { color: #e67e22; }
.role-sped_chair { color: #f39c12; }
.role-case_manager { color: #3498db; }
.role-paraeducator { color: #9b59b6; }
.role-teacher { color: #2ecc71; }
.role-service_provider { color: #1abc9c; }
</style> 