<template>
  <div>
    <h2>Edit Users</h2>
    
    <!-- Search Bar -->
    <div class="admin-form-row">
      <input 
        type="text" 
        v-model="searchTerm" 
        placeholder="Search by name or email"
        class="admin-search-input"
        @input="debouncedHandleSearch"
      />
      <div class="search-type-radios">
        <label>
          <input type="radio" v-model="searchType" value="name" @change="handleSearch">
          Name
        </label>
        <label>
          <input type="radio" v-model="searchType" value="email" @change="handleSearch">
          Email
        </label>
      </div>
      <button 
        v-if="canDeleteAllUsers" 
        @click="deleteAllUsers" 
        class="delete-all-btn"
      >
        <Trash2 :size="16" />
        Delete All Users
      </button>
    </div>

    <!-- Status Message -->
    <div v-if="statusMessage" :class="['admin-status-msg', { error: isError }]">
      {{ statusMessage }}
    </div>

    <!-- Users Table -->
    <div>
      <table class="user-admin-table striped">
        <thead>
          <tr>
            <th>Name</th>
            <th>Testing Access</th>
            <th>Email</th>
            <th>Role</th>
            <th>Provider Type</th>
            
            <th style="text-align:center;">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="users.length === 0">
            <td colspan="6">No users found.</td>
          </tr>
          <tr 
            v-for="user in users" 
            :key="user.id"
            :class="{ 'active-row': activeRowId === user.id }"
            :data-userid="user.id"
          >
            <td>
              <input 
                type="text" 
                :value="user.name || ''" 
                class="editable-input"
                :disabled="activeRowId !== user.id"
                @input="updateUserField(user.id, 'name', $event.target.value)"
              />
            </td>
                <!-- Testing Access Column -->
                <td>
              <!-- Full Access Roles: Show read-only checkmark (always have access) -->
              <span v-if="hasFullReadAccess(user.role)" class="testing-access-full" title="Full access role - always has testing access">
                <Check :size="16" class="check-icon" />
                Always
              </span>
              <!-- Limited Roles: Show editable dropdown when editing -->
              <select 
                v-else-if="activeRowId === user.id"
                class="editable-select"
                :value="editingUser.testingAccess ? 'true' : 'false'"
                @change="updateUserField(user.id, 'testingAccess', $event.target.value === 'true')"
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
              <!-- Limited Roles: Show badge when not editing -->
              <span v-else class="testing-access-badge" :class="{ active: user.testingAccess }">
                {{ user.testingAccess ? 'Yes' : 'No' }}
              </span>
            </td>
            <td>{{ user.email }}</td>
            <td>
              <select 
                class="editable-select"
                :disabled="activeRowId !== user.id"
                :value="activeRowId === user.id ? editingUser.role : user.role"
                @change="updateUserField(user.id, 'role', $event.target.value)"
              >
                <option v-for="role in validRoles" :key="role" :value="role">
                  {{ role.replace(/_/g, ' ') }}
                </option>
              </select>
            </td>
            <td v-if="providersLoaded">
              <span v-if="activeRowId !== user.id">
                {{ getProviderLabel(user.provider) || '—' }}
              </span>
              <span v-else>
                <select 
                  :value="editingUser.provider || ''"
                  @change="updateUserField(user.id, 'provider', $event.target.value)"
                >
                  <option value="">None</option>
                  <option v-for="abbr in serviceProviders" :key="abbr" :value="abbr">
                    {{ getProviderLabel(abbr) }}
                  </option>
                </select>
              </span>
            </td>
            <td v-else>
              <span>Loading...</span>
            </td>
        
            <td class="admin-action-btns">
              <!-- View Mode -->
              <template v-if="activeRowId !== user.id">
                <button @click="startEdit(user.id)" class="admin-action-btn edit" title="Edit">
                  <Edit :size="16" />
                </button>
              </template>
              <!-- Edit Mode -->
              <template v-else>
                <button @click="saveUser(user.id)" class="admin-action-btn save" title="Save">
                  <Save :size="16" />
                </button>
                <button @click="cancelEdit" class="admin-action-btn cancel" title="Cancel">
                  <X :size="16" />
                </button>
                <button @click="deleteUser(user.id)" class="admin-action-btn delete red" title="Delete User">
                  <Trash2 :size="16" />
                </button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="admin-pagination">
      <button 
        @click="loadPreviousPage" 
        :disabled="currentPage === 1"
        class="admin-btn"
      >
        <ChevronLeft :size="16" />
        Previous
      </button>
      <span>Page {{ currentPage }}</span>
      <button 
        @click="loadNextPage" 
        :disabled="!hasNextPage"
        class="admin-btn"
      >
        Next
        <ChevronRight :size="16" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore'
