// /Users/rd/CaseManageVue/src/composables/useStudents.js

import { ref } from 'vue'
import { collection, getDocs, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'
import { performRateLimitedBatchOperation } from '../utils/validation'
import { useGoogleSheetsRealtime } from './useGoogleSheetsRealtime'

// Helper function to convert Firestore Maps to plain objects
function convertFirestoreMaps(obj) {
  if (!obj || typeof obj !== 'object') return obj
  
  // If it's a Firestore Map, convert to plain object
  if (obj.toJSON && typeof obj.toJSON === 'function') {
    return obj.toJSON()
  }
  
  // If it's an array, convert each element
  if (Array.isArray(obj)) {
    return obj.map(convertFirestoreMaps)
  }
  
  // If it's a plain object, convert each property
  const result = {}
  for (const [key, value] of Object.entries(obj)) {
    // If this is a schedule map with teacherId, force teacherId to string
    if (key.toLowerCase().includes('schedule') && typeof value === 'object' && value !== null) {
      for (const [period, schedVal] of Object.entries(value)) {
        if (schedVal && typeof schedVal === 'object' && schedVal.teacherId !== undefined) {
          value[period].teacherId = String(schedVal.teacherId)
        }
      }
    }
    result[key] = convertFirestoreMaps(value)
  }
  return result
}

export default function useStudents() {
  const students = ref([])
  const googleSheetsSync = useGoogleSheetsRealtime()

  // Eagerly created Google Sheets sync; this just returns it
  async function getGoogleSheetsSync() {
    return googleSheetsSync
  }

  async function fetchStudents() {
    const studentSnap = await getDocs(collection(db, 'students'))
    students.value = studentSnap.docs.map(doc => {
      const data = doc.data()
      // Convert any Firestore Maps to plain objects
      const convertedData = convertFirestoreMaps(data)
      return { id: doc.id, ...convertedData }
    })
    
    // Debug: Log the first student with aeries data to see the structure
    const studentWithAeries = students.value.find(s => s.aeries)
    if (studentWithAeries) {
      console.log('🔍 useStudents DEBUG - Student with aeries:', studentWithAeries)
      console.log('🔍 useStudents DEBUG - aeries.schedule:', studentWithAeries.aeries?.schedule)
      console.log('🔍 useStudents DEBUG - aeries.schedule type:', typeof studentWithAeries.aeries?.schedule)
      if (studentWithAeries.aeries?.schedule) {
        console.log('🔍 useStudents DEBUG - schedule keys:', Object.keys(studentWithAeries.aeries.schedule))
      }
    }
  }

  // Function to set students from external source (for role-based loading)
  function setStudents(studentArray) {
    students.value = studentArray.map(student => {
      // Convert any Firestore Maps to plain objects
      const convertedData = convertFirestoreMaps(student)
      return { id: student.id, ...convertedData }
    })
  }

  // Admin functions
  async function fetchAllStudents() {
    const studentSnap = await getDocs(collection(db, 'students'))
    return studentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  }

  async function updateStudent(id, updates) {
    // Update in Firestore
    await updateDoc(doc(db, 'students', id), updates)
    
    // Trigger Google Sheets sync if linked
    try {
      const sync = await getGoogleSheetsSync()
      if (sync && sync.linkedSheetId.value) {
        // Update the local students array with the changes
        const studentIndex = students.value.findIndex(s => s.id === id)
        if (studentIndex !== -1) {
          students.value[studentIndex] = { ...students.value[studentIndex], ...updates }
        }
        
        // Sync to Google Sheets
        console.log('Syncing student update to Google Sheets...')
        await sync.updateSheetData(students.value)
      }
    } catch (error) {
      console.error('Failed to sync to Google Sheets:', error)
      // Don't throw - we don't want to fail the update if sync fails
    }
  }

  async function deleteStudent(id) {
    await deleteDoc(doc(db, 'students', id))
    
    // Trigger Google Sheets sync if linked
    try {
      const sync = await getGoogleSheetsSync()
      if (sync && sync.linkedSheetId.value) {
        // Remove from local array
        students.value = students.value.filter(s => s.id !== id)
        
        // Sync to Google Sheets
        console.log('Syncing student deletion to Google Sheets...')
        await sync.updateSheetData(students.value)
      }
    } catch (error) {
      console.error('Failed to sync to Google Sheets:', error)
    }
  }

  const deleteAllStudents = async () => {
    try {
      const studentSnap = await getDocs(collection(db, 'students'))
      const students = studentSnap.docs

      await performRateLimitedBatchOperation(
        students,
        async (batch) => {
          const batchOps = writeBatch(db)
          batch.forEach(doc => {
            batchOps.delete(doc.ref)
          })
          await batchOps.commit()
        },
        50,  // Process 50 documents per batch
        2000 // Wait 2 seconds between batches
      )

      return { success: true }
    } catch (error) {
      console.error('Error deleting all students:', error)
      throw error
    }
  }

  return { 
    students, 
    fetchStudents,
    setStudents,
    fetchAllStudents,
    updateStudent,
    deleteStudent,
    deleteAllStudents
  }
}