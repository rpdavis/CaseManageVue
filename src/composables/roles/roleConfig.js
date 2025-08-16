// Centralized role configuration for maintainability
// This file defines all role-specific behaviors, permissions, and access patterns

import { getDisplayValue } from '@/utils/studentUtils'

// ─── ROLE DEFINITIONS ──────────────────────────────────────────────────────────
export const ROLES = {
  ADMIN: 'admin',
  SCHOOL_ADMIN: 'school_admin',
  ADMIN_504: 'admin_504',
  SPED_CHAIR: 'sped_chair',
  STAFF_VIEW: 'staff_view',
  STAFF_EDIT: 'staff_edit',
  CASE_MANAGER: 'case_manager',
  TEACHER: 'teacher',
  SERVICE_PROVIDER: 'service_provider',
  PARAEDUCATOR: 'paraeducator'
}

// ─── ROLE HIERARCHY ───────────────────────────────────────────────────────────
export const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: 100,
  [ROLES.SCHOOL_ADMIN]: 90,
  [ROLES.SPED_CHAIR]: 80,
  [ROLES.ADMIN_504]: 70,
  [ROLES.STAFF_EDIT]: 65,
  [ROLES.CASE_MANAGER]: 60,
  [ROLES.SERVICE_PROVIDER]: 50,
  [ROLES.STAFF_VIEW]: 45,
  [ROLES.TEACHER]: 40,
  [ROLES.PARAEDUCATOR]: 30
}

