import { ref, computed, watch, reactive, onMounted } from 'vue'
import { doc, setDoc, addDoc, collection, serverTimestamp, deleteField } from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage, auth } from '@/firebase'
import { getDisplayValue } from '@/utils/studentUtils'
import { useAppSettings } from '@/composables/useAppSettings'
import { auditLogger } from '@/utils/auditLogger'
import { useAuthStore } from '@/store/authStore'
import { 
  validateStudentData, 
  sanitizeStudentFormData, 
  checkSecurityThreats,
  validateFile 
} from '@/utils/validation.js'

export function useStudentForm(props, emit) {
  // Load app settings
  const { appSettings, loadAppSettings, loading: appSettingsLoading, error: appSettingsError } = useAppSettings()
  
  // Auth store for current user info
  const authStore = useAuthStore()
  
  // Loading state
  const isSaving = ref(false)
  
  // Initialize app settings
  onMounted(async () => {
    try {
      console.log('useStudentForm: Starting to load app settings...')
      await loadAppSettings()
      console.log('useStudentForm: App settings loaded successfully:', appSettings.value)
    } catch (error) {
      console.error('useStudentForm: Error loading app settings:', error)
    }
  })

  // Dynamic periods from app settings - now returns numeric array
  const periods = computed(() => {
    const numPeriods = appSettings.value?.numPeriods || 7
    return Array.from({ length: numPeriods }, (_, i) => i + 1)
  })

  // Grades options from app settings
  const gradeOptions = computed(() => {
    if (appSettings.value?.grades && appSettings.value.grades.length > 0) {
      console.log('useStudentForm: Using app settings grades:', appSettings.value.grades)
      return appSettings.value.grades
    }
    console.log('useStudentForm: Using fallback grades: [7, 8]')
    return ['7', '8']
  })

  // Class services from app settings
  const availableClassServices = computed(() => {
    if (appSettings.value?.classServices && appSettings.value.classServices.length > 0) {
      const enabledServices = appSettings.value.classServices.filter(s => 
        s.enabledSubcategories && s.enabledSubcategories.length > 0
      )
      console.log('useStudentForm: Available class services:', enabledServices.length, 'services')
      return enabledServices
    }
    console.log('useStudentForm: No class services available')
    return []
  })

  // Service providers from app settings
  const serviceProviders = computed(() => {
    if (appSettings.value?.serviceProviders && appSettings.value.serviceProviders.length > 0) {
      console.log('useStudentForm: Using app settings service providers:', appSettings.value.serviceProviders.length, 'providers')
      return appSettings.value.serviceProviders
    }
    console.log('useStudentForm: No service providers configured in app settings')
    return []
  })

  const customServiceProviders = computed(() => {
    if (appSettings.value?.customServiceProviders) {
      return appSettings.value.customServiceProviders
    }
    return []
  })

  // User roles structure
  const userRoles = computed(() => {
    let roles = props.users.userRoles ? props.users.userRoles : {
      teachers: props.users.teachers || [],
      caseManagers: props.users.caseManagers || [],
      speech: props.users.speech || [],
      ot: props.users.ot || [],
      mh: props.users.mh || []
    }
    
    // Force all teacher IDs to strings
    if (roles.teachers) {
      roles = {
        ...roles,
        teachers: roles.teachers.map(t => ({ ...t, id: String(t.id) }))
      }
    }
    return roles
  })

  // Form state initialization
  const initializeFormData = (student) => {
    return {
      ssid: getDisplayValue(student, 'ssid') || student.id || '',
      firstName: getDisplayValue(student, 'firstName') || '',
      lastName: getDisplayValue(student, 'lastName') || '',
      grade: getDisplayValue(student, 'grade') || '7',
      plan: getDisplayValue(student, 'plan') || 'IEP',
      reviewDate: getDisplayValue(student, 'reviewDate') || '',
      reevalDate: getDisplayValue(student, 'reevalDate') || '',
      meetingDate: getDisplayValue(student, 'meetingDate') || '',
      caseManagerId: getDisplayValue(student, 'caseManagerId') || student.caseManagerId || student.casemanager_id || '',
      schedule: student.app?.schedule?.periods || student.aeries?.schedule?.periods || student.schedule || {},
      services: (student.app?.schedule?.classServices || student.services) || [],
      speechId: student.app?.providers?.speechId || student.speechId || student.speech_id || '',
      otId: student.app?.providers?.otId || student.otId || student.ot_id || '',
      mhId: student.app?.providers?.mhId || student.mhId || student.mh_id || '',
      ptId: student.app?.providers?.ptId || student.ptId || student.pt_id || '',
      scId: student.app?.providers?.scId || student.scId || student.sc_id || '',
      trId: student.app?.providers?.trId || student.trId || student.tr_id || '',
      audId: student.app?.providers?.audId || student.audId || student.aud_id || '',
      viId: student.app?.providers?.viId || student.viId || student.vi_id || '',
      atId: student.app?.providers?.atId || student.atId || student.at_id || '',
      dhhId: student.app?.providers?.dhhId || student.dhhId || student.dhh_id || '',
      omId: student.app?.providers?.omId || student.omId || student.om_id || '',
      bisId: student.app?.providers?.bisId || student.bisId || student.bis_id || '',
      hnId: student.app?.providers?.hnId || student.hnId || student.hn_id || '',
      swId: student.app?.providers?.swId || student.swId || student.sw_id || '',
      instruction: getDisplayValue(student, 'instruction') || '',
      assessment: getDisplayValue(student, 'assessment') || '',
      flag1: student.app?.flags?.flag1 || student.flag1 || false,
      flag2: student.app?.flags?.flag2 || student.flag2 || false,
      // Initialize app structure for custom flags
      app: {
        flags: {
          customFlags: student.app?.flags?.customFlags || []
        }
      },
      ataglancePdfUrl: student.app?.documents?.ataglancePdfUrl || student.ataglancePdfUrl || student.ataglance_pdf_url || '',
      bipPdfUrl: student.app?.documents?.bipPdfUrl || student.bipPdfUrl || student.bip_pdf_url || '',
      ataglanceFileName: student.app?.documents?.ataglanceFileName || student.ataglanceFileName || '',
      bipFileName: student.app?.documents?.bipFileName || student.bipFileName || '',
      bipFile: null,
      ataglanceFile: null,
      removeBipFile: false,
      removeAtaglanceFile: false,
      additionalDocuments: student.app?.documents?.additionalDocuments || []
    }
  }

  // Form state - reactive object
  const form = reactive(initializeFormData(props.student || {}))

  // Function to extract co-teaching services from schedule
  const extractCoTeachingServices = (schedule) => {
    const coTeachingServices = []
    if (schedule && typeof schedule === 'object') {
      Object.entries(schedule).forEach(([period, periodData]) => {
        if (periodData && typeof periodData === 'object' && periodData.coTeaching) {
          const subject = periodData.coTeaching.subject
          if (subject) {
            coTeachingServices.push(`Co-teach: ${subject}`)
          }
        }
      })
    }
    return coTeachingServices
  }

  // Function to sync co-teaching services with schedule
  const syncCoTeachingServices = () => {
    const coTeachingServices = extractCoTeachingServices(form.schedule)
    
    // Remove existing co-teaching services from form.services
    const nonCoTeachingServices = form.services.filter(service => 
      !service.startsWith('Co-teach:')
    )
    
    // Add current co-teaching services
    form.services = [...nonCoTeachingServices, ...coTeachingServices]
  }

  // Watch for changes in schedule to auto-sync co-teaching services
  watch(() => form.schedule, () => {
    syncCoTeachingServices()
  }, { deep: true })

  // Watch for changes in student prop and update form
  // Watch for both ID changes and when student data is first loaded
  watch(() => props.student, (newStudent, oldStudent) => {
    if (newStudent && Object.keys(newStudent).length > 0) {
      // Only update if this is a new student or if the student ID changed
      const isNewStudent = !oldStudent || Object.keys(oldStudent).length === 0
      const isStudentChanged = newStudent.id !== oldStudent?.id
      
      if (isNewStudent || isStudentChanged) {
        console.log('🔍 useStudentForm DEBUG - Student data changed, updating form:', newStudent.id)
        console.log('🔍 useStudentForm DEBUG - Student data:', {
          firstName: getDisplayValue(newStudent, 'firstName'),
          lastName: getDisplayValue(newStudent, 'lastName'),
          plan: getDisplayValue(newStudent, 'plan'),
          caseManagerId: getDisplayValue(newStudent, 'caseManagerId'),
          rawStudent: newStudent
        })
        
        // Update form with new student data
        const newFormData = initializeFormData(newStudent)
        Object.assign(form, newFormData)
        
        // Sync co-teaching services after form initialization
        syncCoTeachingServices()
        
        console.log('🔍 useStudentForm DEBUG - Form updated:', {
          plan: form.plan,
          caseManagerId: form.caseManagerId,
          firstName: form.firstName,
          lastName: form.lastName
        })
      }
    }
  }, { immediate: true, deep: true })

  // Watch for app settings changes and update form accordingly
  watch(() => appSettings.value, (newSettings) => {
    console.log('useStudentForm: App settings watcher triggered:', newSettings)
    
    // Update grade if app settings has grades and current grade is not in the list
    if (newSettings?.grades && newSettings.grades.length > 0) {
      if (!newSettings.grades.includes(form.grade)) {
        form.grade = newSettings.grades[0] || '7'
      }
    }
  }, { immediate: true, deep: true })

  // File handling functions with validation
  const onFileChange = (event, key) => {
    const file = event.target.files[0] || null
    
    if (file) {
      // Validate file
      const fileValidation = validateFile(file, {
        allowedTypes: ['pdf'],
        maxSize: 10 * 1024 * 1024, // 10MB
        fieldName: key === 'bipFile' ? 'BIP Document' : 'At-A-Glance Document'
      })
      
      if (!fileValidation.isValid) {
        alert(fileValidation.error)
        event.target.value = '' // Clear the file input
        return
      }
      
      // Check for security threats in filename
      const securityCheck = checkSecurityThreats(file.name)
      if (!securityCheck.isSafe) {
        alert(`File name contains potentially dangerous content: ${securityCheck.threats.join(', ')}`)
        event.target.value = '' // Clear the file input
        return
      }
    }
    
    form[key] = file
  }

  const removeBipFile = (event) => {
    event.preventDefault()
    event.stopPropagation()
    form.removeBipFile = true
    form.bipFile = null
  }

  const removeAtaglanceFile = (event) => {
    event.preventDefault()
    event.stopPropagation()
    form.removeAtaglanceFile = true
    form.ataglanceFile = null
  }

  // Additional document management functions
  const addAdditionalDocument = (title) => {
    if (!title || title.trim().length === 0 || title.trim().length > 24) {
      throw new Error('Title must be between 1 and 24 characters')
    }
    
    const totalDocuments = 2 + form.additionalDocuments.length // BIP + At-A-Glance + additional
    if (totalDocuments >= 10) {
      throw new Error('Maximum of 10 documents allowed (including BIP and At-A-Glance)')
    }

    const newDoc = {
      id: crypto.randomUUID(),
      title: title.trim(),
      pdfUrl: '',
      fileName: '',
      toRemove: false
    }
    
    form.additionalDocuments.push(newDoc)
    return newDoc.id
  }

  const removeAdditionalDocument = (docId) => {
    const doc = form.additionalDocuments.find(d => d.id === docId)
    if (doc) {
      doc.toRemove = true
    }
  }

  const undoRemoveAdditionalDocument = (docId) => {
    const doc = form.additionalDocuments.find(d => d.id === docId)
    if (doc) {
      doc.toRemove = false
    }
  }

  const deleteAdditionalDocument = (docId) => {
    const index = form.additionalDocuments.findIndex(d => d.id === docId)
    if (index !== -1) {
      form.additionalDocuments.splice(index, 1)
    }
  }

  // File upload/delete utilities - SECURE VERSION
  const uploadFile = async (file, path) => {
    if (!file) return null
    const fileRef = storageRef(storage, path)
    const snapshot = await uploadBytes(fileRef, file)
    
    // Note: Firebase automatically creates download tokens on upload
    // These tokens bypass security rules and make files publicly accessible
    // We need a Cloud Function to remove these tokens server-side
    // For now, we return the file path and rely on the token removal script
    
    return path
  }

  const deleteFile = async (url) => {
    if (!url) return
    
    try {
      let filePath
      
      // Check if it's a URL or already a file path
      if (url.startsWith('http')) {
        try {
          // Extract the file path from the URL
          const urlObj = new URL(url)
          const pathSegments = urlObj.pathname.split('/')
          filePath = pathSegments.slice(pathSegments.indexOf('o') + 1).join('/')
          filePath = decodeURIComponent(filePath)
        } catch (urlError) {
          console.warn('Invalid URL format, treating as file path:', url)
          // If URL parsing fails, treat it as a file path
          filePath = url
        }
      } else {
        // It's already a file path
        filePath = url
      }
      
      // Delete from Firebase Storage
      const fileRef = storageRef(storage, filePath)
      await deleteObject(fileRef)
      console.log('File deleted successfully:', filePath)
    } catch (error) {
      // If file doesn't exist, that's okay - it's already deleted
      if (error.code === 'storage/object-not-found') {
        console.log('File already deleted or does not exist:', url)
        return // Don't throw error for non-existent files
      }
      
      console.error('Error deleting file:', error)
      throw error
    }
  }

  // Service provider utilities
  const providerFieldMap = {
    SLP: 'speechId',
    OT: 'otId',
    MH: 'mhId',
    PT: 'ptId',
    SC: 'scId',
    TR: 'trId',
    AUD: 'audId',
    VI: 'viId',
    AT: 'atId',
    DHH: 'dhhId',
    'O&M': 'omId',
    BIS: 'bisId',
    HN: 'hnId',
    SW: 'swId'
  }

  const DEFAULT_SERVICE_PROVIDERS = [
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

  const getProviderLabel = (abbr) => {
    // Try to find in App Settings first
    if (appSettings.value?.serviceProviders && Array.isArray(appSettings.value.serviceProviders)) {
      const found = (appSettings.value.serviceProvidersDetails || DEFAULT_SERVICE_PROVIDERS).find(s => s.abbreviation === abbr)
      if (found) return found.name + ' (' + abbr + ')'
    }
    // Fallback to default list
    const found = DEFAULT_SERVICE_PROVIDERS.find(s => s.abbreviation === abbr)
    return found ? found.name + ' (' + abbr + ')' : abbr
  }

  const getProviderUsers = (abbr) => {
    // Map provider abbreviations to user role keys
    const providerUserMap = {
      'SLP': 'speech',
      'OT': 'ot', 
      'MH': 'mh',
      'PT': 'pt',
      'SC': 'sc',
      'TR': 'tr',
      'AUD': 'aud',
      'VI': 'vi',
      'AT': 'at',
      'DHH': 'dhh',
      'O&M': 'om',
      'BIS': 'bis',
      'HN': 'hn',
      'SW': 'sw'
    }
    
    const userRoleKey = providerUserMap[abbr] || abbr.toLowerCase()
    return userRoles.value[userRoleKey] || []
  }

  // Enhanced form validation with security checks
  const validateForm = () => {
    // Sanitize form data first (works with flat structure)
    const sanitizedData = sanitizeStudentFormData(form)
    
    // Create nested structure for validateStudentData (which expects app.studentData)
    const validationData = {
      app: {
        studentData: {
          firstName: sanitizedData.firstName,
          lastName: sanitizedData.lastName,
          grade: sanitizedData.grade,
          plan: sanitizedData.plan,
          caseManagerId: sanitizedData.caseManagerId
        }
      }
    }
    
    // Comprehensive validation using the nested structure
    const validation = validateStudentData(validationData, { 
      isNew: props.mode === 'new' 
    })
    
    if (!validation.isValid) {
      alert(`Please fix the following errors:\n\n${validation.errors.join('\n')}`)
      return false
    }
    
    // Security threat detection for text fields
    const textFields = ['firstName', 'lastName', 'instruction', 'assessment']
    for (const field of textFields) {
      if (form[field]) {
        const securityCheck = checkSecurityThreats(form[field])
        if (!securityCheck.isSafe) {
          alert(`Security threat detected in ${field}: ${securityCheck.threats.join(', ')}`)
          return false
        }
      }
    }
    
    // Apply sanitized data back to form (flat structure)
    Object.assign(form, sanitizedData)
    
    return true
  }

  // Main submit handler
  const handleSubmit = async () => {
    try {
      // Prevent duplicate submissions
      if (isSaving.value) {
        console.log('Form submission already in progress, ignoring duplicate')
        return
      }
      
      console.log('🚀 Form submitted:', {
        plan: form.plan,
        caseManagerId: form.caseManagerId,
        firstName: form.firstName,
        lastName: form.lastName,
        mode: props.mode,
        studentId: props.student?.id
      })
      isSaving.value = true
      
      // Debug authentication and user info
      console.log('🔍 AUTH DEBUG - Current user:', {
        uid: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        claims: await auth.currentUser?.getIdTokenResult()
      })
      
      // Validate form
      if (!validateForm()) {
        isSaving.value = false
        return
      }
      
      // Compose services arrays
      const classServices = form.services.filter(s => s && s.includes(':'))
      
      // Compose schedule object
      const schedule = {}
      console.log('🔍 FORM SCHEDULE DEBUG - Complete form.schedule:', JSON.stringify(form.schedule, null, 2))
      console.log('🔍 FORM SCHEDULE DEBUG - periods.value:', periods.value)
      
      periods.value.forEach(p => {
        console.log(`🔍 FORM SCHEDULE DEBUG - Period ${p} exists:`, !!form.schedule[p], 'Value:', form.schedule[p])
        if (form.schedule[p]) {
          const periodData = form.schedule[p]
          console.log(`🔍 SCHEDULE DEBUG - Period ${p}:`, {
            type: typeof periodData,
            data: periodData,
            hasCoTeaching: !!(periodData && periodData.coTeaching),
            hasCaseManagerId: !!(periodData && periodData.coTeaching && periodData.coTeaching.caseManagerId)
          })
          
          // Preserve the exact structure from the form
          if (typeof periodData === 'string') {
            schedule[p] = periodData
          } else if (typeof periodData === 'object' && periodData !== null) {
            // Ensure co-teaching structure is preserved correctly
            if (periodData.coTeaching && periodData.coTeaching.caseManagerId) {
              console.log(`🔍 SCHEDULE DEBUG - Period ${p} has co-teaching, preserving structure`)
              schedule[p] = {
                teacherId: periodData.teacherId,
                coTeaching: {
                  caseManagerId: periodData.coTeaching.caseManagerId,
                  subject: periodData.coTeaching.subject || ''
                }
              }
            } else {
              console.log(`🔍 SCHEDULE DEBUG - Period ${p} converting to simple format`)
              // Convert legacy formats or handle malformed data
              schedule[p] = periodData.teacherId || String(periodData) || periodData
            }
          }
        } else {
          // IMPORTANT: Use Firebase deleteField() to properly remove deleted periods
          console.log(`🔍 SCHEDULE DEBUG - Period ${p} was deleted, using deleteField() for database removal`)
          schedule[p] = deleteField()
        }
      })
      
      console.log('🔍 Schedule Composition Debug:')
      console.log('Form schedule before:', JSON.stringify(form.schedule, null, 2))
      console.log('Composed schedule after:', JSON.stringify(schedule, null, 2))
      
      console.log('Composed data:', { classServices, schedule })
      
      // Handle secure PDF files - these are already uploaded by the secure system
      let bipPdfUrl = form.bipPdfUrl || null
      let ataglancePdfUrl = form.ataglancePdfUrl || null
      
      console.log('🔍 Form submission - PDF URLs:', {
        bipPdfUrl,
        ataglancePdfUrl,
        formBipPdfUrl: form.bipPdfUrl,
        formAtaglancePdfUrl: form.ataglancePdfUrl,
        bipFileName: form.bipFileName,
        ataglanceFileName: form.ataglanceFileName,
        bipFile: form.bipFile,
        ataglanceFile: form.ataglanceFile
      })
      
      // Handle BIP file removal
      if (form.removeBipFile) {
        console.log('Removing BIP file...')
        if (bipPdfUrl) {
          // For secure PDFs, we need to delete from the students storage
          try {
            // Delete from students storage
            const storageRef = ref(storage, `students/${props.student.id || 'temp'}/${bipPdfUrl}`)
            await deleteObject(storageRef)
            
            // Delete metadata from Firestore
            await deleteDoc(doc(db, 'pdfMetadata', bipPdfUrl))
            
            console.log('Secure BIP file deleted:', bipPdfUrl)
          } catch (error) {
            console.warn('Error deleting secure BIP file:', error)
            // Continue with save even if delete fails
          }
          bipPdfUrl = null
        }
      }
      
      // Handle At-A-Glance file removal
      if (form.removeAtaglanceFile) {
        console.log('Removing At-A-Glance file...')
        if (ataglancePdfUrl) {
          // For secure PDFs, we need to delete from the students storage
          try {
            // Delete from students storage
            const storageRef = ref(storage, `students/${props.student.id || 'temp'}/${ataglancePdfUrl}`)
            await deleteObject(storageRef)
            
            // Delete metadata from Firestore
            await deleteDoc(doc(db, 'pdfMetadata', ataglancePdfUrl))
            
            console.log('Secure At-A-Glance file deleted:', ataglancePdfUrl)
          } catch (error) {
            console.warn('Error deleting secure At-A-Glance file:', error)
            // Continue with save even if delete fails
          }
          ataglancePdfUrl = null
        }
      }
      
      // Compose payload - save to nested 'app' structure with categories
      const appData = {
        // Basic student information
        studentData: {
          firstName: form.firstName,
          lastName: form.lastName,
          grade: form.grade,
          plan: form.plan,
          caseManagerId: form.caseManagerId
        },
        
        // Important dates
        dates: {
          reviewDate: form.reviewDate,
          reevalDate: form.reevalDate,
          meetingDate: form.meetingDate
        },
        
        // Academic schedule and services
        schedule: {
          periods: schedule,
          classServices: classServices
        },
        
        // Service providers
        providers: {
          speechId: form.speechId,
          otId: form.otId,
          mhId: form.mhId,
          ptId: form.ptId,
          scId: form.scId,
          trId: form.trId,
          audId: form.audId,
          viId: form.viId,
          atId: form.atId,
          dhhId: form.dhhId,
          omId: form.omId,
          bisId: form.bisId,
          hnId: form.hnId,
          swId: form.swId
        },
        
        // Accommodations
        accommodations: {
          instruction: form.instruction,
          assessment: form.assessment
        },
        
        // Flags
        flags: {
          flag1: form.flag1,
          flag2: form.flag2,
          customFlags: form.app?.flags?.customFlags || []
        },
        
        // Documents - secure PDF references
        documents: {
          ataglancePdfUrl,
          bipPdfUrl,
          // Store original filenames for display
          bipFileName: form.bipFileName || null,
          ataglanceFileName: form.ataglanceFileName || null,
          // Additional documents (filtered to exclude removed ones)
          additionalDocuments: form.additionalDocuments
            .filter(doc => !doc.toRemove && doc.pdfUrl)
            .map(doc => ({
              id: doc.id,
              title: doc.title,
              pdfUrl: doc.pdfUrl,
              fileName: doc.fileName,
              uploadDate: doc.uploadDate || new Date().toISOString()
            }))
        }
      }
      
      console.log('📋 Documents being saved:', {
        ataglancePdfUrl,
        bipPdfUrl,
        bipFileName: form.bipFileName || null,
        ataglanceFileName: form.ataglanceFileName || null
      })
      
      console.log('Saving payload:', appData)
      
      // Create the full payload with nested structure
      const payload = {
        app: appData,
        updatedAt: serverTimestamp(),
        updatedBy: authStore.currentUser?.uid || null
      }
      
      console.log('Saving payload:', payload)
      
      // Save to Firestore
      let newStudentId = null
      
      if (props.mode === 'edit' && props.student.id) {
        console.log('Updating existing student:', props.student.id)
        // Update existing student with merge to preserve other data
        await setDoc(doc(db, 'students', props.student.id), payload, { merge: true })
        newStudentId = props.student.id
        console.log('Student updated successfully')
        
        // Log student update
        await auditLogger.logStudentAccess(props.student.id, 'edit', {
          fields: Object.keys(appData.studentData || {}),
          hasDocuments: !!(ataglancePdfUrl || bipPdfUrl),
          formMode: 'edit'
        })
        
      } else {
        console.log('Adding new student')
        // For new students, SSID is required
        if (!form.ssid || form.ssid.trim() === '') {
          alert('SSID is required for new students')
          return
        }
        
        const ssid = form.ssid.trim()
        
        // Add SSID to the payload for internal reference
        payload.app.studentData.ssid = ssid
        
        // Use Firebase auto-generated ID for security
        const docRef = doc(collection(db, 'students'))
        payload.createdAt = serverTimestamp()
        await setDoc(docRef, payload)
        newStudentId = docRef.id
        payload.id = newStudentId
        console.log('Student added successfully with ID:', newStudentId, 'SSID:', ssid)
        
        // Log student creation
        await auditLogger.logStudentAccess(newStudentId, 'create', {
          ssid: ssid,
          fields: Object.keys(appData.studentData || {}),
          hasDocuments: !!(ataglancePdfUrl || bipPdfUrl),
          formMode: 'create'
        })
      }
      

      
      emit('saved', payload)
      emit('close')
    } catch (error) {
      console.error('Error saving student:', error)
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      })
      
      alert(`Error saving student: ${error.message || error}. Please try again.`)
    } finally {
      isSaving.value = false
    }
  }

  // Return all the reactive state and functions
  return {
    // Form state
    form,
    isSaving,
    
    // App settings
    appSettings,
    appSettingsLoading,
    appSettingsError,
    
    // Computed properties
    periods,
    gradeOptions,
    availableClassServices,
    serviceProviders,
    customServiceProviders,
    userRoles,
    
    // File handling
    onFileChange,
    removeBipFile,
    removeAtaglanceFile,
    
    // Additional document handling
    addAdditionalDocument,
    removeAdditionalDocument,
    undoRemoveAdditionalDocument,
    deleteAdditionalDocument,
    
    // Provider utilities
    providerFieldMap,
    getProviderLabel,
    getProviderUsers,
    
    // Form submission
    handleSubmit,
    validateForm
  }
} 