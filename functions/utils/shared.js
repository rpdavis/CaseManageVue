/* eslint-disable */
// functions/utils/shared.js
// Shared utilities and constants for all Firebase functions

const { HttpsError } = require("firebase-functions/v2/https");
const { google } = require("googleapis");

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const VALID_ROLES = [
  "admin",
  "school_admin",
  "staff_view", 
  "staff_edit",
  "admin_504",
  "sped_chair",
  "case_manager",
  "teacher",
  "service_provider",
  "paraeducator",
  // Legacy role names for backward compatibility during migration
  "administrator",
  "administrator_504_CM"
];

const ADMIN_ROLES = [
  "admin",
  "school_admin",
  "admin_504",
  "sped_chair",
  // Legacy role names for backward compatibility during migration
  "administrator",
  "administrator_504_CM"
];

// ─── AUTHENTICATION & AUTHORIZATION ──────────────────────────────────────────
function requireAuth(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
}

function requireRole(request, allowedRoles) {
  requireAuth(request);
  if (!allowedRoles.includes(request.auth.token.role)) {
    throw new HttpsError("permission-denied", "Insufficient permissions");
  }
}

// ─── INPUT VALIDATION & SANITIZATION ────────────────────────────────────────
function sanitizeString(input, maxLength = 255) {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .replace(/\0/g, '') // Remove null bytes
    .replace(/[<>'"&]/g, '') // Remove potentially dangerous characters
    .substring(0, maxLength);
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateRequired(value, fieldName) {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    throw new HttpsError("invalid-argument", `${fieldName} is required`);
  }
}

function checkSecurityThreats(input) {
  if (typeof input !== 'string') return false;
  
  const threats = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // XSS
    /(\b(union|select|insert|update|delete|drop|create|alter)\b)/gi, // SQL injection
    /(\b(exec|eval|system|shell|cmd|powershell)\b)/gi, // Command injection
    /(\b(alert|confirm|prompt)\b)/gi, // JavaScript injection
    /(\b(document\.|window\.|location\.|history\.)\b)/gi, // DOM manipulation
  ];
  
  return threats.some(threat => threat.test(input));
}

// ─── GOOGLE API HELPERS ─────────────────────────────────────────────────────
const getGoogleAuth = () => {
  const credentials = process.env.GOOGLE_KEY ? 
    JSON.parse(process.env.GOOGLE_KEY) : 
    require("../service-account.json");
  
  return new google.auth.GoogleAuth({
    credentials,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/documents",
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/forms.responses.readonly"
    ],
  });
};

// ─── UTILITY FUNCTIONS ──────────────────────────────────────────────────────
function extractFormId(url) {
  const match = url.match(/\/forms\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

function sanitizeTabName(name) {
  return name
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
    .substring(0, 30); // Limit length
}

// ─── EXPORTS ─────────────────────────────────────────────────────────────────
module.exports = {
  // Constants
  VALID_ROLES,
  ADMIN_ROLES,
  
  // Authentication
  requireAuth,
  requireRole,
  
  // Validation
  sanitizeString,
  validateEmail,
  validateRequired,
  checkSecurityThreats,
  
  // Google API
  getGoogleAuth,
  
  // Utilities
  extractFormId,
  sanitizeTabName
};