// ─── PERMISSIONS MATRIX ───────────────────────────────────────────────────────
export const PERMISSIONS = {
  // Student Access Permissions
  CAN_VIEW_ALL_STUDENTS: 'canViewAllStudents',
  CAN_EDIT_ALL_STUDENTS: 'canEditAllStudents', 
  CAN_EDIT_OWN_STUDENTS: 'canEditOwnStudents',
  CAN_SEND_FEEDBACK: 'canSendFeedback',
  
  // System Management Permissions
  CAN_MANAGE_USERS: 'canManageUsers',
  CAN_MANAGE_AIDES: 'canManageAides',
  CAN_ACCESS_TESTING: 'canAccessTesting',
  
  // UI Permissions
  CAN_ACCESS_FILTERS: 'canAccessFilters',
  SHOW_PROVIDER_VIEW: 'showProviderView',
  CAN_USE_CLASS_VIEW: 'canUseClassView'
}

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    PERMISSIONS.CAN_VIEW_ALL_STUDENTS,
    PERMISSIONS.CAN_EDIT_ALL_STUDENTS,
    PERMISSIONS.CAN_SEND_FEEDBACK,
    PERMISSIONS.CAN_MANAGE_USERS,
    PERMISSIONS.CAN_MANAGE_AIDES,
    PERMISSIONS.CAN_ACCESS_TESTING,
    PERMISSIONS.CAN_ACCESS_FILTERS,
    PERMISSIONS.SHOW_PROVIDER_VIEW,
    PERMISSIONS.CAN_USE_CLASS_VIEW
  ],
  
  [ROLES.ADMINISTRATOR]: [
    PERMISSIONS.CAN_VIEW_ALL_STUDENTS,
    PERMISSIONS.CAN_EDIT_ALL_STUDENTS,
    PERMISSIONS.CAN_SEND_FEEDBACK,
    PERMISSIONS.CAN_MANAGE_USERS,
    PERMISSIONS.CAN_MANAGE_AIDES,
    PERMISSIONS.CAN_ACCESS_TESTING,
    PERMISSIONS.CAN_ACCESS_FILTERS,
    PERMISSIONS.SHOW_PROVIDER_VIEW,
    PERMISSIONS.CAN_USE_CLASS_VIEW
  ],
  
  [ROLES.SPED_CHAIR]: [
    PERMISSIONS.CAN_VIEW_ALL_STUDENTS,
    PERMISSIONS.CAN_EDIT_ALL_STUDENTS,
    PERMISSIONS.CAN_SEND_FEEDBACK,
    PERMISSIONS.CAN_MANAGE_AIDES,
    PERMISSIONS.CAN_ACCESS_TESTING,
    PERMISSIONS.CAN_ACCESS_FILTERS,
    PERMISSIONS.SHOW_PROVIDER_VIEW,
    PERMISSIONS.CAN_USE_CLASS_VIEW
  ],
  
  [ROLES.SCHOOL_ADMIN]: [
    PERMISSIONS.CAN_VIEW_ALL_STUDENTS,
    PERMISSIONS.CAN_EDIT_ALL_STUDENTS,
    PERMISSIONS.CAN_SEND_FEEDBACK,
    PERMISSIONS.CAN_MANAGE_USERS,
    PERMISSIONS.CAN_MANAGE_AIDES,
    PERMISSIONS.CAN_ACCESS_TESTING,
    PERMISSIONS.CAN_ACCESS_FILTERS,
    PERMISSIONS.SHOW_PROVIDER_VIEW,
    PERMISSIONS.CAN_USE_CLASS_VIEW
  ],
  
  [ROLES.STAFF_VIEW]: [
    PERMISSIONS.CAN_VIEW_ALL_STUDENTS,
    PERMISSIONS.CAN_ACCESS_TESTING,
    PERMISSIONS.CAN_ACCESS_FILTERS,
    PERMISSIONS.CAN_USE_CLASS_VIEW
  ],
  
  [ROLES.STAFF_EDIT]: [
    PERMISSIONS.CAN_VIEW_ALL_STUDENTS,
    PERMISSIONS.CAN_EDIT_ALL_STUDENTS,
    PERMISSIONS.CAN_ACCESS_TESTING,
    PERMISSIONS.CAN_ACCESS_FILTERS,
    PERMISSIONS.CAN_USE_CLASS_VIEW
  ],
  
  [ROLES.ADMINISTRATOR_504_CM]: [
    PERMISSIONS.CAN_VIEW_ALL_STUDENTS,
    PERMISSIONS.CAN_EDIT_OWN_STUDENTS,
    PERMISSIONS.CAN_SEND_FEEDBACK,
    PERMISSIONS.CAN_MANAGE_USERS,
    PERMISSIONS.CAN_ACCESS_TESTING,
    PERMISSIONS.CAN_ACCESS_FILTERS,
    PERMISSIONS.SHOW_PROVIDER_VIEW,
    PERMISSIONS.CAN_USE_CLASS_VIEW
  ],
  
  [ROLES.CASE_MANAGER]: [
    PERMISSIONS.CAN_EDIT_OWN_STUDENTS,
    PERMISSIONS.CAN_SEND_FEEDBACK,
    PERMISSIONS.CAN_ACCESS_TESTING,
    PERMISSIONS.SHOW_PROVIDER_VIEW,
    PERMISSIONS.CAN_USE_CLASS_VIEW
  ],
  
  [ROLES.TEACHER]: [
    PERMISSIONS.CAN_ACCESS_TESTING,
    PERMISSIONS.CAN_USE_CLASS_VIEW
  ],
  
  [ROLES.SERVICE_PROVIDER]: [
    PERMISSIONS.CAN_EDIT_ALL_STUDENTS,
    PERMISSIONS.CAN_ACCESS_TESTING,
    PERMISSIONS.SHOW_PROVIDER_VIEW,
    PERMISSIONS.CAN_USE_CLASS_VIEW
  ],
  
  [ROLES.PARAEDUCATOR]: [
    PERMISSIONS.CAN_ACCESS_TESTING,
    PERMISSIONS.CAN_USE_CLASS_VIEW
  ]
}

// ─── PROVIDER VIEW OPTIONS ────────────────────────────────────────────────────
export const PROVIDER_VIEW_OPTIONS = {
  [ROLES.SPED_CHAIR]: [
    { value: 'all_iep', label: '*' },
    { value: 'case_manager', label: 'CM' },
    { value: 'service_provider', label: 'SP' },
    { value: 'all', label: 'All' }
  ],
  
  [ROLES.ADMINISTRATOR_504_CM]: [
    { value: 'case_manager', label: 'CM' },
    { value: 'iep_504_all', label: '*' }
  ],
  
  // New role name for 504 Coordinator
  ['admin_504']: [
    { value: 'case_manager', label: 'CM' },
    { value: 'iep_504_all', label: '*' }
  ],
  
  [ROLES.CASE_MANAGER]: [
    { value: 'all', label: 'All' },
    { value: 'case_manager', label: 'CM' },
    { value: 'service_provider', label: 'SP' }
  ],
  
  [ROLES.SERVICE_PROVIDER]: [
    { value: 'all', label: 'All' },
   
  ]
}

