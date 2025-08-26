// src/composables/useTestingAccommodations.js
// Composable for accessing secure testing accommodations data

import { ref, computed, readonly } from 'vue'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/firebase.js'
import { useAuthStore } from '@/store/authStore.js'

/**
 * Composable for secure testing accommodations access
 * Only users with testingAccess: true can fetch data from testingAccommodations collection
 */
export function useTestingAccommodations() {
  const authStore = useAuthStore()
  const testingData = ref([])
  const loading = ref(false)
  const error = ref(null)
  
  // Check if current user has testing access
  const hasTestingAccess = computed(() => {
    const access = authStore.currentUser?.testingAccess === true
    console.log('🔍 Testing Access Check: hasTestingAccess =', access, 'user:', authStore.currentUser)
    return access
  })
  
  // Fetch testing accommodations data
  const fetchTestingData = async () => {
    if (!hasTestingAccess.value) {
      console.warn('🚫 Testing Access: User does not have testing access permission')
      return []
    }
    
    loading.value = true
    error.value = null
    
    try {
      console.log('🔍 Testing Access: Fetching testing accommodations data')
      
      // Get all documents from testing collection (they all should have separateSetting: true by design)
      const q = query(collection(db, 'testingAccommodations'))
      
      const snapshot = await getDocs(q)
      testingData.value = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => {
        // Sort by lastName in JavaScript instead of Firestore
        const lastNameA = a.lastName || ''
        const lastNameB = b.lastName || ''
        return lastNameA.localeCompare(lastNameB)
      })
      
      console.log(`✅ Testing Access: Loaded ${testingData.value.length} testing students`)
      return testingData.value
      
    } catch (err) {
      console.error('❌ Testing Access Error:', err)
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }
  
  // Clear testing data
  const clearTestingData = () => {
    testingData.value = []
    error.value = null
  }
  
  return {
    // Data
    testingData: readonly(testingData),
    loading: readonly(loading),
    error: readonly(error),
    
    // Computed
    hasTestingAccess,
    
    // Methods
    fetchTestingData,
    clearTestingData
  }
}