import { VALID_ROLES } from '../config/roles.js'
import { useAppSettings } from '@/composables/useAppSettings'
import { useAdminPanelPermissions } from '@/composables/useAdminPanelPermissions'
import { auditLogger } from '@/utils/auditLogger'
import { Edit, Save, X, Trash2, ChevronLeft, ChevronRight, Check } from 'lucide-vue-next'

const PAGE_SIZE = 20

const db = getFirestore()

const users = ref([])
const currentPage = ref(1)
const searchType = ref('name')
const searchTerm = ref('')
const activeRowId = ref(null)
const statusMessage = ref('')
const isError = ref(false)
const hasNextPage = ref(false)
const usersPageDocs = ref([])
const editingUser = ref(null)

const validRoles = VALID_ROLES
const appSettingsComposable = useAppSettings()
const appSettings = appSettingsComposable.appSettings
const loadAppSettings = appSettingsComposable.loadAppSettings

// Admin panel permissions
const { canDeleteAllUsers, initializeIfNeeded } = useAdminPanelPermissions()

// Debounced search implementation
let debounceTimer = null
const debouncedHandleSearch = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    handleSearch()
  }, 300) // 300ms delay to prevent rapid API calls
}

const providersLoaded = computed(() =>
  Array.isArray(appSettings.value?.serviceProviders) && appSettings.value.serviceProviders.length > 0
)

const serviceProviders = computed(() => {
  return appSettings.value?.serviceProviders || []
})

// Check if user role has full read access (matches Firestore rules logic)
const hasFullReadAccess = (userRole) => {
  const fullAccessRoles = ['admin', 'school_admin', 'staff_view', 'staff_edit', 'admin_504', 'sped_chair']
  return fullAccessRoles.includes(userRole)
}

const showStatus = (message, error = false) => {
  statusMessage.value = message
  isError.value = error
  if (message) {
    setTimeout(() => {
      statusMessage.value = ''
      isError.value = false
    }, 5000) // Increased to 5 seconds for better visibility
  }
}

const handleSearch = () => {
  currentPage.value = 1
  fetchUsers()
}

const fetchUsers = async (pageDirection = 'first') => {
  const usersRef = collection(db, 'users')
  let q

  // Client-side name search
  if (searchTerm.value && searchType.value === 'name') {
    const snapAll = await getDocs(query(usersRef, orderBy('name'), limit(1000)))
    const filtered = snapAll.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(u => (u.name || '').toLowerCase().includes(searchTerm.value.toLowerCase()))
    activeRowId.value = null
    users.value = filtered
    hasNextPage.value = false
    return
  }

  // Email or default search
  if (searchTerm.value && searchType.value === 'email') {
    q = query(
      usersRef,
      orderBy('email'),
      where('email', '>=', searchTerm.value),
      where('email', '<=', searchTerm.value + '\uf8ff'),
      limit(PAGE_SIZE)
    )
  } else if (!searchTerm.value) {
    q = query(usersRef, orderBy('name'), limit(PAGE_SIZE))
  } else {
    q = query(
      usersRef,
      orderBy('name'),
      where('name', '>=', searchTerm.value),
      where('name', '<=', searchTerm.value + '\uf8ff'),
      limit(PAGE_SIZE)
    )
  }

  // Cursor-based paging
  if (pageDirection === 'next' && usersPageDocs.value.length) {
    q = query(
      usersRef,
      orderBy(searchType.value),
      startAfter(usersPageDocs.value[usersPageDocs.value.length - 1]),
      limit(PAGE_SIZE)
    )
  }

  const snap = await getDocs(q)
  usersPageDocs.value = snap.docs
  activeRowId.value = null
  users.value = usersPageDocs.value.map(d => ({ id: d.id, ...d.data() }))
  hasNextPage.value = snap.size === PAGE_SIZE
}