// ─── DEFAULT PROVIDER VIEWS ───────────────────────────────────────────────────
export const DEFAULT_PROVIDER_VIEWS = {
  [ROLES.SPED_CHAIR]: 'all',
  [ROLES.ADMINISTRATOR_504_CM]: 'case_manager',
  // New role name for 504 Coordinator
  ['admin_504']: 'case_manager',
  [ROLES.CASE_MANAGER]: 'all',
  [ROLES.SERVICE_PROVIDER]: 'service_provider'
}

// ─── STUDENT ACCESS PATTERNS ──────────────────────────────────────────────────
export const STUDENT_ACCESS_PATTERNS = {
  // Case Manager Access: Students they case manage AND students they provide services to
  [ROLES.CASE_MANAGER]: {
    patterns: ['case_manager', 'teacher'],
    description: 'Students in their caseload and students they provide services to'
  },
  
  // Teacher Access: Students they teach
  [ROLES.TEACHER]: {
    patterns: ['teacher'],
    description: 'Students in their classes'
  },
  
  // Service Provider Access: Students they teach
  [ROLES.SERVICE_PROVIDER]: {
    patterns: ['teacher'],
    description: 'Students in their classes'
  },
  
  // Paraeducator Access: Students they assist
  [ROLES.PARAEDUCATOR]: {
    patterns: ['paraeducator'],
    description: 'Students they are assigned to assist'
  },
  
  // SPED Chair Access: All students (with filtering options)
  [ROLES.SPED_CHAIR]: {
    patterns: ['case_manager', 'teacher', 'all_iep'],
    description: 'All students, with special access to IEP students'
  },
  
  // 504 Administrator Access: All students (with filtering options)
  [ROLES.ADMINISTRATOR_504_CM]: {
    patterns: ['case_manager', 'all_iep_504'],
    description: 'All students, with special access to IEP/504 students'
  },
  
  // Admin Access: All students
  [ROLES.ADMIN]: {
    patterns: ['all'],
    description: 'All students'
  },
  
  // Administrator Access: All students
  [ROLES.ADMINISTRATOR]: {
    patterns: ['all'],
    description: 'All students'
  },
  
  // School Admin Access: All students
  [ROLES.SCHOOL_ADMIN]: {
    patterns: ['all'],
    description: 'All students'
  },
  
  // Staff View Access: All students (view-only)
  [ROLES.STAFF_VIEW]: {
    patterns: ['all'],
    description: 'All students (view-only)'
  },
  
  // Staff Edit Access: All students (can edit)
  [ROLES.STAFF_EDIT]: {
    patterns: ['all'],
    description: 'All students (can edit)'
  }
}

// ─── ACCESS PATTERN IMPLEMENTATIONS ───────────────────────────────────────────
export const ACCESS_PATTERN_FUNCTIONS = {
  // Check if user is case manager of student
  case_manager: (userId, student, studentData) => {
    return studentData.getCaseManagerId(student) === userId
  },
  
  // Check if user teaches student
  teacher: (userId, student, studentData) => {
    const schedule = studentData.getSchedule(student)
    if (!schedule) return false
    
    return Object.values(schedule).some(periodData => {
      if (typeof periodData === 'string') {
        return periodData === userId
      } else if (periodData && typeof periodData === 'object') {
        return periodData.teacherId === userId || 
               periodData.coTeaching?.caseManagerId === userId
      }
      return false
    })
  },
  
  // Check if user is paraeducator assigned to student
  paraeducator: (userId, student, studentData, aideAssignment) => {
    if (!aideAssignment) return false
    
    // Get the aide data for this user
    const aideData = aideAssignment[userId]
    if (!aideData) return false
    
    // Check direct assignment first
    const directStudentIds = Array.isArray(aideData.directAssignment) 
      ? aideData.directAssignment 
      : (aideData.directAssignment ? [aideData.directAssignment] : [])
    if (directStudentIds.includes(student.id)) return true
    
    // Check class assignment
    const schedule = studentData.getSchedule(student)
    if (!schedule) return false
    
    const aidePeriods = aideData.classAssignment || {}
    return Object.entries(schedule).some(([period, data]) => {
      const teacherId = typeof data === 'string' ? data : data?.teacherId
      const aideTeacherIds = aidePeriods[period]
      if (!aideTeacherIds || !teacherId) return false
      const teacherIdArray = Array.isArray(aideTeacherIds) ? aideTeacherIds : [aideTeacherIds]
      return teacherIdArray.includes(teacherId)
    })
  },
  
  // Check if student has IEP
  all_iep: (userId, student, studentData) => {
    const plan = getDisplayValue(student, 'plan')
    return plan === 'IEP'
  },
  
  // Check if student has IEP or 504
  all_iep_504: (userId, student, studentData) => {
    const plan = getDisplayValue(student, 'plan')
    return plan === 'IEP' || plan === '504'
  },
  
  // All students (no filtering)
  all: () => true
}

