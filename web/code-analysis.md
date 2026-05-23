# Code Analysis Report — lsptax/web

**Date:** March 12, 2026
**Project:** Lone Star Property Tax — Web Frontend
**Stack:** React 18 + TypeScript, Vite 5, Tailwind CSS, shadcn/ui, React Router v7, TanStack Table, Axios/Fetch, Zod

---

## Table of Contents

1. [Critical Security Issues](#1-critical-security-issues)
2. [Bugs](#2-bugs)
3. [Dead Files & Dead Code](#3-dead-files--dead-code)
4. [Code Quality & Readability](#4-code-quality--readability)
5. [Type Safety](#5-type-safety)
6. [Error Handling](#6-error-handling)
7. [Accessibility](#7-accessibility)
8. [Performance](#8-performance)
9. [Configuration & DevOps](#9-configuration--devops)
10. [Summary Dashboard](#10-summary-dashboard)
11. [Recommended Actions (Prioritized)](#11-recommended-actions-prioritized)

---

## 1. Critical Security Issues

### 1.1 Credentials Logged to Console

**File:** `src/page/LoginPage.tsx:58`

```
console.log({ email, password });
```

User credentials are logged to the browser console on every login attempt. This is exploitable via browser extensions, shared machines, or log-forwarding tools.

**Severity:** CRITICAL

---

### 1.2 Auth Token Stored in localStorage (XSS Vulnerable)

**Files:** `src/page/LoginPage.tsx:65`, `src/api/api.ts:29`

JWT tokens and user data are stored in `localStorage`, which is accessible to any JavaScript running on the page. A single XSS vulnerability would expose all auth tokens.

**Recommendation:** Migrate to `httpOnly` cookies set by the backend, or at minimum validate and check token expiry on the client.

**Severity:** HIGH

---

### 1.3 ProtectedRoute Only Checks Token Presence

**File:** `src/utils/ProtectedRoute.tsx`

The route guard checks if a token *exists* in `localStorage` but does not validate its format, signature, or expiry. An expired or malformed token still grants access to the portal UI.

**Severity:** HIGH

---

### 1.4 Missing Auth Headers on API Requests

| File | Function | Issue |
|------|----------|-------|
| `src/utils/actionButtonHelper.ts` | `handleArchiveUnarchive` | No `Authorization` header; archive requests are unauthenticated |
| `src/store/data.ts` | `getPreviewDocuments` | Auth headers omitted; document preview requests are unauthenticated |

**Severity:** HIGH

---

### 1.5 No CSP or Security Headers

**File:** `index.html`

No `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, or `Strict-Transport-Security` headers are configured anywhere (HTML, Vite config, or Vercel config).

**Severity:** MEDIUM

---

### 1.6 No `.env.example`

There is no `.env.example` file. Developers have no template for required environment variables. The `.env` file itself risks being accidentally committed without proper gitignore coverage.

**Severity:** LOW

---

## 2. Bugs

### 2.1 jQuery Used But Never Loaded

**File:** `index.html:17-25`

```html
<script>
  $(document).on("ready", function () {
    AOS.init({ duration: 650, once: true });
  });
</script>
```

`$` (jQuery) is not loaded anywhere. This throws `ReferenceError: $ is not defined` on every page load. AOS is already initialized in `src/main.tsx`, making this block redundant.

**Fix:** Remove the entire `<script>` block from `index.html`.

---

### 2.2 Login Email Field Has Wrong Type

**File:** `src/page/LoginPage.tsx`

The email input uses `id="username"` and `type="username"` instead of `type="email"`. This breaks browser autofill, mobile keyboard hints, and HTML5 validation.

---

### 2.3 Typo in NavLink Path — `clietId`

**File:** `src/components/portal/forms/contracts/columns.tsx`

```
clietId
```

`clietId` instead of `clientId` in a `NavLink` — this generates broken navigation links.

---

### 2.4 CSS Typo — `jusitfy-center`

**File:** `src/components/portal/clients/invoice/InvoiceSummary.tsx`

`jusitfy-center` instead of `justify-center` — the flex centering is silently broken.

---

### 2.5 `form` Used Before Declaration in useEffect

**Files:**
- `src/components/portal/clients/add/MoveFromProspect.tsx`
- `src/components/portal/clients/edit/EditClient.tsx`

`loadClientData`/`loadProspectData` references `form` before the `useForm()` hook is called. This relies on JavaScript hoisting behavior and is fragile — it works because `form` is in a closure, but the `useEffect` dependency on `form` can cause infinite re-renders.

---

### 2.6 Contradictory CSS Classes

**File:** `src/components/Header.tsx`

```
className="hidden flex md:flex"
```

`hidden` and `flex` on the same element — `hidden` (display: none) overrides `flex`. Should be `hidden md:flex`.

---

### 2.7 `tableData[0]` Accessed Without Length Check

**File:** `src/components/portal/properties/edit/EditProperty.tsx`

Array index accessed without verifying the array is non-empty, which can throw a runtime error.

---

### 2.8 Wrong Route Path in Mini Dashboard

**File:** `src/components/portal/dashboard/mini-tables/MiniTableContainer.tsx`

Clients link uses `/portal/clients/list-clients` but the actual route is likely `/portal/clients/list-client` (singular).

---

### 2.9 `getProtests` Error Message Copy-Paste Bug

**File:** `src/store/data.ts`

Error message says "Failed to fetch properties" when it should say "Failed to fetch protests."

---

## 3. Dead Files & Dead Code

### 3.1 Dead Files

| File | Reason |
|------|--------|
| `src/routes/authRoutes.tsx` | **Never imported anywhere.** Login is handled directly in `App.tsx`. Entire file is unused. |
| `src/components/portal/clients/list/uploadCSV.tsx` | **Deleted** (per git status). Already removed, confirmed no remaining imports. |
| `src/utils/actionButtonHelper.ts` | **Only referenced in commented-out code** in `properties/columns.tsx`. Effectively dead. |

### 3.2 Dead / Commented-Out Code Blocks

| File | Lines (approx.) | Description |
|------|-----------------|-------------|
| `src/components/portal/TableBuilder.tsx` | ~30 lines | Large commented-out Dialog block |
| `src/components/portal/properties/columns.tsx` | ~20 lines | Commented-out Actions column with `handleArchiveUnarchive` |
| `src/components/portal/contract-owner/columns.tsx` | ~15 lines | Commented-out Actions column |
| `src/components/portal/invoices/columns.tsx` | ~20 lines | Commented-out `handleDelete` and AlertDialog |
| `src/components/WorkProcess.tsx` | ~40 lines | Large commented-out `workProcessCopy` block |
| `src/components/Testimonials.tsx` | ~10 lines | Commented-out `useState` and selection buttons |
| `src/components/Footer.tsx` | ~8 lines | Commented-out NavLinks |
| `src/components/KeyDates.tsx` | ~5 lines | Commented-out image block |
| `src/page/LandingPage.tsx` | — | `WhyUs` imported but commented out in JSX |
| `src/routes/adminRoutes.tsx` | ~5 lines | Commented-out Agent routes |

### 3.3 Unused Imports & Variables

| File | Import/Variable |
|------|-----------------|
| `src/page/LandingPage.tsx` | `WhyUs` imported but not rendered |
| `src/components/portal/properties/yeardata/YearTable.tsx` | `formatDate` import commented out |
| `src/components/portal/clients/edit/EditClient.tsx` | `useSameAsEmail`, `useSameAsMailing` suppressed with `void` |

---

## 4. Code Quality & Readability

### 4.1 Console.log Pollution — 50+ Instances

**Total `console.log` statements across the codebase: 50+**

Top offenders:

| File | Count |
|------|-------|
| `src/store/data.ts` | 18 |
| `src/api/api.ts` | 14 |
| `src/components/portal/prospects/ProspectPropertyTable.tsx` | 4 |
| `src/components/portal/invoices/columns.tsx` | 2 |
| `src/components/portal/properties/edit/EditProperty.tsx` | 2 |
| `src/components/portal/clients/edit/EditClient.tsx` | 2 |
| `src/page/LoginPage.tsx` | 1 (credentials!) |

**Recommendation:** Add an ESLint rule (`no-console: "warn"`) and remove all `console.log` calls. Use a proper logging utility if debug logging is needed.

---

### 4.2 `window.location` Instead of React Router

| File | Usage |
|------|-------|
| `src/components/portal/prospects/list/columns.tsx` | `window.location.reload()` (x2) |
| `src/components/portal/prospects/ViewProspectProperty.tsx` | `window.location.href = ...` |
| `src/components/portal/properties/add/PropertyForm.tsx` | `window.location.href = ...` |

Full page reloads destroy React state and cause unnecessary network requests. Use `useNavigate()` from React Router instead.

---

### 4.3 `alert()` for User Feedback

**File:** `src/utils/actionButtonHelper.ts`

Uses `alert()` for success/error feedback. This is a blocking, non-styleable native dialog. The project already has a toast system (`use-toast.ts`).

---

### 4.4 React Hooks Inside Column Cell Renderers

**Files:**
- `src/components/portal/clients/list/columns.tsx` — `useToast()` in cell
- `src/components/portal/prospects/list/columns.tsx` — `useToast()`, `useState`, `useNavigate` in cell
- `src/components/portal/invoices/columns.tsx` — `useToast()` in cell

This is a **React anti-pattern**. Hooks must be called at the top level of a React function component, not inside render functions passed to TanStack Table column definitions. These hooks are being called conditionally and may cause inconsistent behavior.

**Fix:** Extract cell content into proper React components (e.g., `<ClientActionsCell />`) that use hooks at their top level.

---

### 4.5 Large Components Needing Decomposition

| File | Lines | Concern |
|------|-------|---------|
| `src/api/api.ts` | 730+ | Monolithic API file; split by domain (auth, clients, properties, etc.) |
| `src/store/data.ts` | 700+ | Same — monolithic data store |
| `src/components/portal/properties/edit/EditProperty.tsx` | 541 | Form + table logic in one component |
| `src/components/portal/clients/edit/EditClient.tsx` | 415 | Could extract shared form logic with AddClient |
| `src/components/portal/csv/CsvUploadsPage.tsx` | 541 | Multiple concerns in one file |

---

### 4.6 Inconsistent API Patterns

The codebase mixes two approaches for HTTP requests:
1. Raw `fetch()` with manual `getAuthHeaders()` — in `src/api/api.ts`
2. `authFetch()` wrapper — in `src/store/data.ts`
3. Direct `fetch()` without auth — in `actionButtonHelper.ts`, `InvoiceGenerator.tsx`

This inconsistency leads to missing auth headers and duplicated error handling logic.

**Recommendation:** Standardize on a single API client (e.g., an Axios instance with interceptors for auth and error handling).

---

### 4.7 Duplicate ProtectedRoute Wrapping

`AdminPortal` is wrapped in `<ProtectedRoute>` in `App.tsx`, and then `AdminRoutes` wraps its own `<Routes>` in another `<ProtectedRoute>`. The double-wrapping is redundant.

---

### 4.8 Naming Inconsistencies

| Issue | Location |
|-------|----------|
| File named `ArchiveModal.tsx` but exports `ActionModal` | `src/components/modals/ArchiveModal.tsx` |
| Comment says `App.js` in a `.tsx` file | `src/App.tsx` |
| `authRoutes` (camelCase) should be `AuthRoutes` (PascalCase) for a component | `src/routes/authRoutes.tsx` |
| Typo in comment: "routejhg" | `src/components/portal/DashboardHeader.tsx` |
| Typo in comment: "tit" | `src/components/portal/clients/add/MoveFromProspect.tsx` |

---

### 4.9 Magic Numbers

| Value | File | Context |
|-------|------|---------|
| `3600` | `src/api/api.ts` | Token expiry in seconds — should be `TOKEN_EXPIRY_SECONDS` |
| `10` | `src/store/data.ts` (multiple) | Pagination limit — should be `DEFAULT_PAGE_SIZE` |
| `1000000` | `src/hooks/use-toast.ts` | Toast remove delay (~16.7 min) — likely a mistake |
| `100` | `src/components/portal/dashboard/Chart.tsx` | Limits to first 100 prospects for chart |

---

## 5. Type Safety

### 5.1 `any` Usage — 16 Files Affected

The codebase uses `: any` in at least 16 locations across 9 files:

| File | Count | Examples |
|------|-------|---------|
| `src/api/api.ts` | 4 | `propertyDetails: any`, `yearlyData: any`, `clientDetails: any`, `prospectDetails: any` |
| `src/components/portal/TableBuilder.tsx` | 2 | `data: any`, `columns: any` |
| `src/types/types.ts` | 2 | `InvoiceSummary.id: any`, `InvoiceSummary.isArchived: any` |
| `src/components/portal/clients/invoice/InvoiceSummary.tsx` | 3 | Various |
| `src/components/portal/invoices/InvoiceGenerator.tsx` | 1 | `stats: any` |

### 5.2 `Number`/`String` Wrapper Types Instead of Primitives

**File:** `src/api/api.ts`

Uses `Number` and `String` (object wrappers) instead of `number` and `string` (primitives) in function parameters. This is a TypeScript anti-pattern.

### 5.3 Duplicate / Inconsistent Field Casing in Types

**File:** `src/types/types.ts`

Several types have both camelCase and PascalCase versions of the same field (e.g., `TypeOfAcct` and `typeOfAcct`), suggesting the API returns inconsistent field names. This should be normalized at the API boundary.

---

## 6. Error Handling

### 6.1 Missing `response.ok` Checks

| File | Functions |
|------|-----------|
| `src/api/api.ts` | `deleteClient`, `deleteProspect`, `changeProspectStatus`, `sendContract` |

These functions do not check `response.ok`, meaning server errors (4xx/5xx) are silently ignored.

### 6.2 Silent Error Swallowing

| File | Function | Behavior |
|------|----------|----------|
| `src/store/data.ts` | `getPreviewDocuments` | Empty `catch` block — errors are completely swallowed |
| `src/store/data.ts` | `downloadClientsCSV` et al. | Catches error but doesn't notify the user |
| `src/store/data.ts` | Multiple functions | Return `emptyPaginated()` or `[{}]` on error — callers can't distinguish from success |

### 6.3 No Global Error Boundary

There is no React Error Boundary component wrapping the app or portal. An unhandled error in any component will crash the entire application with a white screen.

### 6.4 Calling `.json()` Before Checking `response.ok`

**File:** `src/api/api.ts` — `addClient`, `editProspect`, `addProspectProperty`

These call `response.json()` before verifying the response succeeded. Non-JSON error responses (e.g., HTML 500 pages) will throw a parse error.

---

## 7. Accessibility

| Issue | Affected Components |
|-------|-------------------|
| Icon-only buttons without `aria-label` | `DashboardHeader.tsx` (hamburger, bell), `SideMenu.tsx` (toggle), `AdminPortal.tsx` (overlay) |
| Generic or empty `alt` text on images | `DashboardStats.tsx`, `Header.tsx`, `FeatureArray.tsx`, `Testimonials.tsx`, `WhyUs.tsx` |
| Form inputs missing associated labels | `AppointmentForm.tsx` (checkboxes), `LoginPage.tsx` |
| No skip-to-content link | `main.tsx` / `index.html` |
| No focus management on route changes | App-wide |
| `select` elements without `aria-label` | `ClientPage.tsx` (county filter) |

---

## 8. Performance

### 8.1 No Memoization on Expensive Computations

Column definitions for TanStack Table are re-created on every render in most table components. These should be wrapped in `useMemo` or defined outside the component.

### 8.2 Chart Data Not Bounded Efficiently

**File:** `src/components/portal/dashboard/Chart.tsx`

Limits to first 100 prospects with `.slice(0, 100)` but fetches all data first. Should use server-side aggregation.

### 8.3 No Code Splitting / Lazy Loading

All portal routes are eagerly imported in `adminRoutes.tsx`. With 20+ route components, this increases initial bundle size significantly.

**Recommendation:** Use `React.lazy()` + `Suspense` for portal routes.

### 8.4 `"use client"` Directive in Non-Next.js App

**Files:** `src/hooks/use-toast.ts`, `src/page/LoginPage.tsx`

`"use client"` is a Next.js directive and has no effect in a Vite app. It should be removed.

---

## 9. Configuration & DevOps

### 9.1 Backend Dependencies in Frontend Package

**File:** `package.json`

`@prisma/client`, `prisma`, `express`, and `cors` are listed as dependencies. These are backend packages and should not be in a frontend project's `package.json`. They inflate `node_modules` and the build unnecessarily.

### 9.2 AOS Initialized Twice

AOS is initialized in both `src/main.tsx` and `index.html` (the latter via a broken jQuery call). The `index.html` script should be removed entirely.

### 9.3 Duplicate Tailwind Directives

Both `src/index.css` and `src/App.css` include `@tailwind base/components/utilities`. Only one file should contain these directives.

### 9.4 `vercel.json` Rewrites

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

This is correct for SPA routing but should also include security headers.

---

## 10. Summary Dashboard

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Security | 1 | 3 | 1 | 1 | **6** |
| Bugs | — | 3 | 5 | 1 | **9** |
| Dead Code | — | — | 3 files | 10+ blocks | **13+** |
| Code Quality | — | 2 | 6 | 5 | **13** |
| Type Safety | — | — | 3 | — | **3** |
| Error Handling | — | 2 | 2 | — | **4** |
| Accessibility | — | — | 3 | 3 | **6** |
| Performance | — | — | 2 | 2 | **4** |
| Config/DevOps | — | — | 2 | 2 | **4** |
| **Totals** | **1** | **10** | **27** | **24** | **62** |

### Console.log Scorecard

| Metric | Value |
|--------|-------|
| Total `console.log` statements | **50+** |
| Files affected | **13** |
| Contains sensitive data | **1** (LoginPage — credentials) |

### `any` Usage Scorecard

| Metric | Value |
|--------|-------|
| Total `: any` usages | **16+** |
| Files affected | **9** |

---

## 11. Recommended Actions (Prioritized)

### P0 — Immediate (Security & Crashes)

1. **Remove `console.log({ email, password })` from `LoginPage.tsx`**
2. **Add auth headers to `actionButtonHelper.ts` and `getPreviewDocuments` in `data.ts`**
3. **Remove broken jQuery `<script>` block from `index.html`**
4. **Add token expiry validation to `ProtectedRoute.tsx`**
5. **Fix `response.ok` checks in `deleteClient`, `deleteProspect`, `changeProspectStatus`, `sendContract`**

### P1 — High (Bugs & Anti-patterns)

6. Fix `type="username"` to `type="email"` on login input
7. Fix `clietId` typo in contracts `columns.tsx`
8. Fix `jusitfy-center` typo in `InvoiceSummary.tsx`
9. Extract hooks out of TanStack Table column cell renderers into proper components
10. Replace all `window.location.reload()` / `window.location.href` with React Router navigation
11. Add a global React Error Boundary
12. Remove backend packages (`prisma`, `express`, `cors`) from frontend `package.json`

### P2 — Medium (Code Quality)

13. Delete dead files: `authRoutes.tsx`, `actionButtonHelper.ts` (after fixing auth concern)
14. Remove all commented-out code blocks (10+ locations)
15. Remove all `console.log` statements (50+ instances)
16. Replace `any` types with proper interfaces (16+ locations)
17. Split monolithic files: `api.ts` (730 lines), `data.ts` (700 lines)
18. Standardize on a single API client with interceptors
19. Remove duplicate `ProtectedRoute` wrapping in `adminRoutes.tsx`
20. Remove duplicate `@tailwind` directives (keep only in `index.css`)
21. Add `React.lazy()` code splitting for portal routes

### P3 — Low (Polish)

22. Add `.env.example` with required variables
23. Fix naming inconsistencies (`ArchiveModal` → `ActionModal`, `authRoutes` → `AuthRoutes`)
24. Remove `"use client"` directives
25. Add `aria-label` to all icon-only buttons
26. Improve `alt` text on images
27. Extract magic numbers into named constants
28. Add CSP and security headers to `vercel.json`
29. Set up i18n for hardcoded strings (future consideration)
