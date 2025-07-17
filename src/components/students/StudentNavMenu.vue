<template>
  <div class="student-nav-menu">
    <!-- Hamburger Menu Button -->
    <button 
      @click="toggleMenu" 
      class="hamburger-btn"
      :class="{ 'active': isMenuOpen }"
      :title="isMenuOpen ? 'Close Menu' : 'Open Menu'"
    >
      <span class="hamburger-line"></span>
      <span class="hamburger-line"></span>
      <span class="hamburger-line"></span>
    </button>

    <!-- Navigation Menu Overlay -->
    <div 
      v-if="isMenuOpen" 
      class="nav-overlay"
      @click="closeMenu"
    ></div>

    <!-- Navigation Menu Panel -->
    <div 
      class="nav-panel"
      :class="{ 'open': isMenuOpen }"
    >
      <div class="nav-header">
        <h3>Student Management</h3>
        <button @click="closeMenu" class="close-btn">×</button>
      </div>

      <div class="nav-content">
        <!-- Main Actions Section -->
        <div class="nav-section">
          <h4>Actions</h4>
          <div class="nav-buttons">
            <button @click="handleAction('add-student')" class="nav-btn primary">
              <span>➕</span> Add Student
            </button>
            <button @click="handleAction('export')" class="nav-btn">
              <span>📊</span> Export
            </button>
            <button @click="handleAction('print')" class="nav-btn print-btn">
              <span>🖨️</span> Print
            </button>
          </div>
        </div>

        <!-- Admin Actions Section -->
        <div v-if="isAdmin" class="nav-section">
          <h4>Admin</h4>
          <div class="nav-buttons">
            <button @click="handleAction('admin')" class="nav-btn">
              <span>⚙️</span> Admin Panel
            </button>
            <button @click="handleAction('testing')" class="nav-btn">
              <span>🧪</span> Testing
            </button>
          </div>
        </div>

        <!-- Debug Section (Development Only) -->
        <div v-if="canShowDebugMenu" class="nav-section">
          <h4>Debug</h4>
          <div class="nav-buttons">
            <button @click="toggleDebugMenu" class="nav-btn secondary">
              <span>🔧</span> {{ isDebugMenuVisible ? 'Hide' : 'Show' }} Debug Menu
            </button>
          </div>
        </div>

        <!-- Paraeducator Actions Section -->
        <div v-if="currentUser?.role === 'paraeducator'" class="nav-section">
          <h4>Schedule</h4>
          <div class="nav-buttons">
            <button @click="handleAction('aide-schedule')" class="nav-btn">
              <span>📅</span> My Schedule
            </button>
          </div>
        </div>



        <!-- User Section -->
        <div class="nav-section">
          <h4>User</h4>
          <div class="user-info">
            <div class="user-details">
              <strong>{{ currentUser?.name || currentUser?.email || 'User' }}</strong>
              <span v-if="currentUser?.role" class="user-role">({{ currentUser.role }})</span>
            </div>
            <button @click="handleAction('logout')" class="nav-btn danger">
              <span>🚪</span> Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useDebugMenu } from '@/composables/useDebugMenu'

const props = defineProps({
  currentUser: {
    type: Object,
    default: null
  },
  isAdmin: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['action'])

const { isDebugMenuVisible, canShowDebugMenu, toggleDebugMenu } = useDebugMenu()
const isMenuOpen = ref(false)

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value
}

function closeMenu() {
  isMenuOpen.value = false
}

function handleAction(action) {
  emit('action', action)
  closeMenu()
}


</script>

<style scoped>
.student-nav-menu {
  position: relative;
}

/* Hamburger Button */
.hamburger-btn {
  position: fixed;
  top: 15px;
  right: 15px;
  z-index: 1001;
  width: 45px;
  height: 45px;
  border: none;
  border-radius: 50%;
  background: #007bff;
  color: white;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 3px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
}

.hamburger-btn:hover {
  background: #0056b3;
  transform: scale(1.05);
}

.hamburger-btn.active {
  background: #dc3545;
}

.hamburger-line {
  width: 18px;
  height: 2px;
  background: white;
  transition: all 0.3s ease;
}

.hamburger-btn.active .hamburger-line:nth-child(1) {
  transform: rotate(45deg) translate(5px, 5px);
}

.hamburger-btn.active .hamburger-line:nth-child(2) {
  opacity: 0;
}

.hamburger-btn.active .hamburger-line:nth-child(3) {
  transform: rotate(-45deg) translate(7px, -6px);
}

/* Overlay */
.nav-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  backdrop-filter: blur(2px);
}

/* Navigation Panel */
.nav-panel {
  position: fixed;
  top: 0;
  right: -400px;
  width: 400px;
  height: 100vh;
  background: white;
  z-index: 1000;
  transition: right 0.3s ease;
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.15);
  overflow-y: auto;
}

.nav-panel.open {
  right: 0;
}

/* Navigation Header */
.nav-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  background: #f8f9fa;
}

.nav-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.2rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #666;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s;
}

.close-btn:hover {
  background: #e9ecef;
}

/* Navigation Content */
.nav-content {
  padding: 20px;
}

.nav-section {
  margin-bottom: 30px;
}

.nav-section h4 {
  margin: 0 0 15px 0;
  color: #495057;
  font-size: 1rem;
  font-weight: 600;
  border-bottom: 2px solid #e9ecef;
  padding-bottom: 8px;
}

.nav-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  background: white;
  color: #495057;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;
  text-align: left;
}

.nav-btn:hover {
  background: #f8f9fa;
  border-color: #adb5bd;
}

.nav-btn.primary {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.nav-btn.primary:hover {
  background: #0056b3;
  border-color: #0056b3;
}

.nav-btn.secondary {
  background: #6c757d;
  color: white;
  border-color: #6c757d;
}

.nav-btn.secondary:hover {
  background: #545b62;
  border-color: #545b62;
}

.nav-btn.danger {
  background: #dc3545;
  color: white;
  border-color: #dc3545;
}

.nav-btn.danger:hover {
  background: #c82333;
  border-color: #c82333;
}

.print-btn {
  background: #28a745 !important;
  color: white !important;
  border-color: #28a745 !important;
}

.print-btn:hover {
  background: #218838 !important;
}


/* User Info */
.user-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-role {
  font-size: 0.8rem;
  color: #6c757d;
  font-style: italic;
}

/* Responsive Design */
@media (max-width: 768px) {
  .nav-panel {
    width: 100vw;
    right: -100vw;
  }
  
  .hamburger-btn {
    top: 15px;
    right: 15px;
    width: 45px;
    height: 45px;
  }
  
  .hamburger-line {
    width: 18px;
  }
}
</style> 