// ─── FEEDBACK FORM ACCESS RULES ───────────────────────────────────────────────
export const FEEDBACK_ACCESS_RULES = {
  [ROLES.CASE_MANAGER]: {
    canSendFeedback: (userId, student, studentData) => {
      return studentData.getCaseManagerId(student) === userId
    },
    description: 'Can send feedback for students in their caseload'
  },
  
  [ROLES.SPED_CHAIR]: {
    canSendFeedback: (userId, student, studentData) => {
      const isCaseManager = studentData.getCaseManagerId(student) === userId
      const isTeacher = ACCESS_PATTERN_FUNCTIONS.teacher(userId, student, studentData)
      const hasIEP = ACCESS_PATTERN_FUNCTIONS.all_iep(userId, student, studentData)
      
      return isCaseManager || isTeacher || hasIEP
    },
    description: 'Can send feedback for students they case manage, teach, or have IEP'
  },
  
  [ROLES.ADMINISTRATOR_504_CM]: {
    canSendFeedback: (userId, student, studentData) => {
      const isCaseManager = studentData.getCaseManagerId(student) === userId
      const hasIEPor504 = ACCESS_PATTERN_FUNCTIONS.all_iep_504(userId, student, studentData)
      
      return isCaseManager || hasIEPor504
    },
    description: 'Can send feedback for students they case manage or have IEP/504'
  },
  
  [ROLES.ADMIN]: {
    canSendFeedback: () => true,
    description: 'Can send feedback for all students'
  },
  
  [ROLES.ADMINISTRATOR]: {
    canSendFeedback: () => true,
    description: 'Can send feedback for all students'
  }
}

// ─── UTILITY FUNCTIONS ────────────────────────────────────────────────────────
export const RoleUtils = {
  // Check if user has a specific permission
  hasPermission: (userRole, permission) => {
    const permissions = ROLE_PERMISSIONS[userRole] || []
    return permissions.includes(permission)
  },
  
  // Get provider view options for a role
  getProviderViewOptions: (userRole) => {
    return PROVIDER_VIEW_OPTIONS[userRole] || []
  },
  
  // Get default provider view for a role
  getDefaultProviderView: (userRole) => {
    return DEFAULT_PROVIDER_VIEWS[userRole] || 'all'
  },
  
  // Check if user can access student
  canAccessStudent: (userId, userRole, student, studentData, aideAssignment = null) => {
    const patterns = STUDENT_ACCESS_PATTERNS[userRole]?.patterns || []
    
    return patterns.some(pattern => {
      const patternFunction = ACCESS_PATTERN_FUNCTIONS[pattern]
      return patternFunction ? patternFunction(userId, student, studentData, aideAssignment) : false
    })
  },
  
  // Check if user can send feedback for student
  canSendFeedback: (userId, userRole, student, studentData) => {
    const rule = FEEDBACK_ACCESS_RULES[userRole]
    return rule ? rule.canSendFeedback(userId, student, studentData) : false
  },
  
  // Get role hierarchy level
  getRoleLevel: (userRole) => {
    return ROLE_HIERARCHY[userRole] || 0
  },
  
  // Check if role has higher privileges than another
  hasHigherPrivileges: (role1, role2) => {
    return RoleUtils.getRoleLevel(role1) > RoleUtils.getRoleLevel(role2)
  }
}

export default RoleUtils 