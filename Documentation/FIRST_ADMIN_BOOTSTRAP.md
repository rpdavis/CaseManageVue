# First-Admin Bootstrap (Owners-Based) — Design and Security

Status: Implemented and deployed

---

## Purpose
Eliminate hardcoded seed users and safely bootstrap the first admin automatically by mapping Google Cloud project owners to app admins. This preserves least-privilege and supports hands-off onboarding for new schools.

---

## High-Level Flow
1. Scheduled server job fetches the project IAM policy (Cloud Resource Manager API).
2. Extract owner/admin emails (`user:` principals), ignore `serviceAccount:` and `group:` (unless group expansion is enabled later).
3. Cache the emails in Firestore at `system/owners` with metadata (timestamp, source, etag).
4. On user sign-in (Google recommended), a server-side check promotes the user if:
   - `email_verified === true`, and
   - `email ∈ system/owners`, and
   - Bootstrap not locked (or user is already admin).
5. The promotion writes `users/{uid}` with `role: admin` (or `school_admin`) and relies on the existing `syncUserClaims` function to set custom claims.
6. A one-time flag `app_settings/bootstrap.completed` prevents accidental elevation by the first random visitor if owners cannot be fetched.

---

## Security Model
- Authentication: Firebase Auth (Google sign-in = OAuth 2.0 + OpenID Connect). Email/password uses Identity Toolkit (secure token flows over TLS).
- Server-to-server: Cloud Functions service account calls Cloud Resource Manager using OAuth 2.0 (JWT assertion → access token).
- Principle of least privilege:
  - Functions SA needs only: `resourcemanager.projects.getIamPolicy` for the target project.
  - No ability to write IAM; read-only fetch.
- Elevation controls:
  - Require `emailVerified`.
  - Only elevate `user:` principals found in IAM owners cache.
  - Never elevate `serviceAccount:` or `deleted:` principals.
  - Optional allowlist for domains or explicit emails via env config.
  - Idempotent writes with transactions; audit log entries for every elevation.
- Admin hygiene:
  - Strongly recommend enabling MFA for admin/school_admin accounts.
  - Lock authorized domains once bootstrap completes to avoid feedback loops.
- Data protections already in place (separate docs):
  - Firestore rules with role-based filtering (e.g., `staff_view` read-only all; `sped_chair` IEP-only + assigned 504s).
  - Storage token scrubbing functions and signed URL access.

---

## Components to Implement

### 1) Owners Sync (Scheduled / HTTPS)
- Name: `syncProjectOwners`
- Triggers: Scheduled (e.g., daily) and optional HTTPS/manual callable (admin-only)
- Steps:
  - Call Cloud Resource Manager: `projects.getIamPolicy`
  - Extract `bindings[].role in ['roles/owner','roles/firebase.admin']`
  - Collect `user:email` members → write to `system/owners`
  - Save `updatedAt`, `etag`, and `source: 'gcp-iam'`

### 2) Sign-In Bootstrap Check (Auth trigger or callable)
- Name: `bootstrapAdminOnSignIn`
- Trigger: Auth onCreate (preferred) or HTTP/callable invoked immediately after login by the client
- Steps:
  - If `app_settings/bootstrap.completed == false` (or missing), run in a transaction:
    - If user email is in `system/owners` and `email_verified`, set `users/{uid}.role = 'admin'` (or `'school_admin'`)
    - Write `app_settings/bootstrap = { completed: true, by: uid, at: now }`
  - Else: if user is in owners, ensure their role is at least `admin`; otherwise default to `staff_view` until an admin elevates

### 3) Claims Sync (already present in project)
- Ensure `syncUserClaims` sets Firebase Auth custom claims to match `users/{uid}.role`

---

## Firestore Layout
- `system/owners` (document)
  - `emails: string[]`
  - `updatedAt: Timestamp`
  - `etag: string`
  - `source: 'gcp-iam'`
- `app_settings/bootstrap` (document)
  - `completed: boolean`
  - `by: string (uid)`
  - `at: Timestamp`
- `users/{uid}` (documents) — single source of truth for roles; claims are synced from here

---

## Required Cloud Setup
- APIs to enable:
  - Cloud Resource Manager API
  - (Already enabled for the app) Firebase Auth, Firestore, Cloud Functions
- Service account permissions:
  - Functions default SA (or dedicated SA) → `roles/viewer` OR specifically `resourcemanager.projects.getIamPolicy`
- Environment/config (optional hardening):
  - `ONBOARD_ALLOWED_DOMAINS` (e.g., `jepsonusd.org`) for an additional guard
  - `ONBOARD_ALLOWED_EMAILS` (comma-separated) to override/extend IAM list if needed

---

## Failure and Recovery
- If IAM read fails:
  - Do not auto-elevate. Keep `bootstrap.completed = false`.
  - Use the callable/HTTPS `syncProjectOwners` from a known admin account (or temporarily grant the function SA the minimal permission), then retry sign-in.
- If a wrong user is elevated:
  - Admin can update `users/{uid}.role` → claims sync corrects privileges; all changes are audited.

---

## Monitoring and Audit
- Log each owners sync (count, etag changes).
- Log each elevation with `{uid, email, previousRole, newRole, reason: 'iam-owner'}`.
- Review Cloud Audit Logs for IAM policy changes—owners changes propagate on next sync.

---

## Rollout Plan
1. Enable Cloud Resource Manager API; grant minimal permission to Functions SA.
2. Deploy `syncProjectOwners` and run once to populate `system/owners`.
3. Deploy `bootstrapAdminOnSignIn`.
4. Verify first sign-in by an IAM owner promotes to admin and flips `bootstrap.completed`.
5. Lock authorized domains and enable MFA policy for admin roles.

---

## FAQ
- Does this use OAuth 2.0?
  - Yes. Google sign-in uses OAuth 2.0/OIDC; server calls to GCP use OAuth 2.0 with the service account.
- What about group owners in IAM?
  - Ignored by default. Optional future enhancement: expand via Cloud Identity Admin SDK if org permits.
- Can we support multiple schools?
  - Yes. Owners-based bootstrap applies per project. For multi-tenant, use per-project deployments or school-scoped admin assignments.

---

## Current Status
- Implemented and deployed: `syncProjectOwnersScheduled`, `syncProjectOwners`, `bootstrapAdminForCurrentUser`.
- Firestore rules and documentation updated separately to enforce role-based access (including `staff_view` read-only and `sped_chair` IEP/assigned scope).
- Frontend can call `bootstrapAdminForCurrentUser` right after login to complete the elevation flow.
