import { useAuth } from '@/composables/useAuth';

/**
 * Sets up a global navigation guard.
 * @param {object} router - The Vue router instance.
 */
export function setupGuards(router) {
  const { waitForAuthInit } = useAuth();

  // Wait for the initial auth state to be resolved before guarding routes
  waitForAuthInit.then(() => {
    router.beforeEach((to, from, next) => {
      const { currentUser } = useAuth(); // Get the reactive user state

      const requiresAuth = to.meta.requiresAuth;
      const allowedRoles = to.meta.allowedRoles;

      if (requiresAuth && !currentUser.value) {
        // Not authenticated, redirect to login
        next({ name: 'Login' });
      } else if (requiresAuth && currentUser.value && !currentUser.value.role) {
        // User exists in Auth but has no role in Firestore - this is the OAuth connection scenario
        console.log(`User ${currentUser.value.uid} exists in Auth but has no role - redirecting to login for role assignment`);
        next({ name: 'Login' });
      } else if (requiresAuth && allowedRoles && currentUser.value && !allowedRoles.includes(currentUser.value.role)) {
        // Authenticated, but does not have the required role
        console.warn(`User with role '${currentUser.value.role}' tried to access restricted route: ${to.path}`);
        // Redirect to a 'not-authorized' page or home
        next({ name: 'Home' });
      } else {
        // All good, proceed
        next();
      }
    });
  });
}