const startEdit = (userId) => {
  if (activeRowId.value) return
  activeRowId.value = userId
  const user = users.value.find(u => u.id === userId)
  editingUser.value = { 
    ...user,
    testingAccess: user.testingAccess || false
  }
}

const cancelEdit = () => {
  activeRowId.value = null
  editingUser.value = null
  fetchUsers()
}

const updateUserField = (userId, field, value) => {
  if (editingUser.value && editingUser.value.id === userId) {
    editingUser.value[field] = value
  }
}

const saveUser = async (userId) => {
  if (!editingUser.value || editingUser.value.id !== userId) return

  try {
    // Get original user data for logging
    const originalUser = users.value.find(u => u.id === userId)
    
    // Filter out undefined values and prepare the update data
    const updateData = {}
    if (editingUser.value.name !== undefined) updateData.name = editingUser.value.name?.trim() || null
    if (editingUser.value.title !== undefined) updateData.title = editingUser.value.title?.trim() || null
    if (editingUser.value.role !== undefined) updateData.role = editingUser.value.role
    if (editingUser.value.provider !== undefined) updateData.provider = editingUser.value.provider || null
    if (editingUser.value.testingAccess !== undefined) updateData.testingAccess = editingUser.value.testingAccess

    await updateDoc(doc(db, 'users', userId), updateData)
    
    // Log user update
    await auditLogger.logUserManagement(userId, 'update', {
      originalData: {
        name: originalUser?.name,
        title: originalUser?.title,
        role: originalUser?.role,
        provider: originalUser?.provider,
        testingAccess: originalUser?.testingAccess
      },
      updatedData: updateData,
      changedFields: Object.keys(updateData)
    })
    
    showStatus('✅ User updated.')
    activeRowId.value = null
    editingUser.value = null
    fetchUsers()
  } catch (error) {
    console.error('Error updating user:', error)
    showStatus(`❌ Error updating user: ${error.message}`, true)
    
    // Log update failure
    await auditLogger.logUserManagement(userId, 'update_failed', {
      error: error.message,
      attemptedData: updateData
    })
  }
}

const deleteUser = async (userId) => {
  if (!confirm('Are you sure you want to delete this user?')) return

  try {
    // Get user data before deletion for logging
    const userToDelete = users.value.find(u => u.id === userId)
    
    await deleteDoc(doc(db, 'users', userId))
    
    // Log user deletion
    await auditLogger.logUserManagement(userId, 'delete', {
      deletedUser: {
        name: userToDelete?.name,
        email: userToDelete?.email,
        role: userToDelete?.role,
        provider: userToDelete?.provider
      }
    })
    
    showStatus('✅ User deleted.')
    activeRowId.value = null
    editingUser.value = null
    fetchUsers()
  } catch (error) {
    console.error('Error deleting user:', error)
    showStatus(`❌ Error deleting user: ${error.message}`, true)
    
    // Log deletion failure
    await auditLogger.logUserManagement(userId, 'delete_failed', {
      error: error.message
    })
  }
}

