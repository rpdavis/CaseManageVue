/* eslint-disable */
// functions/modules/userManagement.js
// User management functions

const { onCall } = require("firebase-functions/v2/https");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

const {
  requireRole,
  validateRequired,
  validateEmail,
  sanitizeString,
  checkSecurityThreats
} = require("../utils/shared");

const config = require("../utils/config-helper");

const adminAuth = getAuth();
const db = getFirestore();

// ─── USER MANAGEMENT FUNCTIONS ────────────────────────────────────────────────
exports.addUserWithRole = onCall(
  config.createFunctionOptions(),
  async (request) => {
    requireRole(request, config.getSuperAdminRoles());
  
  const { email, role, displayName } = request.data;
  
  // Validation
  validateRequired(email, "Email");
  validateRequired(role, "Role");
  
  if (!validateEmail(email)) {
    throw new HttpsError("invalid-argument", "Invalid email format");
  }
  
  if (checkSecurityThreats(email) || checkSecurityThreats(displayName || "")) {
    throw new HttpsError("invalid-argument", "Security threat detected");
  }
  
  try {
    const userRecord = await adminAuth.createUser({
      email,
      displayName: sanitizeString(displayName || ""),
      emailVerified: false
    });
    
    await adminAuth.setCustomUserClaims(userRecord.uid, { role });
    
    return {
      uid: userRecord.uid,
      email: userRecord.email,
      role: role
    };
  } catch (error) {
    console.error("Add user error:", error);
    throw new HttpsError("internal", "Failed to create user");
  }
});

exports.deleteUserAuth = onCall(
  config.createFunctionOptions(),
  async (request) => {
    requireRole(request, config.getSuperAdminRoles());
  
  const { uid } = request.data;
  validateRequired(uid, "User ID");
  
  try {
    await adminAuth.deleteUser(uid);
    return { success: true };
  } catch (error) {
    console.error("Delete user error:", error);
    throw new HttpsError("internal", "Failed to delete user");
  }
});

exports.deleteAllUsers = onCall(
  config.createFunctionOptions(),
  async (request) => {
    requireRole(request, config.getSuperAdminRoles());
  
  try {
    const listUsersResult = await adminAuth.listUsers();
    const deletePromises = listUsersResult.users.map(user => 
      adminAuth.deleteUser(user.uid)
    );
    
    await Promise.all(deletePromises);
    return { deletedCount: listUsersResult.users.length };
  } catch (error) {
    console.error("Delete all users error:", error);
    throw new HttpsError("internal", "Failed to delete users");
  }
});

exports.migrateUserRoles = onCall(
  config.createFunctionOptions(),
  async (request) => {
    requireRole(request, config.getAdminRoles());
  
  try {
    const listUsersResult = await adminAuth.listUsers();
    const migrationResults = [];
    
    for (const user of listUsersResult.users) {
      if (user.customClaims?.role) {
        const oldRole = user.customClaims.role;
        let newRole = oldRole;
        
        // Map legacy roles to new roles
        if (oldRole === "administrator") newRole = "admin";
        if (oldRole === "administrator_504_CM") newRole = "admin_504";
        
        if (oldRole !== newRole) {
          await adminAuth.setCustomUserClaims(user.uid, { role: newRole });
          migrationResults.push({
            uid: user.uid,
            email: user.email,
            oldRole,
            newRole
          });
        }
      }
    }
    
    return { migrations: migrationResults };
  } catch (error) {
    console.error("Migrate roles error:", error);
    throw new HttpsError("internal", "Failed to migrate user roles");
  }
});
