# Code Analysis — LSPTax Backend

**Date:** March 12, 2026
**Scope:** Full codebase review — code quality, readability, security, and dead code identification

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Security Issues](#security-issues)
4. [Dead Files](#dead-files)
5. [Dead Functions and Unused Exports](#dead-functions-and-unused-exports)
6. [Bugs](#bugs)
7. [Code Quality and Readability](#code-quality-and-readability)
8. [Dependency Audit](#dependency-audit)
9. [Recommended Cleanup Actions](#recommended-cleanup-actions)

---

## Executive Summary

The LSPTax backend is a Node.js/Express API using Prisma (PostgreSQL), DocuSign for contract signing, and Supabase for file storage. The codebase is generally well-structured with clear separation into controllers, services, routes, and utilities. However, this review identified **3 high-severity security issues**, **6 dead files**, **9+ unused exports/functions**, several bugs, and multiple areas where code quality and consistency can be improved.

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Security | 1 | 2 | 3 | 1 |
| Bugs | — | 1 | 2 | 1 |
| Dead Code | — | — | 6 files | 9+ exports |
| Quality | — | — | 4 | 6 |

---

## Architecture Overview

```
Tech Stack: Node.js 20 / Express 4.21 / Prisma 7 / PostgreSQL / Supabase / DocuSign
Entry:      src/index.js (port 3000)
Auth:       JWT with in-memory token blacklist
Deploy:     Docker + Fly.io
```

**Route Mounting:**

| Mount Path | Route File | Auth |
|---|---|---|
| `/auth` | `authRoutes.js` | None (public) |
| `/api` | `dataRoutes.js` | `protect` middleware |
| `/action` | `actionRoutes.js` | `protect` middleware |
| `/invoice` | `invoiceRoutes.js` | `protect` middleware |
| `/csv` | `csvRoutes.js` | `protect` middleware |
| `/api/contracts` | `contractRoutes.js` | `protect` middleware |
| `/webhooks/docusign` | Inline in `index.js` | HMAC (when configured) |

---

## Security Issues

### CRITICAL: DocuSign Webhook Accepts Unsigned Requests

**File:** `src/controller/contractController.js:208-218`

When `DOCUSIGN_HMAC_SECRET` is not set, the webhook silently accepts **any** request without signature verification. An attacker could forge webhook payloads to mark contracts as completed, trigger PDF downloads, or change contract statuses.

```javascript
// Current behavior: if no secret is configured, ALL requests are accepted
if (secret && signatureHeader) {
  // verify HMAC...
} else if (secret && !signatureHeader) {
  return res.status(401).send("Missing signature");
}
// Falls through to processing when secret is undefined
```

**Fix:** Reject all webhook requests when `DOCUSIGN_HMAC_SECRET` is not configured, or at minimum log a loud warning and require an explicit opt-out flag.

---

### HIGH: Login Route Has No Input Validation Enforcement

**File:** `src/routes/authRoutes.js:17-22`

The `/auth/login` route defines `express-validator` rules (`body("email").isEmail()`, `body("password").exists()`) but the `login` controller **never calls `validationResult()`** to enforce them. The validators run but their errors are silently ignored.

```javascript
// authRoutes.js — validators are defined
router.post(
  "/login",
  body("email").isEmail().withMessage("Invalid email"),
  body("password").exists().withMessage("Password is required"),
  login  // <-- login() never checks validationResult()
);
```

```javascript
// authController.js — no validation check
export const login = async (req, res) => {
  try {
    const { email, password } = req.body; // Uses raw body directly
    // ...
```

**Fix:** Either add the `validate` middleware (from `src/middleware/validate.js`) to auth routes, or call `validationResult()` in the `login` controller as `register` does.

---

### HIGH: Register Route Validates a `name` Field That Doesn't Exist on the Model

**File:** `src/routes/authRoutes.js:9`

```javascript
body("name").exists().withMessage("Name is required"),
```

The `User` model has `email` and `password` only. The `register` controller never reads `name` from the body. This validator wastes cycles and misleads developers — it will reject requests missing `name` even though the field is never used.

---

### MEDIUM: CORS Is Fully Open

**File:** `src/index.js:14`

```javascript
app.use(cors());
```

This allows requests from any origin. In production, this should be restricted to known frontend domains.

---

### MEDIUM: In-Memory Token Blacklist

**File:** `src/middleware/auth.js:10`

```javascript
const tokenBlacklist = new Set();
```

The blacklist is lost on every server restart or deploy and is not shared across instances. Logged-out tokens become valid again after a restart.

**Fix:** Use Redis or a database table. Alternatively, use short-lived JWTs (e.g., 15 min) with refresh tokens.

---

### MEDIUM: JWT Private Key Stored as a File in Source Tree

**File:** `src/utils/private.key`

The DocuSign private key is stored as a file inside the `src/utils/` directory and committed to the repo (not in `.gitignore`). The key path is hardcoded in `docuSignUtils.js:12` and `signDS.js:10`.

**Fix:** Load the key from an environment variable or secret manager. Add `*.key` to `.gitignore`.

---

### LOW: Error Messages Leak Internal Details

Multiple controllers return `err.message` directly to clients:

- `contractController.js` — all handlers return `err.message`
- `docuSignUtils.js` — logs full error objects

In production, internal error messages can reveal stack traces, database schema details, or third-party API responses.

---

## Dead Files

These files are **never imported** anywhere in the application and serve no runtime purpose:

| File | Reason | Action |
|------|--------|--------|
| `src/utils/checkDocuSignStatus.js` | References undefined `getAccessToken` and `docusign`. Duplicate of `docuSignUtils.checkEnvelopeStatus`. | **Delete** |
| `src/utils/csvReader.js` | References removed `CsvTable` model. Has unreachable code after `return`. | **Delete** |
| `src/utils/seeder.js` | Only prints a deprecation warning. Does nothing. | **Delete** |
| `src/routes/clientRoutes.js` | Never imported in `index.js`. References undefined `register` (not imported). Would throw at runtime. | **Delete** |
| `src/routes/protectRoute.js` | Example-only route, never mounted. | **Delete** |
| `src/controller/signDS.js` | Legacy DocuSign controller. Uses different env var names (`INTEGRATION_KEY`, `USER_ID`, `ACCOUNT_ID`) than the rest of the app. Uses `req.session` which is not configured. Never imported. | **Delete** |
| `src/pdfReader.js` | Standalone script that auto-executes `extractPdfFields` on import. Not imported from anywhere. Dev utility left in `src/`. | **Move to `scripts/` or delete** |

---

## Dead Functions and Unused Exports

| Function / Export | File | Notes |
|---|---|---|
| `downloadClientsCSV` | `clientController.js:112` | Exported but not wired to any route. Routes use `downloadClientsXLSX`. |
| `downloadProspectsCSV` | `prospectController.js` | Same — route uses XLSX handler. |
| `downloadPropertiesCSV` | `propertyController.js` | Same — route uses XLSX handler. |
| `downloadInvoicesCSV` | `invoiceController.js` | Same — route uses XLSX handler. |
| `getAvailableProperties` | `utils/invoiceGenerator.js:178` | Exported, never imported anywhere. |
| `unsignedContractPath` | `utils/supabaseStorage.js:67` | Exported, never called. |
| `getProspectPropertyDetails` | `services/propertyService.js:116` | Duplicate of `prospectService.getProspectPropertyDetails`. The service version is never used. |
| `getCol` | `config/csvColumnMapping.js:72` | Exported but only used internally by `getMapped()` in the same file. Not harmful but the export is unnecessary. |
| `protect` (re-export) | `authController.js:9` | Re-exported "for backward compatibility" but `index.js` imports `protect` from `middleware/auth.js` directly. |
| `validate` middleware | `middleware/validate.js` | Exported but never used in any route. |
| `deleteProspectProperty` | `services/propertyService.js:233` | Identical to `deleteProperty` above it. Same logic, same code. |

---

## Bugs

### HIGH: `deleteClient` Returns Wrong Success Message

**File:** `src/controller/clientController.js:58`

```javascript
res.status(200).json({ message: "Prospect deleted successfully", prospect: client });
```

Should be `"Client deleted successfully"` and use `client:` key, not `prospect:`.

---

### MEDIUM: Route Names Mislead — CSV Routes Serve XLSX

**File:** `src/routes/dataRoutes.js:34-37`

```javascript
router.get("/download-clients-csv", downloadClientsXLSX);
router.get("/download-prospects-csv", downloadProspectsXLSX);
router.get("/download-properties-csv", downloadPropertiesXLSX);
router.get("/download-invoices-csv", downloadInvoicesXLSX);
```

Routes named `*-csv` actually serve XLSX files. Frontends and API consumers will be confused. Either rename routes to `*-xlsx` or provide both CSV and XLSX endpoints.

---

### MEDIUM: `cleanBackup.js` Retention Filter Is Broken

**File:** `src/utils/cleanBackup.js:85-91`

`listAllFiles` returns an array of **strings** (file paths), but the retention filter tries to access `file?.metadata?.lastModified` on each string. Strings don't have a `.metadata` property, so the filter never matches — no files are ever deleted by retention period.

```javascript
filesToDelete = allFiles.filter((file) => {
  return (
    now - new Date(file?.metadata?.lastModified).getTime() > retentionPeriodMs
  ); // file is a string, not an object
});
```

---

### LOW: `prisma/revert.js` Table Name Casing

Uses `"Client"` (capital C) in raw SQL, but Prisma generates lowercase table names by default. This may silently fail on case-sensitive PostgreSQL configurations.

---

## Code Quality and Readability

### Inconsistent Error Handling Pattern

Controllers use three different patterns for error responses:

1. `sendError(res, 500, "message", error)` — via `exportService.js`
2. `res.status(500).json({ error: "message" })` — inline
3. `res.status(500).json({ message: "message" })` — inline with different key

This makes it hard to write consistent frontend error handling. The global `errorHandler` middleware exists but is never reached because controllers always catch and respond locally (never call `next(err)`).

**Recommendation:** Standardize on either always using `sendError` or throwing errors and letting `errorHandler` catch them.

---

### Duplicated Pagination/Search Logic

The search filter functions (`clientSearchWhere`, `propertySearchWhere`, `invoiceSearchWhere`) all share the same "sanitize undefined/null" pattern:

```javascript
const raw = searchTerm == null || searchTerm === "" ? "" : String(searchTerm).trim();
const q = raw === "undefined" || raw === "null" ? "" : raw;
```

This 3-line block is repeated in `clientService.js`, `propertyService.js`, and `invoiceService.js`. Extract it into a shared utility (e.g., `utils/search.js`).

---

### Duplicated `getProperties` / `getArchiveProperties`

These two functions in `propertyService.js` are identical except for `isArchived: false` vs `isArchived: true`. Same pattern repeats for clients and invoices. A parameterized helper would eliminate ~50% of the code in each service.

---

### DocuSign Base URL Hardcoded in Multiple Places

The DocuSign API base URL `https://demo.docusign.net/restapi` appears in:

- `docuSignUtils.js:14` (as a constant)
- `docuSignUtils.js:48` (inline string)
- `docuSignUtils.js:107` (inline string)
- `checkDocuSignStatus.js:6` (inline string)
- `signDS.js` (via env var `DOCUSIGN_BASE_URL`)

This should be a single environment variable used everywhere. The current `demo.docusign.net` will break in production.

---

### Excessive Console Logging with Emojis

Files like `invoiceGenerator.js`, `docuSignUtils.js`, and `prospectService.js` use emoji-heavy console logging:

```javascript
console.log(`🔄 Starting invoice generation for ${clientIds.length} clients`);
console.log(`📋 Found ${properties.length} properties`);
console.log(`✅ Successfully processed ...`);
```

This is fine for development but should use a proper logger (e.g., `pino`, `winston`) with log levels in production.

---

### No `.env.example` File

The project uses 10+ environment variables across auth, DocuSign, and Supabase, but there's no `.env.example` documenting required variables. New developers have to search the codebase to discover what's needed.

---

### Supabase Client Re-Created on Every Call

**File:** `src/utils/supabaseStorage.js:7-16`

`getSupabase()` calls `createClient()` on every invocation (every upload, every signed URL). The client should be created once and reused (singleton pattern or module-level instance).

---

## Dependency Audit

| Package | Status | Notes |
|---------|--------|-------|
| `csv-parser` | **Removable** | Only used by dead file `csvReader.js`. The app uses `csv-parse` instead. |
| `moment` | **Replaceable** | Only used by dead file `signDS.js`. Modern alternative: `dayjs` or native `Intl`. |
| `fast-csv` | **Review** | Only used by standalone script `createBackup.js`. Not used in core app. |
| `@prisma/adapter-pg` + `pg` | **Verify** | Listed but Prisma can connect directly to PostgreSQL. Verify if the PG adapter is actually needed. |
| `axios` | **Implicit** | Used by `docuSignUtils.js` but not listed in `package.json`. Currently works because `docusign-esign` brings it in as a transitive dependency. Should be explicitly listed. |

---

## Recommended Cleanup Actions

### Priority 1 — Security Fixes

- [ ] Reject DocuSign webhook when `DOCUSIGN_HMAC_SECRET` is not configured
- [ ] Add `validate` middleware to `/auth/login` and `/auth/register` routes
- [ ] Remove `body("name")` validator from register route (field doesn't exist)
- [ ] Add `*.key` to `.gitignore` and move private key to env variable or secrets manager
- [ ] Restrict CORS to allowed origins in production
- [ ] Add `axios` to `package.json` explicitly

### Priority 2 — Delete Dead Files

- [ ] Delete `src/utils/checkDocuSignStatus.js`
- [ ] Delete `src/utils/csvReader.js`
- [ ] Delete `src/utils/seeder.js`
- [ ] Delete `src/routes/clientRoutes.js`
- [ ] Delete `src/routes/protectRoute.js`
- [ ] Delete `src/controller/signDS.js`
- [ ] Move `src/pdfReader.js` to `scripts/` or delete

### Priority 3 — Remove Dead Exports

- [ ] Remove `downloadClientsCSV`, `downloadProspectsCSV`, `downloadPropertiesCSV`, `downloadInvoicesCSV` — or wire them to CSV-specific routes
- [ ] Remove `getAvailableProperties` from `invoiceGenerator.js`
- [ ] Remove `unsignedContractPath` from `supabaseStorage.js`
- [ ] Remove duplicate `getProspectPropertyDetails` from `propertyService.js`
- [ ] Remove duplicate `deleteProspectProperty` from `propertyService.js` (identical to `deleteProperty`)
- [ ] Remove `protect` re-export from `authController.js`

### Priority 4 — Fix Bugs

- [ ] Fix `deleteClient` success message: `"Prospect deleted"` → `"Client deleted"`
- [ ] Rename routes `/download-*-csv` → `/download-*-xlsx` (or `/download-*` with format param)
- [ ] Fix `cleanBackup.js` retention filter to use file objects with metadata

### Priority 5 — Code Quality

- [ ] Standardize error response format across all controllers
- [ ] Extract search term sanitization into a shared utility
- [ ] Extract Supabase client into a singleton
- [ ] Move DocuSign base URL to a single env variable
- [ ] Add `.env.example` documenting all required environment variables
- [ ] Add `uploads/` to `.gitignore`
- [ ] Remove `csv-parser` and `moment` from `package.json` after deleting dead files
- [ ] Replace emoji console logs with a structured logger

---

*End of analysis.*
