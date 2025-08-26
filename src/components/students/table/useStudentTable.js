import { ref, computed, onMounted } from 'vue'
import { formatListFromText, getDisplayValue, getSourceValue } from '@/utils/studentUtils'
import { useAppSettings } from '@/composables/useAppSettings'
import { usePeriodLabels } from '@/composables/usePeriodLabels'
import { auditLogger } from '@/utils/auditLogger'

/**
 * Composable for StudentTable logic and data processing
 * Centralizes all helper functions and state management
 */
export function useStudentTable(props) {
  // Load app settings for dynamic services and providers
  const { appSettings, loadAppSettings, loading: appSettingsLoading, error: appSettingsError } = useAppSettings()
  console.log('🔍 STUDENT TABLE: appSettings after useAppSettings():', appSettings.value)
  const { getLabel } = usePeriodLabels()
  
  onMounted(async () => {
    try {
      await loadAppSettings()
      
      // Log student table access
      if (props.studentData.students.value.length > 0) {
        await auditLogger.logStudentAccess('table_view', 'view', {
          studentCount: props.studentData.students.value.length,
          viewType: 'student_table',
          hasFilters: props.filterData?.currentFilters ? Object.keys(props.filterData.currentFilters).length > 0 : false
        })
      }
      
    } catch (error) {
      console.error('StudentTable: Error loading app settings:', error)
    }
  })

  // User mapping and formatting functions
  const getUserName = (userId) => {
    const user = props.userMap[userId]
    return user ? (user.name || user.email || userId) : userId
  }

  const getUserInitials = (userId) => {
    const user = props.userMap[userId]
    if (!user) return '?'
    if (user.initials) return user.initials
    if (user.name) {
      const parts = user.name.split(' ')
      return parts.map(p => p[0]).join('').toUpperCase()
    }
    if (user.email) return user.email[0].toUpperCase()
    return '?'
  }

  const getUserInitialLastName = (userId) => {
    const user = props.userMap[userId]
    if (!user) return userId
    if (user.name) {
      const parts = user.name.trim().split(' ')
      if (parts.length === 1) return parts[0]
      return `${parts[0][0]}. ${parts.slice(1).join(' ')}`
    }
    if (user.email) return user.email[0].toUpperCase()
    return userId
  }

  const getUserTooltip = (userId) => {
    const user = props.userMap[userId]
    if (!user) return ''
    
    const parts = []
    if (user.rm) parts.push(`Rm: ${user.rm}`)
    if (user.ext) parts.push(`Ext: ${user.ext}`)
    
    return parts.length > 0 ? parts.join(' | ') : ''
  }

  // Alias for backward compatibility
  const getCaseManagerTooltip = getUserTooltip

  // Date formatting and urgency functions
  const formatDate = (dateString) => {
    if (!dateString || dateString === '' || dateString === null || dateString === undefined) return ''
    
    let date
    
    // Handle ISO date strings (YYYY-MM-DD) - this fixes the "one day earlier" issue
    if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10))
      date = new Date(year, month - 1, day) // month is 0-indexed in JavaScript
    } 
    // Handle other date formats (timestamps, etc.)
    else {
      date = new Date(dateString)
    }
    
    // Check if the date is valid
    if (isNaN(date.getTime())) return ''
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  // General date urgency (for meeting and review dates)
  const getDateUrgencyClass = (dateStr) => {
    if (!dateStr) return ''
    const today = new Date()
    const target = new Date(dateStr)
    const daysDiff = Math.ceil((target - today) / (1000 * 60 * 60 * 24))
    if (daysDiff <= 0)  return 'flag-critical'
    if (daysDiff <= 7)  return 'flag-high'
    if (daysDiff <= 14) return 'flag-medium'
    if (daysDiff <= 21) return 'flag-mid'
    if (daysDiff <= 28) return 'flag-low'
    if (daysDiff <= 35) return 'flag-prep'
    return ''
  }

  // Reevaluation-specific urgency (includes flag-prep-reeval)
  const getReevalDateUrgencyClass = (dateStr) => {
    if (!dateStr) return ''
    const today = new Date()
    const target = new Date(dateStr)
    const daysDiff = Math.ceil((target - today) / (1000 * 60 * 60 * 24))
    if (daysDiff <= 0)  return 'flag-critical'
    if (daysDiff <= 7)  return 'flag-high'
    if (daysDiff <= 14) return 'flag-medium'
    if (daysDiff <= 21) return 'flag-mid'
    if (daysDiff <= 28) return 'flag-low'
    if (daysDiff <= 60) return 'flag-prep-reeval'
    return ''
  }

  const getMeetingUrgencyClass = (student) => {
    return getDateUrgencyClass(getDisplayValue(student, 'meetingDate'))
  }

  const getReviewUrgencyClass = (student) => {
    return getDateUrgencyClass(getDisplayValue(student, 'reviewDate'))
  }

  const getReevalUrgencyClass = (student) => {
    return getReevalDateUrgencyClass(getDisplayValue(student, 'reevalDate'))
  }

  // Student data extraction functions
  const getCaseManagerId = (student) => {
    return student.app?.studentData?.caseManagerId || 
           student.caseManagerId || 
           student.casemanager_id
  }

  const getFlagValue = (student, flag) => {
    return student.app?.flags?.[flag] || 
           student[flag] || 
           false
  }

  const hasFlags = (student) => {
    return (student.app?.flags && Object.values(student.app.flags).some(Boolean)) ||
           (student.flag1 || student.flag2)
  }

  const getDocumentUrl = (student, type) => {
     const url = student.app?.documents?.[type] ||  
            student.app?.[type] ||                  
            student[type] ||                        
            student[`${type}_url`] ||               
            null
     return url
 }

  const getAdditionalDocuments = (student) => {
     const additionalDocs = student.app?.documents?.additionalDocuments || []
     return Array.isArray(additionalDocs) ? additionalDocs : []
 }

  // Schedule processing functions
  const getSchedule = (student) => {
    // Check Aeries schedule structure first (direct schedule object)
    if (student.schedule) {
      return student.schedule
    }
    
    // Check new nested structure
    if (student.app?.schedule?.periods) {
      return student.app.schedule.periods
    }
    
    // Check Aeries schedule.periods structure
    if (student.aeries?.schedule?.periods) {
      return student.aeries.schedule.periods
    }
    
    // Check legacy Aeries schedule structure
    if (student.aeries?.schedule) {
      const formattedSchedule = {}
      Object.entries(student.aeries.schedule).forEach(([period, data]) => {
        if (data && data.teacherId) {
                  // Get period label using helper
        const periodNum = parseInt(period.replace('period', ''))
        const periodLabel = getLabel(periodNum)
          
          // Get teacher name from userMap
          let teacherName = data.teacherId
          if (props.userMap) {
            let teacher = Object.values(props.userMap).find(user => 
              user.aeriesId === data.teacherId || 
              user.aeriesId === parseInt(data.teacherId) ||
              user.id === data.teacherId
            )
            
            if (!teacher) {
              teacher = Object.values(props.userMap).find(user => 
                user.aeriesId?.toString() === data.teacherId?.toString() ||
                user.id?.toString() === data.teacherId?.toString()
              )
            }
            
            if (teacher && teacher.name) {
              const nameParts = teacher.name.split(' ')
              if (nameParts.length >= 2) {
                const firstName = nameParts[0]
                const lastName = nameParts[nameParts.length - 1]
                teacherName = `${firstName.charAt(0)}. ${lastName}`
              } else {
                teacherName = teacher.name
              }
            }
          }
          
          formattedSchedule[periodLabel] = teacherName
        }
      })
      return Object.keys(formattedSchedule).length > 0 ? formattedSchedule : null
    }
    
    return null
  }

  // Extract co-teaching services from schedule
  const getCoTeachingServices = (student) => {
    const coTeachingServices = []
    const schedule = getSchedule(student)
    
    if (schedule) {
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

  // Services processing functions
  const getClassServices = (student) => {
    const services = student.app?.schedule?.classServices || 
                    student.services || 
                    []
    
    // Extract co-teaching services from schedule
    const coTeachingServices = getCoTeachingServices(student)
    
    // Check which co-teaching services are already in the services array
    const existingCoTeachServices = services.filter(service => 
      service && service.startsWith && service.startsWith('Co-teach:')
    )
    
    // Only add co-teaching services that aren't already in the services array
    const newCoTeachServices = coTeachingServices.filter(coTeachService => 
      !existingCoTeachServices.includes(coTeachService)
    )
    
    // Combine regular services with only new co-teaching services
    const allServices = [...services, ...newCoTeachServices]
    
    // If app settings are still loading, show all services
    if (appSettingsLoading.value) {
      return Array.isArray(allServices) ? allServices.filter(s => typeof s === 'string' && s.includes(':')) : []
    }
    
    // If there was an error loading app settings, show all services
    if (appSettingsError.value) {
      return Array.isArray(allServices) ? allServices.filter(s => typeof s === 'string' && s.includes(':')) : []
    }
    
    // Filter services to only show those that are enabled in app settings
    if (appSettings.value && appSettings.value.classServices) {
      const enabledServices = appSettings.value.classServices
        .filter(svc => svc.enabledSubcategories && svc.enabledSubcategories.length > 0)
        .map(svc => svc.name)
      
      return Array.isArray(allServices) ? allServices.filter(s => {
        if (typeof s !== 'string' || !s.includes(':')) return false
        const serviceName = s.split(':')[0]
        return enabledServices.includes(serviceName)
      }) : []
    }
    
    // Fallback to all services if app settings not available
    return Array.isArray(allServices) ? allServices.filter(s => typeof s === 'string' && s.includes(':')) : []
  }

  const getOtherServices = (student) => {
    const otherServices = student.app?.schedule?.otherServices || 
                         student.other_services || 
                         []
    return Array.isArray(otherServices) ? otherServices.filter(s => !!s) : []
  }

  const hasServiceProviders = (student) => {
    const providers = student.app?.providers || {}
    const hasNewProviders = Object.values(providers).some(Boolean)
    
    // If app settings are still loading or there was an error, check all providers
    if (appSettingsLoading.value || appSettingsError.value) {
      const hasLegacyProviders = student.speechId || student.speech_id || 
                                student.mhId || student.mh_id || 
                                student.otId || student.ot_id ||
                                student.ptId || student.pt_id ||
                                student.scId || student.sc_id ||
                                student.trId || student.tr_id ||
                                student.audId || student.aud_id ||
                                student.viId || student.vi_id ||
                                student.atId || student.at_id ||
                                student.dhhId || student.dhh_id ||
                                student.omId || student.om_id ||
                                student.bisId || student.bis_id ||
                                student.hnId || student.hn_id ||
                                student.swId || student.sw_id
      return hasNewProviders || hasLegacyProviders
    }
    
    // Check legacy providers based on app settings
    let hasLegacyProviders = false
    
    if (appSettings.value && appSettings.value.serviceProviders) {
      const enabledProviders = appSettings.value.serviceProviders
      const providerFieldMap = {
        'SLP': 'speechId',
        'OT': 'otId', 
        'MH': 'mhId',
        'PT': 'ptId',
        'SC': 'scId',
        'TR': 'trId',
        'AUD': 'audId',
        'VI': 'viId',
        'AT': 'atId',
        'DHH': 'dhhId',
        'O&M': 'omId',
        'BIS': 'bisId',
        'HN': 'hnId',
        'SW': 'swId'
      }
      
      hasLegacyProviders = enabledProviders.some(abbr => {
        const fieldName = providerFieldMap[abbr]
        return student[fieldName] || student[fieldName.replace('Id', '_id')]
      })
    } else {
      // Fallback to checking all providers if app settings not available
      hasLegacyProviders = student.speechId || student.speech_id || 
                          student.mhId || student.mh_id || 
                          student.otId || student.ot_id ||
                          student.ptId || student.pt_id ||
                          student.scId || student.sc_id ||
                          student.trId || student.tr_id ||
                          student.audId || student.aud_id ||
                          student.viId || student.vi_id ||
                          student.atId || student.at_id ||
                          student.dhhId || student.dhh_id ||
                          student.omId || student.om_id ||
                          student.bisId || student.bis_id ||
                          student.hnId || student.hn_id ||
                          student.swId || student.sw_id
    }
    
    return hasNewProviders || hasLegacyProviders
  }

  const getServiceProviderId = (student, type) => {
    // Check new nested structure first
    let providerId = student.app?.providers?.[type]
    
    // If not found, check legacy flat structure
    if (!providerId) {
      providerId = student[type]
    }
    
    // If still not found, check underscore format
    if (!providerId) {
      providerId = student[type.replace('Id', '_id')]
    }
    

    
    return providerId || null
  }

  const getProviderFieldName = (abbr) => {
    const providerFieldMap = {
      'SLP': 'speechId',
      'OT': 'otId', 
      'MH': 'mhId',
      'PT': 'ptId',
      'SC': 'scId',
      'TR': 'trId',
      'AUD': 'audId',
      'VI': 'viId',
      'AT': 'atId',
      'DHH': 'dhhId',
      'O&M': 'omId',
      'BIS': 'bisId',
      'HN': 'hnId',
      'SW': 'swId'
    }
    return providerFieldMap[abbr] || `${abbr.toLowerCase()}Id`
  }

  // Paraeducator assignment functions
  const isDirectAssignment = (studentId) => {
    if (!props.currentUser || props.currentUser.role !== 'paraeducator') {
      return false
    }
    
    const aideId = props.currentUser.uid
    let aideData = props.aideSchedule[aideId]
    
    if (!aideData) {
      const userEntry = Object.entries(props.userMap).find(([id, user]) => 
        user.uid === aideId || user.email === props.currentUser.email
      )
      if (userEntry) {
        const [correctAideId] = userEntry
        aideData = props.aideSchedule[correctAideId]
      }
    }
    
    return aideData?.directAssignment === studentId
  }

  // Utility functions - formatListFromText is imported from studentUtils

  const getFlagClass = (flag) => {
    const flagLower = flag.toLowerCase()
    if (flagLower.includes('critical')) return 'flag-critical'
    if (flagLower.includes('high')) return 'flag-high'
    if (flagLower.includes('medium')) return 'flag-medium'
    if (flagLower.includes('mid')) return 'flag-mid'
    if (flagLower.includes('low')) return 'flag-low'
    if (flagLower.includes('prep')) return 'flag-prep'
    return 'flag-low'
  }

  return {
    // App settings
    appSettings,
    appSettingsLoading,
    appSettingsError,
    
    // User functions
    getUserName,
    getUserInitials,
    getUserInitialLastName,
    getUserTooltip,
    getCaseManagerTooltip,
    
    // Date functions
    formatDate,
    getMeetingUrgencyClass,
    getReviewUrgencyClass,
    getReevalUrgencyClass,
    
    // Student data functions
    getCaseManagerId,
    getFlagValue,
    hasFlags,
    getDocumentUrl,
    getAdditionalDocuments,
    
    // Schedule functions
    getSchedule,
    
    // Services functions
    getClassServices,
    getOtherServices,
    getCoTeachingServices,
    hasServiceProviders,
    getServiceProviderId,
    getProviderFieldName,
    
    // Assignment functions
    isDirectAssignment,
    
    // Utility functions
    formatListFromText,
    getFlagClass,
    
    // Period label functions
    getPeriodLabel: getLabel
  }
} 