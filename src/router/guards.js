import { useAuthStore } from '@/store/authStore'
import { auditLogger } from '@/utils/auditLogger'

export const authGuard = async (to, from, next) => {
  const authStore = useAuthStore()
  
  // Wait for auth to initialize
  while (authStore.isLoading) {
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  
  if (!authStore.currentUser) {
    // Log unauthorized access attempt
    await auditLogger.logSystemAccess('unauthorized_access_attempt', {
      attemptedRoute: to.path,
      fromRoute: from.path,
      success: false
    })
    
    next('/login')
  } else if (!authStore.currentUser.role) {
    console.log(`User ${authStore.currentUser.uid} exists in Auth but has no role - redirecting to login for role assignment`)
    
    // Log incomplete user setup
    await auditLogger.logSystemAccess('incomplete_user_setup', {
      userId: authStore.currentUser.uid,
      userEmail: authStore.currentUser.email,
      attemptedRoute: to.path,
      reason: 'no_role_assigned'
    })
    
    next('/login')
  } else {
    next()
  }
}

export const adminGuard = async (to, from, next) => {
  const authStore = useAuthStore()
  
  if (!authStore.currentUser || !['admin', 'school_admin', 'admin_504', 'sped_chair'].includes(authStore.currentUser.role)) {
    console.warn(`User with role '${authStore.currentUser?.role}' tried to access restricted route: ${to.path}`)
    
    // Log unauthorized admin access attempt
    await auditLogger.logSystemAccess('unauthorized_admin_access', {
      userRole: authStore.currentUser?.role || 'none',
      attemptedRoute: to.path,
      fromRoute: from.path,
      success: false
    })
    
    next('/students')
  } else {
    // Log successful admin access
    await auditLogger.logSystemAccess('admin_route_access', {
      userRole: authStore.currentUser.role,
      accessedRoute: to.path,
      fromRoute: from.path,
      success: true
    })
    
    next()
  }
}

export const setupGuards = (router) => {
  // Global navigation guard to check authentication
  router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore()
    
    // Allow access to login page immediately
    if (to.path === '/login') {
      return next()
    }
    
    // Only check auth for routes that require it
    if (!to.meta.requiresAuth) {
      return next()
    }
    
    // Quick check - if auth is already loaded and user exists, allow immediately
    if (!authStore.isLoading && authStore.currentUser && authStore.currentUser.role) {
      // Quick role check
      if (to.meta.allowedRoles && !to.meta.allowedRoles.includes(authStore.currentUser.role)) {
        console.log('🚪 User role not allowed for route - redirecting to students')
        return next('/students')
      }
      return next()
    }
    
    // Wait for auth to initialize (with timeout to prevent infinite waiting)
    let attempts = 0
    while (authStore.isLoading && attempts < 100) { // Max 5 seconds
      await new Promise(resolve => setTimeout(resolve, 50))
      attempts++
    }
    
    // If still loading after timeout, redirect to login
    if (authStore.isLoading) {
      console.log('🚪 Auth loading timeout - redirecting to login')
      return next('/login')
    }
    
    // If no user is authenticated, redirect to login
    if (!authStore.currentUser) {
      console.log('🚪 No authenticated user - redirecting to login')
      return next('/login')
    }
    
    // If user has no role, redirect to login
    if (!authStore.currentUser.role) {
      console.log('🚪 User has no role - redirecting to login')
      return next('/login')
    }
    
    // Check role permissions
    if (to.meta.allowedRoles && !to.meta.allowedRoles.includes(authStore.currentUser.role)) {
      console.log('🚪 User role not allowed for route - redirecting to students')
      return next('/students')
    }
    
    // Allow access
    next()
  })
  
  console.log('Router guards setup completed')
}