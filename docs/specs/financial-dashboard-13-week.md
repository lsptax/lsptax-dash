# Financial dashboard — 13-week specs

Lone Star Property Tax · 31 August 2026 → 27 November 2026 · Reports and dashboard first · Payments last

Source: owner game plan (31 Aug 2026). These specs map that plan onto this repo.

**Status as of 7 Sep 2026:** Calendar Week 2 has started. **Week 1 API is implemented** (`GET /api/dashboard/owner` + `/report/billed|collected|unpaid|reductions|...`). Do not skip to Week 2 UI until you start that week. Do not start Payments before Week 11.

## Contents

- [Current baseline](#current-baseline)
- [Rules that do not move](#rules-that-do-not-move)
- [Shared implementation notes](#shared-implementation-notes)
- [Week 1](#week-1--31-aug4-sep-overdue-do-this-first) — Reports v1 + dashboard API
- [Week 2](#week-2--711-sep) — Dashboard UI + report filters
- [Week 3](#week-3--1418-sep) — Tracking fields
- [Week 4](#week-4--2125-sep) — Acquisition + PDF + aging
- [Week 5](#week-5--28-sep2-oct) — Invoice status
- [Week 6](#week-6--59-oct) — Staff + property type
- [Week 7](#week-7--1216-oct) — Protest pipeline
- [Week 8](#week-8--1923-oct) — Activity timeline
- [Week 9](#week-9--2630-oct) — Hardening
- [Week 10](#week-10--26-nov) — Buffer
- [Week 11](#week-11--913-nov) — Payments table (core)
- [Week 12](#week-12--1620-nov) — Method, allocations, partials
- [Week 13](#week-13--2327-nov-short-week) — True AR + payment timeline
- [Open questions](#open-questions)
- [Demo checkpoints](#demo-checkpoints)

## Current baseline

The portal dashboard is **ops**, not financial. Keep it working.

- Ops home: `web/src/components/portal/Dashboard.tsx` → `GET /api/stats` (`invoiceService.getCounts`) — client/prospect counts + hearings. **Do not replace this endpoint.** Add a new owner aggregate.
- Reports today: county-filtered properties CSV only (`api/src/routes/reportRoutes.js`, `web/src/components/portal/reports/ReportsPage.tsx`).
- Invoice money already on `Invoice` (one row per property+year): `invoiceAmount`, `invoiceDate`, `dueDate`, `paidDate` (TEXT `MM/DD/YYYY` via `normalizeInvoiceDateString` in `api/src/utils/invoiceYearlyData.js`), `isPaid`, `year`, `marketReduction`, `appraisedReduction`, `taxableSavings`.
- No Payment table, no ActivityLog, no invoice status enum, no original signup date. `User.type` exists but is unused for auth.

```mermaid
flowchart LR
  Client --> Property
  Property --> Invoice
  Invoice -->|"weeks 11-13"| Payment
```

## Rules that do not move

1. Reports and owner dashboard ship **before** new tracking fields. Week 1 uses `invoiceDate` / `paidDate` already stored.
2. **Payments are weeks 11–13.** Billed vs collected v1 does not wait on Payment rows.
3. “New client” = original signup date (Week 3 field), never property-added date, never overwrite.
4. **Billed** = `invoiceDate`. **Collected** = `paidDate` (v1 full-pay) until Week 12, then payment received date.
5. Tax year = protest year (`Invoice.year`). Billing month is never tax year.
6. Collected v1 label: **fully paid invoices only** (`isPaid === true`, full `invoiceAmount`).
7. August invoice paid in September → billed August, collected September.

## Shared implementation notes

- **Date grouping:** parse TEXT dates with existing `normalizeInvoiceDateString`; skip empty/unparseable strings. Month/YTD/calendar year use the parsed calendar date, not `createdAt` and not `Invoice.year`.
- **Amount:** use stored `invoiceAmount` (already derived in `api/src/utils/invoiceYearlyData.js`).
- **Scope:** exclude archived clients/properties/invoices unless a report says otherwise.
- **Keep `/api/stats`.** New owner API: `GET /api/dashboard/owner` (JWT `protect`, same as other `/api` routes).
- **Reports:** extend `api/src/routes/reportRoutes.js` + `api/src/controller/reportingController.js` with JSON report endpoints (CSV later via Week 2 F-16; PDF in Week 4).
- **Existing ops dashboard stays.** Owner financial UI is a **new** portal page/nav item in Week 2, not a rewrite of hearing/prospect tiles.

---

## Week 1 — 31 Aug–4 Sep (overdue; do this first)

**Theme:** Reports v1 + dashboard API
**Band:** Easy / Mid
**Milestone:** Owner can call one API and see billed vs collected, unpaid, collection rate, reductions, tax savings.

**Done when:** `GET /api/dashboard/owner` returns month / last month / YTD / calendar year money + protest-value + unpaid tiles. A billed-vs-collected report endpoint proves the August/September split. Collected is labeled fully-paid only.

### Date windows (default, no filters yet)

Relative to **today** (America/Chicago unless already using UTC everywhere — match existing hearing week logic):

| Window | Billed uses | Collected uses |
|--------|-------------|----------------|
| This month | `invoiceDate` in current calendar month | `paidDate` in current calendar month |
| Last month | previous calendar month | previous calendar month |
| YTD | Jan 1 → today of current calendar year | same |
| Calendar year | full current year | full current year |

Tax-year billed (I-R2): group by `Invoice.year`, not by invoice-date year.

### `GET /api/dashboard/owner`

Response shape (single aggregate — D-18):

- **Money:** `billedThisMonth`, `billedYtd`, `collectedThisMonth`, `collectedYtd` (D-01, D-02)
- **AR:** `outstandingReceivables` = sum `invoiceAmount` where `isPaid === false` (D-04); `pastDueReceivables` = unpaid and parsed `dueDate` before today (D-05)
- **Rate:** `collectionRate` = collectedYtd ÷ billedYtd, `null` if billedYtd is 0 (D-17)
- **Volume:** `activeProperties` (`Property.isArchived === false`) (D-10); `propertiesInvoiced` = distinct properties with non-empty `invoiceDate` in the billed window (D-12); `paidInvoiceCount` / `unpaidInvoiceCount` (D-14); `pastDueInvoiceCount` (D-16)
- **Protest (unfiltered totals on non-archived invoices):** `propertiesProtested` (P-R1), `averageReduction` / `totalValueReductions` from `appraisedReduction` (P-R3, P-R4), `totalTaxSavings` from `taxableSavings` (P-R5)
- **Meta:** `collectedDefinition: "full_pay_on_paid_date"`, `asOf`

Do **not** include new-client / returning / inactive tiles (those wait for Week 3–4 fields).

### Report endpoints (JSON)

All read-only; same money rules as dashboard.

| ID | Endpoint (proposed) | Behavior |
|----|---------------------|----------|
| PAY-12, BC-03 | `/report/collected` | Sum `invoiceAmount` for `isPaid`, group by month of `paidDate` |
| I-R1, BC-02 | `/report/billed` | Sum `invoiceAmount` where `invoiceDate` set, group this/last month/YTD/calendar year |
| I-R2 | `/report/billed?groupBy=taxYear` | Sum by `Invoice.year` |
| I-R3 | `/report/billed?groupBy=county\|client\|property` | Join Property/Client; county = `cadCounty` |
| AR-03, AR-04 | `/report/unpaid` | Count unpaid clients/invoices + total amount |
| AR-06 | `/report/unpaid?view=largest` | Top clients by unpaid sum |
| P-R6 | `/report/reductions?groupBy=county` | Reductions + tax savings by `cadCounty` |
| ACQ-06 | `/report/acquisition/avg-properties` | Avg properties per non-archived CLIENT |
| C-R5 | `/report/clients/active` | Count `type=CLIENT` and `isArchived=false` (v1 until C-06) |

### Files

- New: `api/src/services/dashboardService.js` (aggregates + MM/DD/YYYY parse helpers)
- Extend: `api/src/routes/dataRoutes.js`, `api/src/routes/reportRoutes.js`, `api/src/controller/reportingController.js`
- Tests: unit tests for “invoiceDate August + paidDate September” and unparseable dates excluded

### Out of scope this week

UI, filters, schema changes, Payments, replacing `/api/stats`.

---

## Week 2 — 7–11 Sep

**Theme:** Dashboard UI + report filters
**Band:** Mid
**Milestone:** Owner can see the dashboard
**Blocks on Q-05** (who may see it). Default until answered: **management only** via `User.type` in `owner` | `admin` (existing users stay `client`/staff and keep the ops dashboard).

**Done when:** Password-secured financial dashboard is usable. Reports filter by tax year, county, client, property, and month.

| ID | Spec |
|----|------|
| D-19 | New portal route (e.g. `/portal/owner`) + SideMenu item. Tiles from `GET /api/dashboard/owner`. Keep existing `/portal/dashboard` ops page. |
| D-00b | JWT + `User.type` gate on owner API and route. Staff get 403 on owner endpoints. |
| F-16 | Shared query parser: `from`, `to`, `month` (`YYYY-MM`), `calendarYear`, `taxYear`, `county`, `clientId`, `propertyId`. Same params on dashboard + reports. CSV export of current report JSON. |
| F-01–F-07 | Each filter applied in SQL/JS consistently: date filters on `invoiceDate` or `paidDate` depending on metric (billed vs collected). Tax year filter = `Invoice.year`. County = `Property.cadCounty`. |

**Files:** `web/src/components/portal/SideMenu.tsx`, `web/src/routes/portalRouteElements.tsx`, `web/src/components/portal/reports/ReportsPage.tsx`, `api/src/middleware/auth.js`, new `web/src/components/portal/owner/`.

---

## Week 3 — 14–18 Sep

**Theme:** Tracking fields (make reports accurate)
**Band:** Easy
**Blocks on Q-03** (is “new in 2026” calendar signup, signup tax year, or both?). Default: **both stored**; “new in 2026” reports in Week 4 use **calendar signup date** unless Q-03 says otherwise.

**Done when:** Reports stop using `createdAt` as signup. Month grouping uses real date columns. Original signup date is never overwritten.

| ID | Spec |
|----|------|
| C-03 | `Client.companyName` String? |
| C-04 | `Client.originalSignupDate` DateTime? — set once on CLIENT create / prospect→client; **never overwrite** on later edits |
| C-05 | `Client.signupTaxYear` Int? |
| C-06 | `Client.status` enum `ACTIVE` \| `INACTIVE` \| `DISCONTINUED` (distinct from `isArchived` and prospect status) |
| C-13 | `Client.referralSource` String? |
| C-07 | Derived `new` vs `returning`: returning if `signupTaxYear` is before the current protest year (or prior-year invoices exist — pick one rule and document it) |
| P-17 | `Invoice.resultDate` TEXT MM/DD/YYYY |
| P-18 | `Invoice.invoiceEligible` Boolean |
| I-06, BC-05 | Confirm/backfill `invoiceDate` / `dueDate` / `paidDate` / `generatedDate`; month/YTD grouping uses these only (no `createdAt`) |
| I-10 | `Invoice.adjustmentAmount` Decimal — billed amount = `invoiceAmount` + adjustments (sign: negative = discount). Until this ships, billed = `invoiceAmount` only |

Expose fields on client/property/invoice edit UIs and DTOs. Backfill `originalSignupDate` from `createdAt` **once**, then stop using `createdAt` for acquisition.

---

## Week 4 — 21–25 Sep

**Theme:** Acquisition reports + PDF + aging v1
**Band:** Easy / Mid
**Milestone:** Month 1: dashboard + reports in use

**Done when:** Month × new clients × new properties works off original signup date. Aging table Current / 1–30 / 31–60 / 61–90 / 90+ for unpaid full amounts. Management reports export PDF.

| ID | Spec |
|----|------|
| C-R1, C-R2, ACQ-02 | New clients by `originalSignupDate` month / calendar year / YTD |
| C-R3, ACQ-03 | Returning: status ACTIVE and `signupTaxYear` before current tax year |
| C-R4 | Count new clients by `referralSource` |
| ACQ-01 | Matrix: calendar month × new clients × new properties (`Property.createdAt` for properties; clients use signup date) |
| ACQ-04, ACQ-05 | Discontinued count; net growth = new − discontinued in window |
| D-06–D-09, D-13 | Dashboard tiles: active / new / returning / inactive-discontinued clients; properties with `invoiceEligible` or year-row but empty `invoiceDate` |
| F-12 | Filter `new` \| `returning` using C-07 |
| F-15 | PDF export of management report (billed/collected/unpaid/acquisition summary). Server-side PDF; reuse existing invoice PDF stack if practical |
| AR-02 | Aging on unpaid `invoiceAmount` vs parsed `dueDate` (not invoiceDate). Current = not yet due |

---

## Week 5 — 28 Sep–2 Oct

**Theme:** Invoice status on reports and dashboard
**Band:** Mid

**Done when:** Unpaid/past-due tiles ignore Voided/Written Off. Status filter works on billed reports. **Partially Paid waits for Payments.**

| ID | Spec |
|----|------|
| I-13 | `Invoice.status` enum: `DRAFT`, `SENT`, `PAID`, `PAST_DUE`, `VOIDED`, `WRITTEN_OFF`. Derive: Sent if any `InvoiceDelivery` for that invoice/year; Past Due if unpaid and `dueDate` is before today; Paid if `isPaid`. Do not delete `isPaid` yet. |
| F-10 | `status` query param on dashboard + billed/unpaid reports. Default AR excludes VOIDED and WRITTEN_OFF. |

---

## Week 6 — 5–9 Oct

**Theme:** Staff + property type reports
**Band:** Mid
**Blocks on Q-02** (is `contactOwner` the consultant, or link portal Users?). Default: **new FK** `Property.consultantUserId` → `User`; keep `contactOwner` text as display fallback; map existing strings where they match `User.name`.

**Done when:** Dashboard and reports slice by county, type, and consultant.

| ID | Spec |
|----|------|
| C-11, P-07 | `Property.propertyType` enum `RESIDENTIAL` \| `COMMERCIAL` \| `BPP` \| `LAND` (do not overload `Client.typeOfAcct`) |
| C-12 | `consultantUserId` on Property |
| P-R7 | Reductions / savings grouped by consultant |
| I-R4 | Billed grouped by consultant |
| F-08, F-09 | Filters: property type, staff user id |

---

## Week 7 — 12–16 Oct

**Theme:** Protest pipeline reports
**Band:** Mid
**Milestone:** Month 2 — slices by status, staff, protest year
**Blocks on Q-01** (protested but not billed: draft year-row vs separate protest record?). Default: **keep year-row on Invoice**; use `invoiceEligible` + empty `invoiceDate` for not-yet-billed. No new Protest table.

| ID | Spec |
|----|------|
| P-14 | `Invoice.protestStatus` enum e.g. `PENDING` \| `COMPLETED` \| `RESULTS_PENDING` (year-level, not property lifecycle) |
| P-16 | `Invoice.protestCompletedAt` TEXT or Date |
| P-R2 | Report completed vs pending by tax year |
| D-11 | Tiles: completed / pending / results pending counts. Same property can be Completed in 2025 and Pending in 2026 |

---

## Week 8 — 19–23 Oct

**Theme:** Activity timeline (no payments yet)
**Band:** Easy / High

**Done when:** Client/property timeline shows protest / invoice generated / email / marked-paid. No payment-received events.

| ID | Spec |
|----|------|
| ACT-03 | Log when `generatedDate` is set / invoice PDF generated |
| ACT-06 | Log `isPaid` toggle + `paidDate` (existing `updateInvoicePaymentStatus` in `api/src/services/invoiceService.js`) |
| ACT-07 | New `ActivityLog` model + `GET /api/activity?clientId=&propertyId=`. Include existing `InvoiceDelivery` send events as timeline items. **No PAYMENT_RECEIVED yet.** |

---

## Week 9 — 26–30 Oct

**Theme:** Hardening
**Band:** Mid
**Milestone:** Dashboard complete except cash-accurate payments

No new tracker IDs. QA against two tax years:

- YoY 2025 vs 2026 vs 2027 billed, collected, reductions
- Month grouping: timezone, empty dates, `M/D/YYYY` vs `MM/DD/YYYY`
- Billed and collected **never** share the same date field
- Voided/written-off excluded from AR
- Owner vs staff access
- Do **not** start Payments

---

## Week 10 — 2–6 Nov

**Theme:** Buffer

Catch-up only. Weeks 1–8 Complete or explicit Won't do. Still no Payments table.

---

## Week 11 — 9–13 Nov

**Theme:** Payments table (core)
**Band:** High
**Milestone:** Payments start
**Blocks on Q-04** (one check, many invoices?). Default: **yes — design PAY-01 so Week 12 allocations fit**; Week 11 UI can still record one payment against one invoice.

**Done when:** Staff enter a payment with date and amount. Invoice remaining balance updates. **Do not** treat `isPaid` as the only source of truth going forward.

| ID | Spec |
|----|------|
| PAY-01, PAY-02, PAY-04, PAY-05, PAY-06 | `Payment`: `id`, `clientId`, `receivedDate`, `amount`, `createdAt`. Week 11: required `invoiceId` (one invoice). Remaining = `invoiceAmount` (+ adjustments) − sum(payments). Set `isPaid` when remaining is 0 or less as a derived flag. |

---

## Week 12 — 16–20 Nov

**Theme:** Method, allocations, partials
**Band:** High

**Done when:** Partial pay in September on an August invoice shows **collected in September only for the amount received**.

| ID | Spec |
|----|------|
| PAY-03 | `PaymentAllocation` (paymentId, invoiceId, amount). One check → many invoices |
| PAY-07–PAY-11 | method enum (Zelle, Check, ACH, Card, Cash, Other), reference, depositDate, notes, `enteredByUserId` |
| I-11 | Remaining balance on invoice DTO |
| D-03, BC-04 | Collected = sum of payment/allocation amounts grouped by `receivedDate` (replace v1 full-pay). Dashboard `collectedDefinition` becomes `payment_received_date` |

---

## Week 13 — 23–27 Nov (short week)

**Theme:** True AR + payment timeline + QA
**Band:** High
**Milestone:** Month 3 — Payments live

**Done when:** Cash flow, AR aging, collection rate use Payment rows. v1 full-pay workaround retired.

| ID | Spec |
|----|------|
| AR-01 | Outstanding = invoice amount − payments (not unpaid full amount) |
| AR-05, D-15 | Partially paid accounts / counts (remaining greater than 0 and payments greater than 0) |
| F-11 | Payment status filter: unpaid / partial / paid / voided |
| ACT-05 | `PAYMENT_RECEIVED` on ActivityLog |

QA: YoY + Thanksgiving short week. Confirm collection rate = cash received ÷ billed.

---

## Open questions

Answer before the week they block.

| ID | Question | Answer by | Recommended default |
|----|----------|-----------|---------------------|
| Q-05 | Who sees the owner dashboard? | Week 2 | `User.type` in `owner`/`admin` only |
| Q-03 | “New in 2026” = calendar signup, signup tax year, or both? | Week 3 | Store both; Week 4 “new in August/2026” uses calendar `originalSignupDate` |
| Q-02 | Consultant = `contactOwner` or User FK? | Week 6 | New `consultantUserId`; keep text fallback |
| Q-01 | Protested but not billed? | Week 7 | Same Invoice year-row; `invoiceEligible` + empty `invoiceDate` |
| Q-04 | One check, many invoices? | Week 11 | Yes; allocations in Week 12 |

## Demo checkpoints

- **End of Week 1:** API billed vs collected by month, unpaid, collection rate, reductions by county. Label: collections are fully-paid only.
- **End of Week 2:** Owner opens dashboard UI; filter by tax year, county, client, property, month.
- **End of Week 4:** Acquisition, aging, PDF; signup date stored.
- **End of Week 7:** Invoice status, results by consultant, completed vs pending for 2025 vs 2026.
- **End of Week 13:** Partials, one check across invoices, remaining balance, true AR.