const deleteAllUsers = async () => {
  const confirmation = prompt('Type DELETE ALL USERS to confirm:')
  if (confirmation !== 'DELETE ALL USERS') return

  try {
    const snapAll = await getDocs(collection(db, 'users'))
    await Promise.all(snapAll.docs.map(d => deleteDoc(doc(db, 'users', d.id))))
    showStatus('✅ All users deleted.')
    currentPage.value = 1
    fetchUsers()
  } catch (error) {
    console.error('Error deleting all users:', error)
    showStatus(`❌ Error deleting all users: ${error.message}`, true)
  }
}

const loadNextPage = () => {
  currentPage.value++
  fetchUsers('next')
}

const loadPreviousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
    fetchUsers()
  }
}

const getProviderLabel = (abbr) => {
  if (!abbr) return ''
  
  // Check custom service providers first
  const customServiceProviders = appSettings.value?.customServiceProviders || []
  const customFound = customServiceProviders.find(p => p.abbreviation === abbr)
  if (customFound) {
    return `${customFound.name} (${customFound.abbreviation})`
  }
  
  // Default service providers list (matching AppSettings.vue)
  const defaultList = [
    { name: 'Speech-Language Therapy', abbreviation: 'SLP' },
    { name: 'Occupational Therapy', abbreviation: 'OT' },
    { name: 'Physical Therapy', abbreviation: 'PT' },
    { name: 'School Counseling', abbreviation: 'SC' },
    { name: 'School-Based Mental Health Services', abbreviation: 'MH' },
    { name: 'Transportation', abbreviation: 'TR' },
    { name: 'Audiology Services', abbreviation: 'AUD' },
    { name: 'Vision Services', abbreviation: 'VI' },
    { name: 'Assistive Technology', abbreviation: 'AT' },
    { name: 'Deaf and Hard of Hearing Services', abbreviation: 'DHH' },
    { name: 'Orientation and Mobility', abbreviation: 'O&M' },
    { name: 'Behavioral Intervention Services', abbreviation: 'BIS' },
    { name: 'Health/Nursing Services', abbreviation: 'HN' },
    { name: 'Social Work Services', abbreviation: 'SW' }
  ]
  const found = defaultList.find(p => p.abbreviation === abbr)
  return found ? `${found.name} (${found.abbreviation})` : abbr
}

onMounted(async () => {
  await loadAppSettings()
  await initializeIfNeeded()
  fetchUsers()
})

// Cleanup on unmount
onUnmounted(() => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
})
</script>

<style scoped>
/* =====================
   UNIFIED ADMIN TABLE SYSTEM
   ===================== */

/* Admin Form Controls */
.admin-form-row {
  display: flex;
  align-items: center;
  gap: 1em;
  margin-bottom: 1em;
  flex-wrap: wrap;
}

.admin-search-input {
  padding: 0.5em;
  font-size: 0.9em;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 250px;
  max-width: 100%;
}

/* Radio Button Styling */
.search-type-radios {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.search-type-radios label {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.9rem;
  cursor: pointer;
  color: #495057;
}

.search-type-radios input[type="radio"] {
  margin: 0;
  cursor: pointer;
}

.delete-all-btn {
  margin-left: auto;
  background: #f44336;
  color: #fff;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background 0.15s;
}

.delete-all-btn:hover {
  background: #d32f2f;
}

/* Status Messages */
.admin-status-msg {
  padding: 0.75rem;
  margin-bottom: 1rem;
  border-radius: 4px;
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.admin-status-msg.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

/* Main Table */
.user-admin-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.9rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 1rem;
}

/* Table Headers */
.user-admin-table thead th {
  background: #f8f9fa;
  font-weight: 600;
  padding: 0.75rem 0.5rem;
  border-bottom: 2px solid #dee2e6;
  text-align: left;
  font-size: 0.85rem;
  color: #495057;
}

/* Table Cells */
.user-admin-table td {
  padding: 0.5rem;
  vertical-align: middle;
  border-bottom: 1px solid #eee;
}

/* Zebra Striping */
.user-admin-table.striped tr:nth-child(even) {
  background-color: #f9fbfd;
}

/* Column Widths - Optimized for user table content with more space for actions */
.user-admin-table th:nth-child(1), .user-admin-table td:nth-child(1) { width: 18%; } /* Name */
.user-admin-table th:nth-child(2), .user-admin-table td:nth-child(2) { width: 14%; } /* Title */
.user-admin-table th:nth-child(3), .user-admin-table td:nth-child(3) { width: 23%; } /* Email */
.user-admin-table th:nth-child(4), .user-admin-table td:nth-child(4) { width: 14%; } /* Role */
.user-admin-table th:nth-child(5), .user-admin-table td:nth-child(5) { width: 14%; } /* Provider Type */
.user-admin-table th:nth-child(6), .user-admin-table td:nth-child(6) { width: 17%; } /* Actions - More space */

/* Form Controls */
.editable-input, .editable-select {
  width: 100%;
  padding: 0.25rem 0.4rem;
  border: 1px solid #ced4da;
  border-radius: 3px;
  font-size: 0.85rem;
  background: #f8f9fa;
  color: #6c757d;
}

.editable-input:disabled, .editable-select:disabled {
  background: transparent;
  border: none;
  color: inherit;
  cursor: default;
}

/* Active Row Highlighting */
.user-admin-table tr.active-row {
  background-color: #e3f2fd !important;
  box-shadow: inset 0 0 0 2px #2196f3;
}

.user-admin-table tr.active-row .editable-input,
.user-admin-table tr.active-row .editable-select {
  border: 1px solid #2196f3;
  background: #fff;
  color: #212529;
  box-shadow: 0 0 0 2px rgba(33,150,243,0.2);
}

/* Action Buttons */
.admin-action-btns {
  text-align: center;
  padding: 0.5rem;
}

.admin-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  margin: 0 3px; /* Better spacing between buttons */
  padding: 0.25rem;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  background: #f8f9fa;
  color: #495057;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.15s ease;
  /* Ensure icons are visible */
  fill: currentColor;
  stroke: currentColor;
}

.admin-action-btn:hover {
  background: #e9ecef;
  border-color: #adb5bd;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.admin-action-btn.save {
  background: #28a745;
  border-color: #28a745;
  color: white;
  fill: currentColor;
  stroke: currentColor;
}

.admin-action-btn.save:hover {
  background: #218838;
  border-color: #1e7e34;
}

.admin-action-btn.cancel {
  background: #6c757d;
  border-color: #6c757d;
  color: white;
  fill: currentColor;
  stroke: currentColor;
}

.admin-action-btn.cancel:hover {
  background: #545b62;
  border-color: #545b62;
}

.admin-action-btn.delete.red {
  background: #dc3545;
  border-color: #dc3545;
  color: white;
  fill: currentColor;
  stroke: currentColor;
}

.admin-action-btn.delete.red:hover {
  background: #c82333;
  border-color: #bd2130;
}

.admin-action-btn.edit {
  background: #007bff;
  border-color: #007bff;
  color: white;
  fill: currentColor;
  stroke: currentColor;
}

.admin-action-btn.edit:hover {
  background: #0069d9;
  border-color: #0062cc;
}

/* Pagination */
.admin-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
  padding: 1rem;
}

.admin-btn {
  padding: 0.5rem 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.15s;
}

.admin-btn:hover:not(:disabled) {
  background: #0069d9;
}

.admin-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
}

/* Testing Access Styles */
.testing-access-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  background: #f8f9fa;
  color: #6c757d;
  border: 1px solid #dee2e6;
}

.testing-access-badge.active {
  background: #d4edda;
  color: #155724;
  border-color: #c3e6cb;
}

.testing-access-full {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: #28a745;
  font-weight: 500;
  font-size: 0.8rem;
}

.testing-access-full .check-icon {
  color: #28a745;
}
</style>
