# LSP Tax Backend API v2

Base URL: `http://localhost:3000` (or your deployed host).

Request/response bodies use **camelCase** to match the database (Prisma) schema.

### Client ID vs Client Number

- **clientId** – System-generated primary key (`Client.id`) when a row is added to the Client table. Use for **all** API parameters (get client, contracts, invoice, add property, **invoice generation**), relations, and foreign keys.
- **clientNumber** – **User-entered only.** Required when creating a client or converting a prospect. Not used in any query (stored for display/export only).

All lookups and filters use **clientId**. **clientNumber** is required on add client and convert-to-client; it is never used in WHERE/orderBy.

---

## Auth

### JWT configuration

- Server signs/verifies JWTs using `process.env.JWT_SECRET`.
- **Set `JWT_SECRET`** in `.env` (recommended 32+ chars). If missing/too short, auth is considered not configured.
- **Protected route groups** (require a valid JWT):
  - `/api/*`
  - `/action/*`
  - `/invoice/*`
  - `/csv/*`
  - `/report/*`
- **Unprotected routes**:
  - `/auth/*`

### Using the JWT

For all protected endpoints, include:

- `Authorization: Bearer <token>`

If missing/invalid/blacklisted you’ll get `401 { "message": "Unauthorized" }`.

### POST `/auth/register`

Register a new user.

**Body (JSON):**

| Field     | Type   | Required | Description                |
|-----------|--------|----------|----------------------------|
| name      | string | Yes      | User display name          |
| email     | string | Yes      | Valid email (unique)      |
| password  | string | Yes      | Min 6 characters           |

**Example:** `{ "name": "John Doe", "email": "user@example.com", "password": "password123" }`

---

### POST `/auth/login`

Login and get JWT token.

**Body (JSON):**

| Field    | Type   | Required |
|----------|--------|----------|
| email    | string | Yes      |
| password | string | Yes      |

**Example:** `{ "email": "user@example.com", "password": "password123" }`

**Response (200):**

```json
{
  "message": "Logged in successfully",
  "token": "<jwt>",
  "user": { "id": 1, "email": "user@example.com" }
}
```

---

### POST `/auth/logout`

Logout. Send `Authorization: Bearer <token>`.

**Behavior:** the server invalidates the token by adding its `jti` to an **in-memory blacklist** (effective until the server restarts). Protected routes check this blacklist on every request.

---

## Data (Read) – `/api`

All under prefix `/api`. **Requires `Authorization: Bearer <token>`**. Query params where noted.

### List pagination (clients, properties, prospects, invoices)

List endpoints return a **paginated** object so the frontend can show "Load more" / next page.

**Query parameters**

| Param   | Type   | Default | Description                          |
|---------|--------|--------|--------------------------------------|
| `limit` | number | 10     | Page size (max 100).                 |
| `offset`| number | 0      | Number of records to skip (next page: use previous `offset + limit`). |
| `search`| string | —      | **Clients:** client name, number, email, or phone. **Properties:** property id (short numeric only, ≤7 digits), account number, or client name. **Invoices:** property/account number (leading-zero tolerant) and year (`/api/invoice/clientid=:id` only). All case-insensitive, partial match where applicable. Omit for no filter. |
| `accountType`| string | —  | **Clients/Properties only (optional):** filter by account type. Allowed: `real`, `bpp` (case-insensitive). |

**Server-side search**

- **Client list** (`/api/clients`, `/api/archive_clients`): filter by **client name**, **client number**, **email**, or **phone number** (partial, case-insensitive). You can also search by **Client ID** using `#<id>`, e.g. `search=#231` will match only the client with `clientId = 231` (and will not be treated as phone/email text).
- **Property list** (`/api/properties`, `/api/archive_properties`): filter by **property id** (numeric, **≤7 digits** only — long account numbers such as Harris County IDs are **not** matched as property ids), **account number**, or **client name** (partial, case-insensitive). Account-number search is **leading-zero tolerant** (e.g. `0123456` matches `123456` and padded variants).
- **Invoice list** (`/api/invoices`, `/api/archive-invoices`, `/api/invoice/clientid=:id`): filter by **property/account number** (leading-zero tolerant, case-insensitive). Client invoice table also supports **4-digit year** search (e.g. `search=2026`).

**Response shape (200)**

```json
{
  "data": [ /* array of items for this page */ ],
  "total": 273,
  "limit": 10,
  "offset": 0,
  "hasMore": true
}
```

- **`data`** – Items for the current page.
- **`total`** – Total number of items (all pages).
- **`limit`** – Page size used (same as query or default).
- **`offset`** – Skip used (same as query or 0).
- **`hasMore`** – `true` if `offset + data.length < total`; use to show "Next" or load more.

**Example:** first page `GET /api/properties?limit=10&offset=0`, next page `GET /api/properties?limit=10&offset=10`.

---

### Clients & prospects

| Method | Endpoint              | Description                                      |
|--------|------------------------|--------------------------------------------------|
| GET    | `/api/clients`         | List clients. Query: `limit`, `offset`, `search`, `accountType` (optional: `real` or `bpp`) |
| GET    | `/api/archive_clients` | Archived clients. Query: `limit`, `offset`, `search`, `accountType` (optional: `real` or `bpp`) |
| GET    | `/api/client`         | Client details. Query: `clientId`. Response includes full client (e.g. clientName, email, phoneNumber, mailingAddress, mailingAddressCityTxZip, **`contingencyFee`** (percent number), **`flatFee`** (dollars, optional), etc.) and `properties`. (Lifecycle is now per-property; see `/api/property`.) |
| GET    | `/api/prospects`       | List prospects. Query: `limit`, `offset`. Each prospect item includes `inquireDate` (the `createdAt` timestamp when the prospect was first added). |
| GET    | `/api/prospect`        | Prospect details. Query: `prospectId`. Response: `{ prospect, properties }`; prospect includes **contingencyFee** and other client fields. |
| GET    | `/api/archive-prospects` | Archived prospects. Query: `limit`, `offset`  |

### Properties

| Method | Endpoint                 | Description                                      |
|--------|---------------------------|--------------------------------------------------|
| GET    | `/api/properties`         | List properties. Query: `limit`, `offset`, `search`, `accountType` (optional: `real` or `bpp`) |
| GET    | `/api/properties/real`    | Convenience: same as `/api/properties?accountType=real` |
| GET    | `/api/properties/bpp`     | Convenience: same as `/api/properties?accountType=bpp` |
| GET    | `/api/archive_properties` | Archived properties. Query: `limit`, `offset`, `search`, `accountType` (optional: `real` or `bpp`) |
| GET    | `/api/property`           | Property details. Query: `propertyId`            |
| GET    | `/api/prospect-property`  | Prospect property details. Query: `id` (property ID) |

#### GET `/api/property`

Fetch a single property with its related client and invoices. Primary endpoint for the **Edit Property** page.

**Query params**

| Param        | Type   | Required | Description |
|-------------|--------|----------|-------------|
| `propertyId`| number | Yes      | Property ID (`Property.id`) |

**Response (200)**

```json
{
  "propertyDetails": {
    "id": 1,
    "clientId": 1,
    "accountNumber": "0123456789012",
    "nameOnCad": "ACME HOLDINGS LLC",
    "mailingAddress": "123 Main St",
    "mailingAddressCityTxZip": "Houston, TX 77001",
    "propertyAddress": "456 Industrial Blvd",
    "cadMailingAddress": "",
    "cadCity": "",
    "cadZipCode": "",
    "cadCounty": "Harris",
    "flatFee": "",
    "cadMailingAddressDisplay": {
      "line1": "123 Main St",
      "line2": "Houston, TX 77001",
      "full": "123 Main St, Houston, TX 77001"
    }
  },
  "client": {
    "id": 1,
    "type": "CLIENT",
    "typeOfAcct": "real",
    "clientName": "Acme Holdings",
    "contingencyFee": 25,
    "flatFee": null
  },
  "invoices": [
    {
      "id": 10,
      "propertyId": 1,
      "year": 2026,
      "marketReduction": 50000,
      "taxRate": 2.3456,
      "taxableSavings": 1172.8,
      "contingencyFee": 25,
      "contingencyFeePercent": 25,
      "bppInvoice": "150",
      "bppInvoiceAmount": 150,
      "invoiceDate": "06/07/2026",
      "generatedDate": "07/01/2026",
      "dueDate": "07/31/2026",
      "invoiceAmount": 443.2
    }
  ],
  "lifecycle": { "phaseId": null, "stepId": null, "completedAt": null, "notes": null, "history": [], "phases": [] },
  "hearings": []
}
```

Notes:
- `propertyDetails` contains **only property fields** (no nested `client`, `invoices`, or raw `lifecycle*` columns).
- **`cadMailingAddressDisplay`** — use this for the **CAD Mailing Address** header. When `cadMailingAddress` / `cadCity` / `cadZipCode` are empty, the server falls back to `mailingAddress` + `mailingAddressCityTxZip` (the populated address from import). Hide the raw empty CAD columns in the UI.
- **`client.contingencyFee`** — default contingency **percent** for the property table dropdown (e.g. `25` = 25%). **`client.flatFee`** — optional flat fee in **dollars** (`null` when unset).
- **`invoices[]`** — one row per tax year (`year`). Numeric decimals are JSON numbers. **`contingencyFee`** and **`contingencyFeePercent`** are the same value (percent, not dollars). Display as `25%`, not `$25`.
- **`invoices[].bppInvoice`** — stored BPP invoice value (string). Send a **dollar amount** (e.g. `"150"` or `"150.00"`) when billing BPP on the invoice row.
- **`invoices[].bppInvoiceAmount`** — server-parsed BPP dollars from `bppInvoice` (legacy ISO date strings such as `"2026-03-18"` are treated as `0`).
- **`invoices[].invoiceAmount`** — **total due** = contingency fee on tax savings **plus** `bppInvoiceAmount` (see [Formulas](#formulas-server-side)).
- **`invoices[].invoiceDate`**, **`invoices[].generatedDate`**, **`invoices[].dueDate`** — optional date strings in **`MM/DD/YYYY`** with zero-padded month/day (e.g. `"07/01/2026"`). The server normalizes `M/D/YYYY` and ISO `YYYY-MM-DD` on save. Use **`generatedDate`** for “Invoice Date” / generated-on on the PDF and **`dueDate`** for payment due.
- **`taxRate`** — stored with up to **4 decimal places** (e.g. `2.3456`).
- `client`, `invoices`, `lifecycle`, and **`hearings`** are returned **once** at the top level to avoid duplication.
- Property **`hearings`** are compact rows (no nested `property` / `client` — you already have those on the same response).

**Property list items** (`GET /api/properties`) also include:

| Field | Description |
|-------|-------------|
| `cadOwner.name` | `nameOnCad` |
| `cadOwner.address` / `line1` / `line2` | CAD mailing address (with mailing fallback) |
| `cadOwner.county` | `cadCounty` |
| `cadMailingAddressDisplay` | Same `{ line1, line2, full }` object as property details |

See [Invoice yearly fields & calculations](#invoice-yearly-fields--calculations) for the full per-year invoice field list and formulas.

#### Property lifecycle (Phase 1)

Aligned with the **Process Overview** in the product roadmap: each **property** has a **current** phase (one of seven) and **current** sub-step (`stepId`). Storage on **`Property`**:

| Column | Purpose |
|--------|---------|
| `lifecyclePhase` | Main phase (`phaseId` string; allowed values in `lifecycleConstants.js`) |
| `lifecycleStep` | Current sub-step (`stepId` from the table) |
| `lifecycleHistory` | Append-only JSON array of every phase/step/notes change |
| `lifecycleCompletedAt` | When the lifecycle was last updated (phase, step, or notes) |
| `lifecycleNotes` | Free-text notes for the current lifecycle position |

**`GET /api/property`** returns **`lifecycle`** (not duplicated on `propertyDetails`) with **`phaseId`**, **`stepId`**, **`completedAt`** (from `lifecycleCompletedAt`), **`notes`** (from `lifecycleNotes`), **`history`**, and reference **`phases`**.

| # | Phase (`phaseId`) | Sub-steps (`stepId`) |
|---|---------------------|----------------------|
| 1 | `clientOnboardingAndPropertySetup` — Client Onboarding & Property Setup | `prospectIdentification`, `propertyInformationCollection`, `cadDataRetrieval`, `agreementPreparation`, `agreementExecution` |
| 2 | `protestAuthorization` — Protest Authorization | `authorizationPreparation`, `authorizationFiling` |
| 3 | `valuationAndProtestInitiation` — Valuation & Protest Initiation | `noticeValueReceipt`, `valueEntryAndRecording`, `documentFilingAndStorage`, `protestReportGeneration`, `protestSubmissionToCounty` |
| 4 | `hearingManagement` — Hearing Management | `hearingScheduleReceipt`, `calendarIntegration`, `preHearingVerification` |
| 5 | `hearingOutcomeAndResolution` — Hearing Outcome & Resolution | `hearingConducted`, `outcomeSettlement`, `outcomeBoardOrder` |
| 6 | `postHearingFinancialProcess` — Post-Hearing Financial Process | `invoicePreparation`, `invoiceIssuance`, `paymentCollection` |
| 7 | `keyOperationalCharacteristics` — Key Operational Characteristics | `individualAndBulkActions`, `multiStepDependencyProcess`, `highImportanceOfTimelines` |

**Updates:** **`PUT /action/edit-property`** — optional `propertyDetails.lifecyclePhase`, **`lifecycleStep`**, **`lifecycleNotes`**. If you set **`lifecycleStep`** only, **`lifecyclePhase`** is inferred. If you change **phase** and the current **step** is invalid in the new phase, the step is cleared. On any change to phase, step, or notes, the server appends **`lifecycleHistory`** and sets **`lifecycleCompletedAt`**. Clients cannot write **`lifecycleHistory`** directly.

**Example (lifecycle only):**

```json
{
  "propertyId": 1,
  "propertyDetails": {
    "lifecyclePhase": "protestAuthorization",
    "lifecycleStep": "authorizationFiling",
    "lifecycleNotes": "Filed online with Dallas CAD"
  }
}
```

#### Hearings (`hearings` table)

Each hearing is **one row** in **`hearings`**. A property may have **many** hearings (reschedules, multiple dates, etc.).

| Column | Purpose |
|--------|---------|
| `propertyId` | FK to `Property` |
| `date` | Scheduled hearing date/time (ISO 8601) |
| `status` | `HearingStatus` enum (see below); default **`SCHEDULED`** |
| `notes` | Optional notes |
| `deletedAt` | Set on soft-delete; `null` = active (visible in API) |

**`HearingStatus` values** (API accepts these strings; case-insensitive):

| Status | Meaning |
|--------|---------|
| `SCHEDULED` | Upcoming / on calendar (default on create) |
| `ATTENDED` | Hearing took place |
| `CANCELLED` | Hearing cancelled |
| `NO_SHOW` | Scheduled but client/property did not attend |

**Add:** property must be in lifecycle phase **`hearingManagement`** (`POST /action/add-hearing`).

#### GET `/api/hearings`

Standalone paginated hearings table for dashboard / “Hearings” view.

**Query params**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `limit` | number | No | Page size (default 10, max 100) |
| `offset` | number | No | Skip count (default 0) |
| `from` | string (ISO date) | No | Filter `date` ≥ `from` |
| `to` | string (ISO date) | No | Filter `date` ≤ `to` |
| `status` | string | No | Filter by `HearingStatus` (e.g. `SCHEDULED`, `ATTENDED`) |

**Response (200)** — `{ data, total, limit, offset, hasMore }`. Each **`data`** item is a **flat** row (no nested `property` object):

| Field | Description |
|-------|-------------|
| `id` | Hearing row id |
| `propertyId` | Property id |
| `clientId` | Owning client id (`Client.id`) |
| `clientName` | Client display name |
| `clientNumber` | User-entered client number (if set) |
| `accountNumber` | Property account number |
| `propertyAddress` | Property address |
| `date` | Hearing date/time (ISO 8601) |
| `status` | `SCHEDULED` \| `ATTENDED` \| `CANCELLED` \| `NO_SHOW` |
| `notes` | Optional notes |
| `createdAt` / `updatedAt` | Row timestamps (ISO 8601) |

**Example item:**

```json
{
  "id": 12,
  "propertyId": 1,
  "clientId": 5,
  "clientName": "Acme Holdings",
  "clientNumber": "100",
  "accountNumber": "P378436",
  "propertyAddress": "123 Main St",
  "date": "2026-05-15T14:00:00.000Z",
  "status": "SCHEDULED",
  "notes": "ARB room 2",
  "createdAt": "2026-05-10T12:00:00.000Z",
  "updatedAt": "2026-05-10T12:00:00.000Z"
}
```

#### GET `/api/stats`

Includes client/prospect counts plus **`hearings`** summary (non-archived properties only):

```json
{
  "numOfClients": 460,
  "numOfProspects": 20,
  "hearings": {
    "meetingsThisWeek": 3,
    "meetingsToday": 1,
    "totalScheduled": 8,
    "weekStart": "2026-06-11T05:00:00.000Z",
    "weekEnd": "2026-06-18T04:59:59.999Z",
    "weekStartDate": "2026-06-11",
    "weekEndDate": "2026-06-17",
    "meetingsThisWeekList": [
      {
        "id": 12,
        "propertyId": 1,
        "clientId": 5,
        "clientName": "Acme Holdings",
        "clientNumber": "100",
        "accountNumber": "P378436",
        "propertyAddress": "123 Main St",
        "date": "2026-06-15T14:00:00.000Z",
        "status": "SCHEDULED",
        "notes": "ARB room 2",
        "createdAt": "2026-05-10T12:00:00.000Z",
        "updatedAt": "2026-05-10T12:00:00.000Z"
      }
    ]
  }
}
```

| Field | Description |
|-------|-------------|
| `meetingsThisWeek` | Hearings with `date` in the next 7 days starting today (inclusive), **America/Chicago** |
| `meetingsToday` | Hearings with `date` today (**America/Chicago**) |
| `totalScheduled` | Hearings with `status` = `SCHEDULED` (includes today’s slot even if the clock time has passed; use status `ATTENDED` / `CANCELLED` / `NO_SHOW` when done) |
| `weekStart` / `weekEnd` | ISO instants for the 7-day window (for `/api/hearings?from=&to=` filters) |
| `weekStartDate` / `weekEndDate` | Calendar dates (`YYYY-MM-DD`) for the same window |
| `meetingsThisWeekList` | Flat hearing rows for the dashboard “Meetings this week” table (same shape as [GET `/api/hearings`](#get-apihearings) items) |

`GET /api/stats` is the **ops** dashboard (clients, prospects, hearings). Do **not** replace it with financial totals.

#### GET `/api/dashboard/owner`

Owner financial aggregate (Week 1). JWT required. Does not change `GET /api/stats`.

**Money rules**

- **Billed** uses `Invoice.invoiceDate` (TEXT `MM/DD/YYYY`). Empty or unparseable dates are skipped.
- **Collected (v1)** = full `invoiceAmount` when `isPaid === true`, grouped by `paidDate`. Label: fully paid invoices only.
- An August invoice paid in September is billed in August and collected in September.
- Tax year is `Invoice.year` (protest year). Billing month is never tax year.
- Archived clients, properties, and invoices are excluded.
- Calendar windows use **America/Chicago**.

**Access (Week 2):** `User.type` must be `owner` or `admin`. Other portal users get **403**. Login now returns `user.type`. Set a user with `UPDATE "User" SET type = 'owner' WHERE email = '...';` then log in again.

**Query filters (shared with `/report/billed|collected|unpaid|reductions`):** `from`, `to` (`YYYY-MM-DD`), `month` (`YYYY-MM`), `calendarYear`, `taxYear`, `county`, `clientId`, `propertyId`. Date range uses `invoiceDate` for billed/AR and `paidDate` for collected. `month` / `calendarYear` shift the default this-month / YTD windows. Add `format=csv` on report endpoints to download the current JSON as CSV.

**Response (200)**

```json
{
  "asOf": "2026-09-07",
  "timeZone": "America/Chicago",
  "collectedDefinition": "full_pay_on_paid_date",
  "billedThisMonth": 0,
  "billedLastMonth": 2500,
  "billedYtd": 2500,
  "billedCalendarYear": 2500,
  "collectedThisMonth": 2500,
  "collectedLastMonth": 0,
  "collectedYtd": 2500,
  "collectedCalendarYear": 2500,
  "collectionRate": 1,
  "outstandingReceivables": 0,
  "pastDueReceivables": 0,
  "activeProperties": 12,
  "propertiesInvoiced": 1,
  "propertiesInvoicedThisMonth": 0,
  "propertiesInvoicedYtd": 1,
  "paidInvoiceCount": 1,
  "unpaidInvoiceCount": 0,
  "pastDueInvoiceCount": 0,
  "propertiesProtested": 1,
  "averageReduction": 50000,
  "totalValueReductions": 50000,
  "totalTaxSavings": 1200
}
```

`collectionRate` is collected YTD ÷ billed YTD (`null` when billed YTD is 0). Past due is unpaid invoices whose parsed `dueDate` is before `asOf`.

**`GET /api/property`** — includes **`hearings`** array for that property (sorted by `date` ascending; compact rows without nested client/property).

### Invoices

| Method | Endpoint                 | Description                                      |
|--------|---------------------------|--------------------------------------------------|
| GET    | `/api/invoice/clientid=:id` | Client invoice table grouped by `propertyId` (all non-archived invoices across client properties). Response includes `client`, top-level **`lastDelivery`** (latest Brevo email tracking for this client), and property groups. Each invoice row includes date fields (`invoiceDate`, `generatedDate`, `dueDate`), `bppInvoice`, `bppInvoiceAmount`, and `invoiceAmount` (total due). Query: `limit`, `offset`, `search` (account number or numeric year) |
| GET    | `/api/invoice/:id` | Invoice details for one property ID (`propertyDetails` + `client` + `invoices`). Same invoice shape as `/api/property` invoices. `client` includes `email`, `billingEmail`, `phoneNumber` for invoice send UI. `propertyDetails` excludes lifecycle fields. Invoices include numeric decimals, date strings (`invoiceDate`, `generatedDate`, `dueDate`), `contingencyFeePercent`, `bppInvoiceAmount`, and total-due `invoiceAmount`. |
| GET    | `/api/invoices`           | All invoices (grouped by property). Each group includes integer `propertyId`, integer `clientId`, string `clientNumber`, boolean `isSent`, boolean `isPaid` (all year-invoices paid), `invoiceIds`, and **`lastDelivery`** (latest Brevo email tracking for that client). `totalInvoiceAmount` per group includes BPP. Query: `limit`, `offset`, `search`, `sendStatus`, `paymentStatus=any\|paid\|unpaid` — see [Invoice email status filter](#invoice-email-status-filter--frontend-naming) |
| GET    | `/api/archive-invoices`   | Archived invoices (same shape as `/api/invoices`: grouped by property, includes `propertyId`, `clientId`, `clientNumber`, `isSent`, `isPaid`, `invoiceIds`, and **`lastDelivery`**). `totalInvoiceAmount` per group includes BPP. Query: `limit`, `offset`, `search`, `sendStatus`, `paymentStatus=any\|paid\|unpaid` — see [Invoice email status filter](#invoice-email-status-filter--frontend-naming) |
| PATCH  | `/invoice/payment`        | Mark invoice(s) paid/unpaid. Optional Brevo payment acknowledgement email — see [PATCH `/invoice/payment`](#patch-invoicepayment) |

#### GET `/api/invoice/:id`

Fetch invoice data for a single property (by `Property.id`). Used by the **per-property invoice** / send-invoice UI. Response shape matches the `propertyDetails`, `client`, and `invoices` portions of **`GET /api/property`** (without `lifecycle` or `hearings`).

**Path param:** `id` — property ID (`Property.id`).

**Response (200)**

```json
{
  "propertyDetails": {
    "id": 1,
    "clientId": 1,
    "accountNumber": "0123456789012",
    "nameOnCad": "ACME HOLDINGS LLC",
    "propertyAddress": "456 Industrial Blvd",
    "cadCounty": "Harris",
    "bppFee": "150.00"
  },
  "client": {
    "id": 1,
    "clientNumber": "C-1001",
    "clientName": "Acme Holdings",
    "email": "contact@acme.com",
    "billingEmail": "billing@acme.com",
    "phoneNumber": "2145551234",
    "contingencyFee": 25,
    "flatFee": null,
    "type": "CLIENT"
  },
  "invoices": [
    {
      "id": 10,
      "propertyId": 1,
      "year": 2026,
      "marketReduction": 50000,
      "taxRate": 2.3456,
      "taxableSavings": 1172.8,
      "contingencyFee": 25,
      "contingencyFeePercent": 25,
      "bppRendered": "",
      "bppInvoice": "150",
      "bppPaid": "",
      "bppInvoiceAmount": 150,
      "invoiceDate": "06/07/2026",
      "generatedDate": "07/01/2026",
      "dueDate": "07/31/2026",
      "invoiceAmount": 443.2
    }
  ]
}
```

In this example: contingency portion = `1172.8 × 25%` = `293.2`; BPP = `150`; **total due** (`invoiceAmount`) = `443.2`. PDF date fields come from `generatedDate` and `dueDate` (not computed by the server).

**404** — `{ "message": "Property not found." }`

#### GET `/api/invoices` and `GET /api/archive-invoices`

Invoice list rows are **grouped by `propertyId`**. Each group represents one property’s invoice bundle. Email delivery is tracked **per client** (one Brevo email can include PDFs for multiple properties), so every group for the same `clientId` shares the same **`lastDelivery`** object.

**Query:** `limit`, `offset`, `search`, `sendStatus`, `paymentStatus` (`any` \| `paid` \| `unpaid`) — see [Invoice email status filter](#invoice-email-status-filter--frontend-naming).

**Response (200)** — excerpt of one group:

```json
{
  "data": [
    {
      "id": 501,
      "clientId": 123,
      "clientNumber": "C-1001",
      "propertyId": 10,
      "propertyNumbers": ["000123"],
      "invoiceIds": [501, 498],
      "invoiceCount": 2,
      "paidCount": 0,
      "isPaid": false,
      "totalInvoiceAmount": 443.2,
      "createdAt": "2026-06-01T00:00:00.000Z",
      "updatedAt": "2026-07-01T00:00:00.000Z",
      "isSent": true,
      "lastDelivery": {
        "deliveryId": 42,
        "year": 2026,
        "recipientEmail": "billing@client.com",
        "emailSentAt": "2026-06-13T02:00:00.000Z",
        "emailDeliveredAt": "2026-06-13T02:01:15.000Z",
        "emailOpenedAt": "2026-06-14T09:30:00.000Z",
        "emailLastEvent": "OPENED",
        "emailBounceReason": null,
        "createdAt": "2026-06-13T02:00:00.000Z"
      }
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

- **`isSent`** — `true` if the client has at least one successful invoice email (`emailStatus: "SENT"`).
- **`lastDelivery`** — latest successful invoice email for this **`clientId`**, ordered by `emailSentAt` then `createdAt`. `null` when never sent.
- Use **`lastDelivery.emailLastEvent`** for the status badge on the invoice table (see [Invoice email tracking](#invoice-email-tracking-brevo)).

#### GET `/api/invoice/clientid=:id`

**Response (200)** — excerpt of one property group:

```json
{
  "client": {
    "id": 1,
    "clientName": "Acme Holdings",
    "email": "contact@acme.com",
    "billingEmail": "billing@acme.com",
    "phoneNumber": "2145551234"
  },
  "lastDelivery": {
    "deliveryId": 42,
    "year": 2026,
    "recipientEmail": "billing@acme.com",
    "emailSentAt": "2026-06-13T02:00:00.000Z",
    "emailDeliveredAt": "2026-06-13T02:01:15.000Z",
    "emailOpenedAt": "2026-06-14T09:30:00.000Z",
    "emailLastEvent": "OPENED",
    "emailBounceReason": null,
    "createdAt": "2026-06-13T02:00:00.000Z"
  },
  "data": [
    {
      "propertyId": 1,
      "property": {
        "id": 1,
        "accountNumber": "0123456789012",
        "propertyAddress": "456 Industrial Blvd",
        "cadCounty": "Harris"
      },
      "invoices": [
        {
          "id": 10,
          "propertyId": 1,
          "year": 2026,
          "generatedDate": "07/01/2026",
          "dueDate": "07/31/2026",
          "bppInvoice": "150",
          "bppInvoiceAmount": 150,
          "invoiceAmount": 443.2,
          "contingencyFeePercent": 25
        }
      ]
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

Each `invoices[]` row uses the same enriched DTO as **`GET /api/invoice/:id`** (including `invoiceDate`, `generatedDate`, `dueDate`, `bppInvoiceAmount`, and total-due `invoiceAmount`). Use top-level **`lastDelivery`** for the client’s latest email tracking status (same object shape as invoice list groups).

### Other

| Method | Endpoint                         | Description           |
|--------|----------------------------------|-----------------------|
| GET    | `/api/stats`                     | Dashboard counts + **`hearings`** stats — see [GET `/api/stats`](#get-apistats) under Hearings |
| GET    | `/api/dashboard/owner`           | Owner financial aggregate (billed vs collected, unpaid, collection rate, reductions) — see [GET `/api/dashboard/owner`](#get-apidashboardowner) |
| GET    | `/api/hearings`                  | Paginated **hearings** table (`propertyId`, `clientId`, `clientName`, `date`, `status`, …). Query: `limit`, `offset`, optional `from`, `to`, `status` |
| GET    | `/api/download-clients-xlsx`     | Download clients Excel (XLSX). Query: `accountType` (optional: `real` or `bpp`) |
| GET    | `/api/download-prospects-xlsx`   | Download prospects Excel (XLSX) |
| GET    | `/api/download-properties-xlsx`  | Download properties Excel (XLSX). Query: `accountType` (optional: `real` or `bpp`) |
| GET    | `/api/download-properties-csv`   | Download properties CSV. Query: `accountType` (optional: `real` or `bpp`) |
| GET    | `/api/download-properties-real-csv` | Convenience: same as `/api/download-properties-csv?accountType=real` |
| GET    | `/api/download-properties-bpp-csv`  | Convenience: same as `/api/download-properties-csv?accountType=bpp` |
| GET    | `/api/download-invoices-xlsx`    | Download invoices Excel (XLSX) |

### Contracts (DocuSign)

All under prefix `/api/contracts`. **Requires `Authorization: Bearer <token>`**. Client Contract is client-level; AOA is property-level.

| Method | Endpoint | Description |
|--------|----------|--------------|
| POST | `/api/contracts/preview-contract` | Preview filled client contract. Body: `{ "clientId": number }`. Returns `{ "contractPdf": "base64..." }`. |
| POST | `/api/contracts/preview-aoa` | Preview filled AOA for one property. Body: `{ "clientId": number, "propertyId": number }`. Returns `{ "aoaPdf": "base64..." }`. |
| POST | `/api/contracts/send-docs` | Send docs via DocuSign (single unified endpoint). Body: `{ "clientId": number, "type": "contract" \| "aoa" \| "aoa_all" \| "all_docs", "propertyId"?: number }`. Notes: `propertyId` is required for `type="aoa"`. `type="aoa_all"` sends one envelope containing one AOA per property. `type="all_docs"` sends one envelope containing contract + all AOAs. |
| GET | `/api/contracts/client/:clientId` | **List contracts already sent** for a client or prospect. Returns array of contracts (type, status, envelopeId, signedAt, signedFileUrl, property). Use this to show “Contracts” / “AOAs” on client or prospect profile. Also supports query: `GET /api/contracts/client?clientId=...`. |
| POST | `/api/contracts/sync-client-status` | Sync status from DocuSign for all SENT contracts of a client. Body: `{ "clientId": number }`. Use when webhook is not available (e.g. localhost). Returns updated contract list. |
| POST | `/api/contracts/poll-status` | Poll DocuSign envelope status. Body: `{ "envelopeId": string }`. Updates contract status and, when completed, stores signed PDF in Supabase. |
| GET | `/api/contracts/:contractId/download-url?expiresIn=3600` | Get a short-lived signed URL to download the signed PDF from Supabase. |

**Getting contract info for a prospect**

There is no separate route for prospect contracts. Both clients and prospects are rows in the **Client** table (with `type` = `CLIENT` or `PROSPECT`). Contracts are linked by `clientId` to that table, so the same endpoint works for both:

- **For a client:** `GET /api/contracts/client/<clientId>` where `clientId` is that client’s `Client.id`.
- **For a prospect:** `GET /api/contracts/client/<prospectId>` where `prospectId` is that prospect’s `Client.id` (same table).

Use the prospect’s id (the `Client.id` of the prospect row) in the path or as the `clientId` query parameter to list that prospect’s contracts.

When you send contracts for a prospect via **POST /action/sign-aoa**, Contract rows are created in the DB (same as for clients), so the list endpoint above will return them after send.

**Environment (contracts / webhook):**

- **Supabase:** Create a storage bucket named `contracts` (private). Use `SUPABASE_SERVICE_ROLE_KEY` in `.env` for server uploads; otherwise `SUPABASE_KEY` is used.
- **DocuSign Connect:** To receive status updates (e.g. completed), configure Connect with URL `https://your-domain/webhooks/docusign`, send **JSON**, and enable HMAC. Set `DOCUSIGN_HMAC_SECRET` in `.env` to the secret DocuSign gives you; if set, webhook requests are verified and rejected if invalid.

---

## Actions – `/action`

All under prefix `/action`. **Requires `Authorization: Bearer <token>`**.

All request bodies are JSON unless noted. Use camelCase for field names.

### Clients

#### POST `/action/add-client`

Add a new client.

**Body:**

| Field                   | Type   | Required | Description                |
|-------------------------|--------|----------|----------------------------|
| clientName              | string | Yes      | Client name                |
| clientNumber            | string | Yes      | User-entered client number |
| email                   | string | Yes      | Email                      |
| phoneNumber             | string | No       |                            |
| mailingAddressCityTxZip  | string | No       | City, TX ZIP               |
| typeOfAcct              | string | No       | Account type               |
| contingencyFee          | string \| number | No | Contingency fee **percent** (e.g. `"25"` or `25` for 25%; `"25%"` also accepted) |
| flatFee                 | string \| number | No | Optional flat fee in **dollars** (e.g. `"2500"`). Not required. |

**Example:**
`{ "clientName": "Acme Inc", "clientNumber": "100", "email": "acme@example.com", "phoneNumber": "", "mailingAddressCityTxZip": "", "typeOfAcct": "", "contingencyFee": "25", "flatFee": "" }`

---

#### POST `/action/edit-client`

Update a client.

**Body:**

| Field         | Type   | Required | Description                          |
|---------------|--------|----------|--------------------------------------|
| clientId      | number | Yes      | Client ID                            |
| clientDetails | object | Yes      | Fields to update (camelCase): clientName, email, phoneNumber, mailingAddress, mailingAddressCityTxZip, typeOfAcct, **contingencyFee** (percent), **flatFee** (optional dollars), etc. (Lifecycle is now per-property; see `/action/edit-property`.) |

**Example:**  
`{ "clientId": 1, "clientDetails": { "clientName": "Updated Name", "email": "updated@example.com", "contingencyFee": "25", "flatFee": null } }`

---

#### POST `/action/delete-client`

**Body:** `{ "id": 1 }` (client id)

---

### Prospects

#### POST `/action/add-prospect`

Add a prospect.

**Body (camelCase):**

| Field                   | Type   | Required |
|-------------------------|--------|----------|
| clientName              | string | Yes      |
| email                   | string | Yes      |
| phoneNumber             | string | No       |
| mailingAddress          | string | No       |
| mailingAddressCityTxZip | string | No       |
| contingencyFee          | string \| number | No | Contingency fee **percent** (e.g. `"25"`) |
| flatFee                 | string \| number | No | Optional flat fee in **dollars** |

**Example:**  
`{ "clientName": "Prospect Name", "email": "prospect@example.com", "phoneNumber": "", "mailingAddress": "", "mailingAddressCityTxZip": "", "contingencyFee": "25", "flatFee": "" }`

---

#### PUT `/action/edit-prospect`

**Body:** `{ "prospectId": 1, "prospectDetails": { ... } }` — use camelCase keys in `prospectDetails` (e.g. clientName, email, phoneNumber, mailingAddress, mailingAddressCityTxZip, **contingencyFee** (percent), **flatFee** (optional dollars), etc.).

---

#### POST `/action/delete-prospect`

**Body:** `{ "id": 1 }` (prospect id)

---

#### POST `/action/move-to-client`

Convert prospect to client.

**Body:** `{ "id": 1, "clientNumber": "100" }` – prospect id and user-entered client number (both required).

---

#### POST `/action/change-prospect-status`

**Body:** `{ "prospectId": 1, "newStatus": "CONTACTED" }`  
Allowed statuses: `NOT_CONTACTED`, `CONTACTED`, `FORM_SENT`.

---

### Properties

#### POST `/action/add-property`

Add a property to an existing **client**.

**Body:**

| Field        | Type   | Required | Description                                      |
|--------------|--------|----------|--------------------------------------------------|
| clientId     | number | Yes      | Client ID                                        |
| propertyData | object | Yes      | Property fields (camelCase, see Property fields below) |

**Property fields (all optional, camelCase):**  
`accountNumber`, `nameOnCad`, `mailingAddress`, `mailingAddressCityTxZip`, `propertyAddress`, `statusNotes`, `otherNotes`, `cadMailingAddress`, `cadCity`, `cadZipCode`, `cadCounty`, `contactOwner`, `subcontractOwner`, `bppFee`, `flatFee`, `aoaSigned`, `hearingDate`  
*(Contingency fee is set at **client** level, not per property.)*

**Behavior:** Creates the property and pre-creates **invoice rows** for years `(currentYear - 4)` through `(currentYear + 1)` (e.g. 2022–2027 in 2026), so the current tax year is available immediately on the Edit Property page. Additional years can also be added via invoice CSV upload or edit-property `yearlyData`.

**Example:**  
`{ "clientId": 1, "propertyData": { "accountNumber": "R123", "nameOnCad": "", "mailingAddress": "", "mailingAddressCityTxZip": "", "propertyAddress": "", ... } }`

---

#### POST `/action/add-prospect-property`

Add a property to a **prospect**.

**Body:**

| Field        | Type   | Required |
|--------------|--------|----------|
| id           | number | Yes      | Prospect ID |
| propertyData | object | Yes      | Same camelCase keys as above |

**Example:**  
`{ "id": 1, "propertyData": { "accountNumber": "R123", "nameOnCad": "", "propertyAddress": "", ... } }`

---

#### PUT `/action/edit-property`

Update property fields and/or per-year invoice data. **Only `propertyId` is required** — all other fields are optional; blank optional fields do not block save.

**Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `propertyId` | number | Yes | Property ID |
| `propertyDetails` | object | No | Property fields (camelCase). Same keys as [add-property](#post-actionadd-property), plus `lifecyclePhase`, `lifecycleStep`, `lifecycleNotes`. **`flatFee`** is optional (string). |
| `yearlyData` | object | No | Map of **4-digit year string** → invoice fields for that year (see [Invoice yearly fields](#invoice-yearly-fields--calculations)) |

**`yearlyData` rules:**
- Keys are **4-digit years** (e.g. `"2026"`). Years not included in the request are **left unchanged**.
- Each year object accepts **camelCase** (`taxRate`, `marketReduction`, …) **or** legacy display labels (`"Tax Rate"`, `"Market Reduction"`, …).
- **Partial updates:** only fields **present** in the year object are written; omitted fields keep their existing DB values.
- **Upsert:** if no invoice row exists for `(propertyId, year)`, one is created on save (e.g. first save to **2026**).
- **`contingencyFee`** — **percentage**, not dollars (`25` or `"25%"` → 25%). Allowed dropdown values: **`0`, `15`, `25`, `35`, `45`**. Defaults to **`client.contingencyFee`** when not sent and the existing row has no value.
- **`invoiceDate`**, **`generatedDate`**, **`dueDate`**, **`protestDate`**, **`hearingDate`**, **`paidDate`** — optional **strings**; normalized to **`MM/DD/YYYY`** on save (e.g. `7/1/2026` → `07/01/2026`). Display labels (`"Due Date"`, `"Generated Date"`, …) are accepted in `yearlyData`.
- **`taxRate`** — up to **4 decimal places** (e.g. `2.3456`).
- **Server-side calculations** (when the derived field is **not** explicitly sent in the request):
  - `noticeMarketValue = noticeLandValue + noticeImprovementValue`
  - `finalMarketValue = finalLandValue + finalImprovementValue`
  - `taxableSavings = appraisedReduction × (taxRate / 100)`
  - `bppInvoiceAmount` = parsed dollars from `bppInvoice` (see [Yearly invoice fields](#yearly-invoice-fields-yearlydata--invoice-columns))
  - `invoiceAmount = (taxableSavings × (contingencyFee / 100)) + bppInvoiceAmount + flatFee`
- Sending a derived field explicitly (`noticeMarketValue`, `finalMarketValue`, `taxableSavings`, `invoiceAmount`) overrides auto-calculation for that save.

**Example (2026 invoice row with BPP and dates — camelCase):**
```json
{
  "propertyId": 1,
  "yearlyData": {
    "2026": {
      "marketReduction": 50000,
      "taxRate": 2.3456,
      "contingencyFee": 25,
      "bppInvoice": "150",
      "generatedDate": "07/01/2026",
      "dueDate": "07/31/2026"
    }
  }
}
```
Server computes `taxableSavings: 1172.8`, `bppInvoiceAmount: 150`, `invoiceAmount: 443.2`. Date strings are stored as sent.

**Example (2026 invoice row with BPP — camelCase):**
```json
{
  "propertyId": 1,
  "yearlyData": {
    "2026": {
      "marketReduction": 50000,
      "taxRate": 2.3456,
      "contingencyFee": 25,
      "bppInvoice": "150"
    }
  }
}
```
Server computes `taxableSavings: 1172.8`, `bppInvoiceAmount: 150`, `invoiceAmount: 443.2`.

**Example (2026 invoice row — no BPP):**
```json
{
  "propertyId": 1,
  "yearlyData": {
    "2026": {
      "marketReduction": 50000,
      "taxRate": 2.3456,
      "contingencyFee": 25
    }
  }
}
```
Server computes `taxableSavings: 1172.8`, `invoiceAmount: 293.2`.

**Example (legacy display labels):**
```json
{
  "propertyId": 1,
  "yearlyData": {
    "2026": {
      "Market Reduction": "50,000",
      "Tax Rate": "2.3456",
      "Contingency Fee": "25%"
    }
  }
}
```

**Example (property header + optional flat fee):**
```json
{
  "propertyId": 1,
  "propertyDetails": {
    "nameOnCad": "ACME LLC",
    "propertyAddress": "456 Industrial Blvd",
    "flatFee": ""
  }
}
```

**Example (lifecycle only):**  
`{ "propertyId": 1, "propertyDetails": { "lifecycleStep": "authorizationFiling", "lifecycleNotes": "Filed" } }`

**Response (200):**

```json
{
  "message": "Property updated successfully",
  "property": { "...": "..." },
  "invoiceYearsSaved": ["2026"],
  "warning": "only present when invoice data was skipped — see below"
}
```

- **`invoiceYearsSaved`** — year keys that were written to the `Invoice` table (e.g. `["2026"]`). Empty array `[]` means **no invoice rows were updated**.
- **`warning`** — returned when `yearlyData` was `{}`, missing, or had no recognizable invoice fields. Property header fields still save; invoice table does **not**.

**Frontend requirement:** When the user saves the yearly invoice table, `yearlyData` **must not be empty**. Example:

```json
{
  "propertyId": 1329,
  "propertyDetails": { "nameOnCad": "...", "accountNumber": "..." },
  "yearlyData": {
    "2026": {
      "noticeLandValue": 100000,
      "noticeImprovementValue": 50000,
      "finalLandValue": 80000,
      "finalImprovementValue": 40000
    }
  }
}
```

The server then computes and stores `noticeMarketValue` (150000) and `finalMarketValue` (120000). Sending `"yearlyData": {}` only updates `propertyDetails` — invoice fields are unchanged.

---

#### PUT `/action/edit-prospect-property`

**Body:** `{ "propertyId": 1, "propertyDetails": { ... } }` — camelCase keys in `propertyDetails` (including `propertyAddress`).

---

#### POST `/action/add-hearing`

Schedule a hearing for a property in **`hearingManagement`** lifecycle phase.

**Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `propertyId` | number | Yes | Property id |
| `date` | string (ISO 8601) | Yes | Hearing date/time |
| `notes` | string | No | Optional notes |
| `status` | string | No | `HearingStatus`; defaults to **`SCHEDULED`** |

**Response (201):** `{ "message": "Hearing scheduled", "hearing": { ... } }` — `hearing` uses the same flat shape as [GET `/api/hearings`](#get-apihearings) list items.

**Example (schedule):**  
`{ "propertyId": 1, "date": "2026-05-15T14:00:00.000Z", "notes": "ARB hearing room 2" }`

**Example (with status):**  
`{ "propertyId": 1, "date": "2026-05-15T14:00:00.000Z", "status": "SCHEDULED" }`

---

#### PUT `/action/edit-hearing`

Update a hearing (reschedule, notes, or mark outcome).

**Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hearingId` | number | Yes | Hearing row id |
| `date` | string (ISO) | No | New date/time |
| `notes` | string | No | Notes |
| `status` | string | No | `SCHEDULED`, `ATTENDED`, `CANCELLED`, or `NO_SHOW` |

At least one of `date`, `notes`, or `status` must be sent.

**Example (mark attended):**  
`{ "hearingId": 12, "status": "ATTENDED" }`

**Example (reschedule):**  
`{ "hearingId": 12, "date": "2026-05-20T10:00:00.000Z", "status": "SCHEDULED" }`

**Response (200):** `{ "message": "Hearing updated", "hearing": { ... } }` — flat `hearing` object (same fields as list).

---

#### POST `/action/delete-hearing`

**Soft-delete** a hearing (sets `deletedAt`; row remains in the DB but is excluded from list, stats, and property details).

**Body:** `{ "hearingId": number }`

**Response (200):** `{ "message": "Hearing deleted", "hearingId": number, "deletedAt": string (ISO) }`

Deleting an already-deleted or unknown id returns **404**.

---

#### POST `/action/delete-property`

**Body:** `{ "propertyId": 1 }` (property id)

---

#### POST `/action/delete-prospect-property`

**Body:** `{ "propertyId": 1 }` (property id)

---

### DocuSign / AOA (prospects)

| Method | Endpoint                    | Body / Notes                    |
|--------|-----------------------------|---------------------------------|
| POST   | `/action/sign-aoa`           | `{ "prospectId": 1 }`. See below. |
| POST   | `/action/preview-signed-pdf`| `{ "prospectId": 1 }` – returns `{ aoaPdf, contractPdf }` (base64). |
| POST   | `/action/download-signed-pdf` | `{ "prospectId": 1 }`         |

#### POST `/action/sign-aoa`

Send client contract + one AOA per property for a **prospect** via DocuSign. Creates **Contract** rows in the DB (same as the client flow), so prospect contracts appear in `GET /api/contracts/client/:prospectId` and are updated by the DocuSign webhook when signed.

**Body:** `{ "prospectId": number }` (required; the prospect’s `Client.id`).

**Behavior:** Sends one envelope for the client contract and one envelope per non-archived property (AOAs). The prospect receives 1 + N emails. Blocked if a client contract or an AOA for that property is already SENT or COMPLETED (same rules as client flow).

**Response (200):**  
`{ "success": true, "contracts": [ ... ], "envelopeIds": [ ... ], "result": { "envelopeId": "..." }, "updatedProspect": { "id", "envelopeId" } }`

**Errors:** 400 if `prospectId` missing, no properties, or contract/AOA already sent; 500 on server error.

---

### Archive

#### POST `/action/archive-entity`

Toggle archive for an entity.

**Body:** `{ "tableName": "client", "id": 1 }`  
`tableName`: e.g. `client`, `prospect`, `property`, `invoice`.

---

## Invoice generation – `/invoice`

All under prefix `/invoice`. **Requires `Authorization: Bearer <token>`**.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/invoice/generate` | Create or refresh invoice rows in DB |
| PATCH | `/invoice/payment` | Mark invoice(s) paid/unpaid; optional payment acknowledgement email — see [PATCH `/invoice/payment`](#patch-invoicepayment) |
| POST | `/invoice/send` | Email client-generated PDF(s) via Brevo + optional SMS — see [Send invoice to client](#post-invoicesend) |
| GET | `/invoice/bulk-send/recipients` | Preview filtered clients before bulk invoice email send — see [Bulk invoice recipients](#get-invoicebulk-sendrecipients) |
| POST | `/invoice/bulk-send` | Send client-generated PDFs to filtered clients in bulk — see [Bulk invoice send](#post-invoicebulk-send) |
| GET | `/invoice/deliveries` | Delivery history for a client — see [Delivery history](#get-invoicedeliveries) |
| GET | `/invoice/deliveries/:deliveryId/download-url` | Signed URL to download a stored invoice PDF from Supabase |
| POST | `/invoice/deliveries/sync-tracking` | Bulk pull Brevo email tracking (paginated, with progress) — see [Bulk sync delivery tracking](#post-invoicedeliveriessync-tracking) |
| POST | `/invoice/deliveries/:deliveryId/sync-tracking` | Pull latest Brevo email tracking for one delivery (webhook fallback) — see [Sync delivery tracking](#post-invoicedeliveriesdeliveryidsync-tracking) |
| GET | `/invoice/properties` | Properties available for invoice generation |
| GET | `/invoice/clients` | Clients available for invoice generation |
| GET | `/invoice/stats` | Invoice generation statistics |

### POST `/invoice/generate`

Generate or refresh invoice rows for clients. Does **not** wipe user-entered financial data on existing rows.

**Body (JSON):**

| Field                  | Type    | Required | Description                          |
|------------------------|---------|----------|--------------------------------------|
| clientIds              | number[]| Yes      | Array of client IDs (Client.id)     |
| propertyAccountNumbers | string[]| No       | Optional filter by account numbers   |
| years                  | number[]| No       | Defaults to current year if omitted  |
| invoiceDefaults        | object  | No       | Metadata defaults only (see below)   |

**Behavior:**
- **New** invoice rows: created with `contingencyFee` defaulted from the client’s settings; financial fields start at `0` unless provided in `invoiceDefaults`.
- **Existing** invoice rows: **financial fields are preserved**. The server updates metadata (e.g. `invoiceDate`, `generatedDate`, `dueDate`) and **recalculates** `taxableSavings` and `invoiceAmount` from the stored appraised values, `taxRate`, `contingencyFee`, `flatFee`, and `bppInvoice`.
- Use **`PUT /action/edit-property`** with `yearlyData` to set 2026 values **before** generating invoices for verification.

**`invoiceDefaults`** — only these keys are applied on bulk generate (others are ignored to avoid overwriting saved data):

`invoiceDate`, `dueDate`, `generatedDate`, `protestDate`, `hearingDate`, `bppRendered`, `bppInvoice`, `bppPaid`, `paidDate`, `paymentNotes`, `underLitigation`, `underArbitration`

**Example:**  
`{ "clientIds": [1, 2], "propertyAccountNumbers": null, "years": [2026], "invoiceDefaults": {} }`

---

### GET `/invoice/properties`

Available properties for invoice generation. Query: `clientIds` (required, comma-separated or array). Each property includes **`existingInvoices`** for years `(currentYear - 4)` through `(currentYear + 1)` when present in the DB.

---

### GET `/invoice/clients`

Clients available for invoice generation.

---

### GET `/invoice/stats`

Invoice generation statistics. Query: `clientIds` (optional, comma-separated), `years` (optional).

---

### PATCH `/invoice/payment`

Mark one or more invoice rows paid or unpaid. When marking paid, optionally send a **payment acknowledgement email** to the client via **Brevo** (same account and sender as [POST `/invoice/send`](#post-invoicesend)).

**Body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `invoiceIds` | number \| number[] | Yes | Invoice row ID(s) to update |
| `isPaid` | boolean | Yes | `true` to mark paid; `false` to mark unpaid |
| `paidDate` | string | No | Payment date in **`MM/DD/YYYY`**. When `isPaid: true` and omitted, defaults to today |
| `paymentNotes` | string | No | Optional notes stored on the invoice row(s) when `isPaid: true` |
| `sendAcknowledgementEmail` | boolean | No | Default `false`. When `true` and `isPaid: true`, sends a Brevo acknowledgement email per affected **client** after the DB update succeeds |
| `customMessage` | string | No | Optional HTML body override for the acknowledgement email. If omitted, server uses the default payment acknowledgement template |

**Behavior:**

- **`isPaid: true`** — sets `isPaid`, `paidDate` (provided or today), and optionally `paymentNotes` on all matching invoice rows.
- **`isPaid: false`** — sets `isPaid: false` and clears `paidDate` on all matching invoice rows. Acknowledgement email is **not** sent when marking unpaid.
- **`sendAcknowledgementEmail: true`** — runs only when marking paid. Invoices are grouped by client; one email is sent per client. Property addresses and tax years on the paid invoice rows are included in the subject/body headline.
- Payment update and acknowledgement email are separate steps: invoices are marked paid first; email failures do **not** roll back the paid status. Check `data.acknowledgementEmail` for per-client send results.

**Recipient rules (acknowledgement email):**

- **Email:** `billingEmail` if set, otherwise `email` (same as invoice delivery).
- Clients without an email address are **skipped** (listed in `data.acknowledgementEmail.skipped`); the paid status update still succeeds.
- No SMS is sent for payment acknowledgement.

**Delivery logging:**

- Each acknowledgement send creates an `InvoiceDelivery` row (no PDF attachments).
- Brevo tags: `payment-acknowledgement`, `client-{clientId}`.
- Tracking (`emailLastEvent`, webhooks, manual sync) works the same as invoice delivery — see [Invoice email tracking](#invoice-email-tracking-brevo). The latest delivery for a client may be either an invoice send or a payment acknowledgement.

**Success response (200):**

```json
{
  "success": true,
  "message": "Invoice(s) marked as paid; acknowledgement email sent to 1 client(s)",
  "data": {
    "updatedCount": 2,
    "invoiceIds": [501, 502],
    "isPaid": true,
    "paidDate": "07/28/2026",
    "paymentNotes": "Check #1234",
    "acknowledgementEmail": {
      "attempted": 1,
      "sentCount": 1,
      "skippedCount": 0,
      "failedCount": 0,
      "sent": [
        {
          "clientId": 123,
          "recipientEmail": "billing@client.com",
          "deliveryId": 45,
          "brevoEmailMessageId": "abc123",
          "invoiceIds": [501, 502]
        }
      ],
      "skipped": [],
      "failed": []
    }
  }
}
```

When `sendAcknowledgementEmail` is `false` or omitted, `data.acknowledgementEmail` is absent and `message` is `"Invoice(s) marked as paid"` (or `"Invoice(s) marked as unpaid"`).

**Partial acknowledgement results:** If some clients receive email and others fail or are skipped, `message` summarizes counts (e.g. `"… acknowledgement email sent to 2 client(s), 1 failed"`). Inspect `data.acknowledgementEmail.failed` and `.skipped` for details.

**Common errors:**

| Status | Cause |
|--------|-------|
| 400 | Missing `invoiceIds`, `isPaid` not a boolean, invalid `paidDate` format |
| 404 | No matching invoice rows for the provided `invoiceIds` |
| 500 | Unexpected server error |

Brevo misconfiguration or per-client email failures appear in `data.acknowledgementEmail.failed` with HTTP **200** (paid status was still updated).

**Frontend flow (recommended):**

1. User marks invoice(s) paid and optionally checks **“Send payment acknowledgement email”**.
2. Confirm the client has `billingEmail` or `email` (from invoice detail or client record).
3. Call `PATCH /invoice/payment` with `sendAcknowledgementEmail: true` when the checkbox is checked.
4. Show success toast from `message`. If `data.acknowledgementEmail.failed.length > 0` or `.skipped.length > 0`, show a non-blocking warning with client names or reasons.
5. Refresh invoice list — `lastDelivery` may update to the new acknowledgement send.

**Example — mark paid with acknowledgement email:**

```javascript
const res = await fetch(`${API_BASE}/invoice/payment`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    invoiceIds: [501, 502],
    isPaid: true,
    paidDate: "07/28/2026",
    paymentNotes: "Check #1234",
    sendAcknowledgementEmail: true,
  }),
});
const json = await res.json();
if (!res.ok) throw new Error(json.message || "Payment update failed");
const ack = json.data?.acknowledgementEmail;
if (ack?.failed?.length || ack?.skipped?.length) {
  console.warn("Acknowledgement email issues", ack);
}
```

**Example — mark unpaid (no email):**

```javascript
await fetch(`${API_BASE}/invoice/payment`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    invoiceIds: 501,
    isPaid: false,
  }),
});
```

---

### POST `/invoice/send`

Email client-generated invoice PDF(s) to the client via **Brevo**, then optionally send an SMS notification that the invoice was emailed. **PDFs are also stored in Supabase Storage** (private `invoices` bucket), same pattern as signed contracts in the `contracts` bucket.

**PDFs are generated on the frontend** (same as contract preview PDFs). The backend does **not** build invoice PDFs — it accepts base64 attachments, uploads them to Supabase, then handles email/SMS delivery. When rendering PDFs, read **`invoices[].generatedDate`** (invoice generated / printed date) and **`invoices[].dueDate`** (payment due) from **`GET /api/invoice/:id`** or **`GET /api/invoice/clientid=:id`** — do not derive due date locally unless those fields are empty.

**Body (JSON):**

| Field           | Type    | Required | Description |
|-----------------|---------|----------|-------------|
| clientId        | number  | Yes      | `Client.id` |
| attachments     | object[]| Yes      | At least one PDF. Each item: `filename` (string), `contentBase64` (string, raw base64 **without** `data:application/pdf;base64,` prefix) |
| year            | number  | No       | Tax year (e.g. `2026`). Used in email subject/body and SMS text |
| sendSms         | boolean | No       | Default `true`. When `true`, sends SMS after email succeeds |
| customMessage   | string  | No       | Optional HTML email body. If omitted, server uses default invoice template |
| propertyAddresses | string[] | No    | Property addresses for the invoice(s) being sent. Scopes the email subject/headline (preferred when available) |
| invoiceIds      | number[]| No       | Invoice IDs being sent. Used to resolve property addresses when `propertyAddresses` is omitted |
| propertyIds     | number[]| No       | Property IDs being sent. Used to resolve property addresses when `propertyAddresses` is omitted |

**Property headline:** The email subject and body include only the properties for the invoice(s) being sent. Pass `propertyAddresses`, `invoiceIds`, and/or `propertyIds` so a single-property send for a multi-property client does not list every property. If none are provided, the server falls back to all non-archived properties with invoices for that client/year.

**Recipient rules:**
- **Email:** `billingEmail` if set, otherwise `email`. Returns **400** if neither is present.
- **SMS:** `phoneNumber` on the client record (normalized to E.164). If `sendSms: true` but phone is missing, email still sends and SMS is **skipped** (see response `warning`).

**Attachment rules:**
- Each file must be a valid PDF (checked via `%PDF` header).
- Max **10 MB** per attachment.
- Multiple PDFs allowed (e.g. one per property, or one combined PDF).

**Storage behavior:**
- On send, each PDF is uploaded to Supabase bucket **`invoices`** at path `clients/{clientId}/invoices/{year}/{batchTimestamp}/{filename}`.
- Paths are saved on the delivery record in `storedFiles`: `[{ "filename": "...", "storagePath": "..." }]`.
- If Supabase upload fails for a file, email/SMS still proceed; `data.warning` includes the storage error.
- Download later via `GET /invoice/deliveries/:deliveryId/download-url` (signed URL, like contract downloads).

**Success response (200):**

```json
{
  "success": true,
  "message": "Invoice sent successfully",
  "data": {
    "success": true,
    "clientId": 123,
    "recipientEmail": "billing@client.com",
    "recipientPhone": "+12145551234",
    "emailStatus": "SENT",
    "emailLastEvent": "SENT",
    "smsStatus": "ACCEPTED",
    "brevoEmailMessageId": "abc123",
    "deliveryId": 1,
    "storedFiles": [
      {
        "filename": "invoice-2026.pdf",
        "storagePath": "clients/123/invoices/2026/1718275200000/invoice-2026.pdf"
      }
    ]
  }
}
```

**Partial success:** If email succeeds but SMS fails, `message` is `"Invoice emailed successfully, but SMS notification failed"`, `data.smsStatus` is `"FAILED"`, and `data.warning` may contain the SMS and/or storage error. Email was still delivered.

**`smsStatus` values:** `ACCEPTED` | `FAILED` | `SKIPPED` (when `sendSms: false` or phone missing). Brevo accepts SMS asynchronously; carrier delivery happens later.

**Email tracking:** On successful send, `data.emailLastEvent` is initially `"SENT"`. Brevo webhooks update the delivery record asynchronously to `DELIVERED`, `OPENED`, `BOUNCED`, etc. Refresh invoice list or delivery history to see updated status (see [Invoice email tracking](#invoice-email-tracking-brevo)).

**Common errors:**

| Status | Cause |
|--------|-------|
| 400 | Missing `clientId`, missing/invalid attachments, client has no email |
| 404 | Client not found or archived |
| 500 | Brevo misconfiguration or delivery failure |

**Frontend flow (recommended):**

1. Load invoice rows via **`GET /api/invoice/:id`** (or client invoice list) and use **`generatedDate`** / **`dueDate`** on the PDF.
2. User selects client(s) and generates invoice PDF(s) in the browser.
3. Before send, confirm the client has `billingEmail` or `email` (and optionally `phoneNumber` for SMS). Client list from `GET /invoice/clients` includes `email` and `phoneNumber`; load `billingEmail` from client details if needed.
4. Convert each PDF to base64 and call `POST /invoice/send`.
5. Show success toast; if `data.warning` is present, show a non-blocking warning (e.g. “Email sent; SMS could not be delivered”).
6. Refresh invoice list or delivery history — `emailLastEvent` may still be `SENT` until Brevo webhooks arrive (usually seconds to minutes).
7. Optionally open delivery history from `GET /invoice/deliveries` for full send log.
8. Offer **Download** on history rows using `GET /invoice/deliveries/:deliveryId/download-url?fileIndex=0` (open signed URL in new tab or trigger download).

**Example — single PDF (jsPDF or similar):**

```javascript
// pdf: jsPDF instance or Uint8Array from your generator
const pdfBytes = pdf.output("arraybuffer"); // or your library’s byte export
const contentBase64 = btoa(
  new Uint8Array(pdfBytes).reduce((s, b) => s + String.fromCharCode(b), "")
);

const res = await fetch(`${API_BASE}/invoice/send`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    clientId: selectedClient.id,
    year: 2026,
    sendSms: true,
    propertyAddresses: [selectedProperty.propertyAddress], // scopes subject to this property
    propertyIds: [selectedProperty.id],
    attachments: [
      { filename: `invoice-${selectedClient.clientNumber}-2026.pdf`, contentBase64 },
    ],
  }),
});
const json = await res.json();
if (!res.ok) throw new Error(json.message || "Send failed");
if (json.data?.warning) console.warn(json.data.warning);
```

**Example — multiple property PDFs:**

```javascript
attachments: propertyPdfs.map(({ accountNumber, base64 }) => ({
  filename: `invoice-${accountNumber}-2026.pdf`,
  contentBase64: base64,
}))
```

**Example — data URI input:** If your generator returns `data:application/pdf;base64,XXXX`, strip the prefix before sending:

```javascript
const contentBase64 = dataUri.includes(",") ? dataUri.split(",")[1] : dataUri;
```

---

### GET `/invoice/bulk-send/recipients`

Preview clients matching invoice-page filters before sending invoice PDFs in bulk. This endpoint does **not** send email or generate PDFs; use it to show who will receive invoices and to let the user confirm/adjust selection.

**Query filters:**

| Query | Type | Description |
|-------|------|-------------|
| `invoiceIds` | number[] or comma string | Only these invoice row IDs |
| `clientIds` | number[] or comma string | Only invoices for these clients |
| `propertyIds` | number[] or comma string | Only invoices for these properties |
| `years` | number[] or comma string | Tax years, e.g. `2026` |
| `accountNumbers` | string[] or comma string | Exact invoice account numbers |
| `cadCounties` / `counties` | string[] or comma string | Case-insensitive county match |
| `search` | string | Account number, property address/county, client name/number/email |
| `paymentStatus` | string | `any` (default), `paid`, or `unpaid` |
| `minInvoiceAmount` | number | Minimum invoice amount |
| `maxInvoiceAmount` | number | Maximum invoice amount |
| `hasEmail` | boolean | Default `true`; filters to clients with `billingEmail` or `email` |
| `limit` | number | Max returned clients, capped at `500` |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "totalMatchedClients": 2,
    "totalReturned": 2,
    "truncated": false,
    "recipients": [
      {
        "clientId": 123,
        "clientNumber": "C-1001",
        "clientName": "Example Client",
        "recipientEmail": "billing@example.com",
        "recipientPhone": "+12145551234",
        "invoiceCount": 3,
        "totalInvoiceAmount": 1329.6,
        "invoiceIds": [501, 502, 503],
        "years": [2026],
        "propertyIds": [10, 11, 12],
        "propertyNumbers": ["000123", "000124"],
        "cadCounties": ["Dallas"],
        "invoices": [
          {
            "id": 501,
            "propertyId": 10,
            "accountNumber": "000123",
            "year": 2026,
            "generatedDate": "07/01/2026",
            "dueDate": "07/31/2026",
            "bppInvoice": "150",
            "bppInvoiceAmount": 150,
            "invoiceAmount": 443.2
          }
        ],
        "canSend": true,
        "skipReason": null,
        "lastDelivery": {
          "deliveryId": 42,
          "year": 2026,
          "recipientEmail": "billing@example.com",
          "emailSentAt": "2026-06-13T02:00:00.000Z",
          "emailDeliveredAt": "2026-06-13T02:01:15.000Z",
          "emailOpenedAt": null,
          "emailLastEvent": "DELIVERED",
          "emailBounceReason": null,
          "createdAt": "2026-06-13T02:00:00.000Z"
        }
      }
    ]
  }
}
```

**Frontend use:** call this when the user applies invoice-page filters, show `recipients`, allow deselection if needed, generate one PDF packet per selected client, then call `POST /invoice/bulk-send`.

---

### POST `/invoice/bulk-send`

Send client-generated invoice PDF(s) to multiple clients matching filters. The backend still does **not** generate PDFs; it receives base64 PDFs grouped by `clientId`, uploads them to Supabase, and sends each client through the same Brevo email/SMS path as `POST /invoice/send`.

**Body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `filters` | object | No | Same filters as `GET /invoice/bulk-send/recipients` |
| `attachmentsByClient` | array or object | Yes | Per-client PDF attachments. See examples below |
| `year` | number | No | Fallback tax year for email subject/body and storage path |
| `sendSms` | boolean | No | Default `true` |
| `customMessage` | string | No | Optional HTML body applied to all clients unless overridden per client |
| `limit` | number | No | Max matched clients to process, capped at `500` |

`attachmentsByClient` formats:

```json
[
  {
    "clientId": 123,
    "year": 2026,
    "attachments": [
      { "filename": "invoice-C-1001-2026.pdf", "contentBase64": "JVBERi0x..." }
    ]
  }
]
```

or:

```json
{
  "123": {
    "year": 2026,
    "attachments": [
      { "filename": "invoice-C-1001-2026.pdf", "contentBase64": "JVBERi0x..." }
    ]
  }
}
```

**Example request:**

```json
{
  "filters": {
    "years": [2026],
    "paymentStatus": "unpaid",
    "cadCounties": ["Dallas"]
  },
  "sendSms": true,
  "attachmentsByClient": [
    {
      "clientId": 123,
      "year": 2026,
      "attachments": [
        { "filename": "invoice-C-1001-2026.pdf", "contentBase64": "JVBERi0x..." }
      ]
    }
  ]
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Bulk invoice send completed: 1 sent, 0 failed, 0 skipped",
  "data": {
    "success": true,
    "summary": {
      "matchedClients": 1,
      "attempted": 1,
      "sent": 1,
      "failed": 0,
      "skipped": 0
    },
    "truncated": false,
    "results": [
      {
        "clientId": 123,
        "clientName": "Example Client",
        "success": true,
        "status": "SENT",
        "data": {
          "deliveryId": 10,
          "recipientEmail": "billing@example.com",
          "emailStatus": "SENT",
          "emailLastEvent": "SENT",
          "smsStatus": "ACCEPTED"
        }
      }
    ]
  }
}
```

**Partial failures:** One client failure does not stop the batch. Missing PDFs, clients that no longer match filters, missing email, invalid PDFs, or Brevo failures appear in `data.results[]` with `status: "SKIPPED"` or `status: "FAILED"` and an `error` string.

---

### Invoice email tracking (Brevo)

Invoice emails and **payment acknowledgement emails** are sent via **Brevo** transactional email. The backend stores a delivery audit row per send and updates it when Brevo reports **delivered**, **opened**, **bounced**, and other events (via webhook, with API polling as fallback).

**Frontend does not call Brevo directly.** Read tracking from API responses only.

**Delivery types:** Invoice PDF sends ([POST `/invoice/send`](#post-invoicesend)) and payment acknowledgement sends ([PATCH `/invoice/payment`](#patch-invoicepayment) with `sendAcknowledgementEmail: true`) both create `InvoiceDelivery` rows. `lastDelivery` on invoice list rows reflects the **most recent** successful email for that client, regardless of type.

#### Tracking object shape (`lastDelivery` / `emailTracking`)

Returned on invoice list groups, client invoice view, bulk-send preview, and delivery history:

| Field | Type | Description |
|-------|------|-------------|
| `deliveryId` | number | `InvoiceDelivery.id` — use for download URL and manual sync |
| `year` | number \| null | Tax year passed when the email was sent |
| `recipientEmail` | string | Email address used for that send |
| `emailSentAt` | string (ISO) \| null | When Brevo accepted the send |
| `emailDeliveredAt` | string (ISO) \| null | When Brevo reported inbox delivery |
| `emailOpenedAt` | string (ISO) \| null | When recipient opened the email (first open) |
| `emailLastEvent` | string \| null | Latest tracking status (see table below) |
| `emailBounceReason` | string \| null | Bounce reason when `emailLastEvent` is `BOUNCED` |
| `syncedAt` | string (ISO) \| null | When tracking was last synced from Brevo (webhook or manual sync) |
| `createdAt` | string (ISO) | Delivery record created |

#### `emailLastEvent` values

Use the same labels in the **Status** column, filter dropdown, and badges. See [Invoice email status filter & frontend naming](#invoice-email-status-filter--frontend-naming) for the full mapping to Brevo dashboard terms and `sendStatus` query params.

| `emailLastEvent` (API) | Brevo dashboard term | UI label (use exactly) | Badge tone |
|------------------------|----------------------|------------------------|------------|
| *(null / no `lastDelivery`)* | — | **Not sent** | `muted` |
| `SENT` | Sent (accepted) | **Sent** | `neutral` / gray |
| `DELIVERED` | Delivered | **Delivered** | `info` / blue |
| `OPENED` | Opened / Trackable openers | **Opened** | `success` / green |
| `BOUNCED` | Bounced / Hard bounce | **Bounced** | `danger` / red |
| `BLOCKED` | Blocked | **Blocked** | `danger` / red |
| `INVALID` | Invalid email | **Invalid email** | `danger` / red |
| `DEFERRED` | Deferred | **Deferred** | `warning` / amber |

**Note:** “Opened” means the **email** was opened, not that the PDF attachment was viewed. Brevo does not track PDF opens.

**Sync mapping:** Brevo’s transactional email API returns open events as `open` (webhooks may use `opened`). The server normalizes both to `emailLastEvent: "OPENED"`.

#### Invoice email status filter & frontend naming

Align portal wording with the **Brevo Transactional → Statistics** dashboard and the API.

**Rules:**

1. **Read status from** `row.lastDelivery?.emailLastEvent` (invoice list) or `delivery.emailTracking.emailLastEvent` (history). Values are **UPPERCASE** enums from the API.
2. **Filter query param** `sendStatus` on `GET /api/invoices` and `GET /api/archive-invoices` — pass the **lowercase** `filterValue` below (backend also accepts UPPERCASE).
3. **UI labels** — use the **displayLabel** column exactly (matches Brevo + portal table).
4. **Do not** use “Emails sent” for row status — that is a **dashboard aggregate** (count of sends), not a per-invoice state. Per row, use **Sent → Delivered → Opened** progression.
5. Multiple property rows for the same client share the same `lastDelivery` (one email per client).

**Filter dropdown + status column (recommended order):**

| `sendStatus` query | `emailLastEvent` match | displayLabel (UI) | Brevo equivalent |
|--------------------|------------------------|-------------------|------------------|
| `all` | *(no filter)* | **All** | All emails |
| `not_sent` | no `lastDelivery` | **Not sent** | — |
| `sent` | any sent (`isSent` or has `lastDelivery`) | **Sent** | Emails sent (any post-send state) |
| `delivered` | `DELIVERED` | **Delivered** | Delivered |
| `opened` | `OPENED` | **Opened** | Opened / Trackable openers |
| `bounced` | `BOUNCED` | **Bounced** | Bounced / Hard bounce |
| `blocked` | `BLOCKED` | **Blocked** | Blocked |
| `invalid` | `INVALID` | **Invalid email** | Invalid email |
| `deferred` | `DEFERRED` | **Deferred** | Deferred |

**Summary stats bar** (optional header above invoice table — aggregate from current list or a dedicated count endpoint):

| Stat label (UI) | How to compute | Brevo dashboard |
|-----------------|----------------|-----------------|
| **Emails sent** | Count rows where `lastDelivery != null` (or unique `clientId` with send) | “X emails sent” |
| **Delivered** | Count where `emailLastEvent === "DELIVERED"` | Delivered % |
| **Opened** | Count where `emailLastEvent === "OPENED"` | Trackable openers % |
| **Bounced** | Count where `emailLastEvent === "BOUNCED"` | Bounced / Hard bounce % |

**Copy-paste constants for frontend:**

```javascript
/** API enum on lastDelivery.emailLastEvent / emailTracking.emailLastEvent */
export const INVOICE_EMAIL_LAST_EVENT = {
  SENT: "SENT",
  DELIVERED: "DELIVERED",
  OPENED: "OPENED",
  BOUNCED: "BOUNCED",
  BLOCKED: "BLOCKED",
  INVALID: "INVALID",
  DEFERRED: "DEFERRED",
};

/** sendStatus query param for GET /api/invoices */
export const INVOICE_EMAIL_FILTER = {
  ALL: "all",
  NOT_SENT: "not_sent",
  SENT: "sent",
  DELIVERED: "delivered",
  OPENED: "opened",
  BOUNCED: "bounced",
  BLOCKED: "blocked",
  INVALID: "invalid",
  DEFERRED: "deferred",
};

/** Single source of truth: API value → UI label, filter, badge tone */
export const INVOICE_EMAIL_STATUS_META = {
  [INVOICE_EMAIL_LAST_EVENT.SENT]: {
    displayLabel: "Sent",
    filterValue: INVOICE_EMAIL_FILTER.SENT,
    tone: "neutral",
    brevoTerm: "Sent",
  },
  [INVOICE_EMAIL_LAST_EVENT.DELIVERED]: {
    displayLabel: "Delivered",
    filterValue: INVOICE_EMAIL_FILTER.DELIVERED,
    tone: "info",
    brevoTerm: "Delivered",
  },
  [INVOICE_EMAIL_LAST_EVENT.OPENED]: {
    displayLabel: "Opened",
    filterValue: INVOICE_EMAIL_FILTER.OPENED,
    tone: "success",
    brevoTerm: "Opened",
  },
  [INVOICE_EMAIL_LAST_EVENT.BOUNCED]: {
    displayLabel: "Bounced",
    filterValue: INVOICE_EMAIL_FILTER.BOUNCED,
    tone: "danger",
    brevoTerm: "Bounced",
  },
  [INVOICE_EMAIL_LAST_EVENT.BLOCKED]: {
    displayLabel: "Blocked",
    filterValue: INVOICE_EMAIL_FILTER.BLOCKED,
    tone: "danger",
    brevoTerm: "Blocked",
  },
  [INVOICE_EMAIL_LAST_EVENT.INVALID]: {
    displayLabel: "Invalid email",
    filterValue: INVOICE_EMAIL_FILTER.INVALID,
    tone: "danger",
    brevoTerm: "Invalid email",
  },
  [INVOICE_EMAIL_LAST_EVENT.DEFERRED]: {
    displayLabel: "Deferred",
    filterValue: INVOICE_EMAIL_FILTER.DEFERRED,
    tone: "warning",
    brevoTerm: "Deferred",
  },
};

export const INVOICE_EMAIL_NOT_SENT = {
  displayLabel: "Not sent",
  filterValue: INVOICE_EMAIL_FILTER.NOT_SENT,
  tone: "muted",
};

/** Filter dropdown options (order matches Brevo funnel) */
export const INVOICE_EMAIL_FILTER_OPTIONS = [
  { value: INVOICE_EMAIL_FILTER.ALL, label: "All" },
  { value: INVOICE_EMAIL_FILTER.NOT_SENT, label: INVOICE_EMAIL_NOT_SENT.displayLabel },
  { value: INVOICE_EMAIL_FILTER.SENT, label: "Sent" },
  { value: INVOICE_EMAIL_FILTER.DELIVERED, label: "Delivered" },
  { value: INVOICE_EMAIL_FILTER.OPENED, label: "Opened" },
  { value: INVOICE_EMAIL_FILTER.BOUNCED, label: "Bounced" },
  { value: INVOICE_EMAIL_FILTER.BLOCKED, label: "Blocked" },
  { value: INVOICE_EMAIL_FILTER.INVALID, label: "Invalid email" },
  { value: INVOICE_EMAIL_FILTER.DEFERRED, label: "Deferred" },
];

export function getInvoiceEmailStatusDisplay(lastDelivery) {
  if (!lastDelivery?.emailLastEvent) {
    return INVOICE_EMAIL_NOT_SENT;
  }
  return (
    INVOICE_EMAIL_STATUS_META[lastDelivery.emailLastEvent] ?? {
      displayLabel: lastDelivery.emailLastEvent,
      tone: "neutral",
    }
  );
}

// List request: GET /api/invoices?sendStatus=opened
// Badge: getInvoiceEmailStatusDisplay(row.lastDelivery).displayLabel → "Opened"
```

**Sync button label:** **Sync with Brevo** (calls `POST /invoice/deliveries/sync-tracking`).

#### Where tracking appears

| Endpoint | Field | Scope |
|----------|-------|-------|
| `GET /api/invoices` | `lastDelivery` on each property group | Latest send for that row’s `clientId` |
| `GET /api/archive-invoices` | `lastDelivery` on each property group | Same as above |
| `GET /api/invoice/clientid=:id` | `lastDelivery` at top level | Latest send for this client |
| `GET /invoice/bulk-send/recipients` | `lastDelivery` per recipient | Latest send for that client (optionally filtered by `years`) |
| `GET /invoice/deliveries` | `emailTracking` on each delivery row | Full history per send |
| `POST /invoice/send` | `data.emailLastEvent` | Initial value `"SENT"` immediately after send |

#### Multiple invoice rows per client

Invoice list rows are grouped by **property**, but emails are sent per **client** (one email may attach PDFs for multiple properties). Therefore:

- All property groups with the same `clientId` show the **same** `lastDelivery`.
- `lastDelivery` is always the **most recent** successful send (`emailStatus: "SENT"`) for that client, ordered by `emailSentAt` then `createdAt`.

Example: a client with 3 properties → 3 invoice table rows → all 3 show identical `lastDelivery` after one bulk send.

#### Frontend implementation guide

**Invoice table column (recommended):**

1. Read `row.lastDelivery?.emailLastEvent`.
2. If `lastDelivery` is `null`, show “Not sent” (or rely on `isSent: false`).
3. Map `emailLastEvent` to badge color/label (table above).
4. Optional tooltip: `recipientEmail`, `emailSentAt`, `emailDeliveredAt`, `emailOpenedAt`, `syncedAt`, `emailBounceReason`.

**After sending an invoice:**

```javascript
// Immediately after POST /invoice/send succeeds:
const { deliveryId, emailLastEvent } = json.data;
// emailLastEvent is "SENT" — show success toast
// Re-fetch GET /api/invoices or GET /invoice/deliveries after a short delay
// to pick up DELIVERED / OPENED from Brevo webhooks
```

**Polling / refresh strategy:**

- After send: refresh list once after ~30–60 seconds, or when user revisits the page.
- `GET /invoice/deliveries` auto-syncs stale deliveries (still `SENT` after 2+ minutes) from Brevo API (up to 3 per request).
- For manual refresh on one row: `POST /invoice/deliveries/:deliveryId/sync-tracking`.
- For bulk backfill from invoice list: `POST /invoice/deliveries/sync-tracking` (see [Bulk sync](#post-invoicedeliveriessync-tracking)).

**Example — status badge helper** (prefer `getInvoiceEmailStatusDisplay` from [naming convention](#invoice-email-status-filter--frontend-naming)):

```javascript
function invoiceEmailStatusLabel(lastDelivery) {
  const meta = getInvoiceEmailStatusDisplay(lastDelivery);
  return { label: meta.displayLabel, tone: meta.tone };
}
```

**Example — delivery history with download + tracking:**

```javascript
const res = await fetch(
  `${API_BASE}/invoice/deliveries?clientId=${clientId}&limit=20`,
  { headers: { Authorization: `Bearer ${token}` } }
);
const { data } = await res.json();

for (const row of data.deliveries) {
  const t = row.emailTracking; // same shape as lastDelivery
  console.log(t.emailLastEvent, t.emailOpenedAt);
  // Download: GET /invoice/deliveries/${row.id}/download-url?fileIndex=0
}
```

**Example — manual sync (dev / webhook fallback):**

```javascript
await fetch(`${API_BASE}/invoice/deliveries/${deliveryId}/sync-tracking`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
});
// Then re-fetch invoice list or deliveries
```

#### Backend webhook (ops — not called by frontend)

Brevo POSTs transactional events to:

`POST /webhooks/brevo?secret=<BREVO_WEBHOOK_SECRET>`

Configure in Brevo dashboard with events: `delivered`, `opened`, `soft_bounce`, `hard_bounce`, `blocked`, `invalid_email`. The server matches `message-id` to `brevoEmailMessageId` on the delivery record.

---

### GET `/invoice/deliveries`

Invoice email/SMS delivery history for a client (audit log). Stale tracking rows (still `SENT` after 2+ minutes) are auto-synced from Brevo on this request (up to 3 per call).

**Query:**

| Param    | Type   | Required | Description |
|----------|--------|----------|-------------|
| clientId | number | Yes      | `Client.id` |
| limit    | number | No       | Default `20`, max `100` |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "clientId": 123,
    "deliveries": [
      {
        "id": 1,
        "clientId": 123,
        "year": 2026,
        "recipientEmail": "billing@client.com",
        "recipientPhone": "+12145551234",
        "emailStatus": "SENT",
        "emailLastEvent": "OPENED",
        "emailDeliveredAt": "2026-06-13T02:01:15.000Z",
        "emailOpenedAt": "2026-06-14T09:30:00.000Z",
        "emailBounceReason": null,
        "smsStatus": "ACCEPTED",
        "emailSentAt": "2026-06-13T02:00:00.000Z",
        "smsSentAt": "2026-06-13T02:00:00.000Z",
        "brevoEmailMessageId": "abc123",
        "attachmentNames": ["invoice-2026.pdf"],
        "storedFiles": [
          { "filename": "invoice-2026.pdf", "storagePath": "clients/123/invoices/2026/1718275200000/invoice-2026.pdf" }
        ],
        "errorMessage": null,
        "createdAt": "2026-06-13T02:00:00.000Z",
        "emailTracking": {
          "deliveryId": 1,
          "year": 2026,
          "recipientEmail": "billing@client.com",
          "emailSentAt": "2026-06-13T02:00:00.000Z",
          "emailDeliveredAt": "2026-06-13T02:01:15.000Z",
          "emailOpenedAt": "2026-06-14T09:30:00.000Z",
          "emailLastEvent": "OPENED",
          "emailBounceReason": null,
          "createdAt": "2026-06-13T02:00:00.000Z"
        }
      }
    ]
  }
}
```

Use on a client invoice screen to show send history with tracking badges and download links. Prefer **`emailTracking`** for display logic (same shape as **`lastDelivery`** on invoice lists).

---

### POST `/invoice/deliveries/sync-tracking`

Bulk pull email tracking from Brevo for many delivery records. Use when webhooks were not configured yet or you need to backfill statuses on the invoice list.

**Timing:** Each delivery makes **2 Brevo API calls** (~0.3–1s each). A batch of **50** typically takes **~20–50 seconds**; **100** (max per request) takes **~40–100 seconds**. To sync **all** deliveries, paginate with `offset` until `hasMore` is `false` (e.g. 500 deliveries ≈ 5 requests × ~1 min ≈ **3–8 minutes total**). Webhooks are preferred for ongoing updates; use this endpoint for one-time backfill or manual refresh.

**Body or query (all optional):**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | number | `50` | Batch size per request (max `100`) |
| `offset` | number | `0` | Skip N eligible deliveries (for pagination) |
| `onlyStale` | boolean | `false` | When `true`, only sync rows still at `emailLastEvent: "SENT"` or null |
| `includeResults` | boolean | `false` | When `true`, include per-delivery `results[]` in response |

**Response (200):**

```json
{
  "success": true,
  "message": "48/50 synced in batch (1-50 of 237 total). 187 remaining — call again with offset=50",
  "data": {
    "totalEligible": 237,
    "offset": 0,
    "limit": 50,
    "attempted": 50,
    "synced": 48,
    "failed": 2,
    "remaining": 187,
    "hasMore": true,
    "nextOffset": 50,
    "durationMs": 42150,
    "onlyStale": false,
    "errors": [
      { "deliveryId": 12, "clientId": 5, "message": "Delivery has no Brevo messageId to sync" }
    ]
  }
}
```

**Server logs** (Fly.io / local console) show live progress:

```
[InvoiceDelivery bulk sync] starting batch 1-50 of 237 (limit=50, onlyStale=false)
[InvoiceDelivery bulk sync] 10/237 processed (10 ok, 0 failed)
[InvoiceDelivery bulk sync] 20/237 processed (20 ok, 0 failed)
...
[InvoiceDelivery bulk sync] 50/237 processed (48 ok, 2 failed)
[InvoiceDelivery bulk sync] batch complete — 48/50 synced, 2 failed, 42150ms, 187 remaining (nextOffset=50); see response errors[] for details
```

**Frontend — sync all pages:**

```javascript
async function syncAllInvoiceTracking({ onlyStale = false } = {}) {
  let offset = 0;
  const limit = 100;

  while (true) {
    const res = await fetch(
      `${API_BASE}/invoice/deliveries/sync-tracking?limit=${limit}&offset=${offset}&onlyStale=${onlyStale}`,
      { method: "POST", headers: { Authorization: `Bearer ${token}` } }
    );
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    const { synced, attempted, totalEligible, hasMore, nextOffset, durationMs } = json.data;
    console.log(json.message, `(${durationMs}ms)`);

    if (!hasMore) break;
    offset = nextOffset;
  }
}
```

Then re-fetch `GET /api/invoices` to refresh `lastDelivery` badges.

---

### POST `/invoice/deliveries/:deliveryId/sync-tracking`

Pull the latest email tracking events from Brevo for one delivery and update the database. Use when webhooks are delayed or unavailable (e.g. local dev).

**Path param:** `deliveryId` — `InvoiceDelivery.id`.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "deliveryId": 1,
    "emailTracking": {
      "deliveryId": 1,
      "year": 2026,
      "recipientEmail": "billing@client.com",
      "emailSentAt": "2026-06-13T02:00:00.000Z",
      "emailDeliveredAt": "2026-06-13T02:01:15.000Z",
      "emailOpenedAt": "2026-06-14T09:30:00.000Z",
      "emailLastEvent": "OPENED",
      "emailBounceReason": null,
      "createdAt": "2026-06-13T02:00:00.000Z"
    }
  }
}
```

**Errors:** `400` invalid id, `404` delivery not found, `500` Brevo API error.

---

### GET `/invoice/deliveries/:deliveryId/download-url`

Short-lived signed URL to download a stored invoice PDF from Supabase (private `invoices` bucket). Same pattern as `GET /api/contracts/:contractId/download-url`.

**Query:**

| Param      | Type   | Required | Description |
|------------|--------|----------|-------------|
| fileIndex  | number | No       | Index into `storedFiles` (default `0`) |
| expiresIn  | number | No       | URL TTL in seconds (default `3600`, max `86400`) |

**Response (200):**

```json
{
  "success": true,
  "url": "https://....supabase.co/storage/v1/object/sign/invoices/...",
  "filename": "invoice-2026.pdf",
  "storagePath": "clients/123/invoices/2026/1718275200000/invoice-2026.pdf"
}
```

**Frontend example:**

```javascript
const res = await fetch(
  `${API_BASE}/invoice/deliveries/${deliveryId}/download-url?fileIndex=0`,
  { headers: { Authorization: `Bearer ${token}` } }
);
const { url, filename } = await res.json();
window.open(url, "_blank"); // or <a href={url} download={filename}>
```

**Supabase setup:** Create a private storage bucket named **`invoices`** (same as **`contracts`** for DocuSign PDFs). Server uses `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_KEY`) for uploads and signed URLs.

**Backend environment (Brevo):** Set `BREVO_API_KEY`, `BREVO_INVOICE_SENDER_EMAIL` (verified sender in Brevo dashboard; invoice emails use `results@lsptax.com`), `BREVO_INVOICE_SENDER_NAME`, `BREVO_SMS_SENDER`, and `BREVO_WEBHOOK_SECRET` on the server. Configure Brevo transactional webhook URL to `https://<api-host>/webhooks/brevo?secret=<BREVO_WEBHOOK_SECRET>` with events `delivered`, `opened`, `soft_bounce`, `hard_bounce`, `blocked`, `invalid_email`. Replies are routed to the same invoice sender address. Legacy `BREVO_SENDER_EMAIL` is used only if `BREVO_INVOICE_SENDER_EMAIL` is unset. **Frontend does not need Brevo credentials.**

---

## CSV – `/csv`

All under prefix `/csv`. **Requires `Authorization: Bearer <token>`**.

All CSV endpoints use **multipart form-data** with field name `csv` (file).

### Client & property CSV

| Method | Endpoint                          | Description |
|--------|-----------------------------------|-------------|
| POST   | `/csv/preview-clients-properties` | Preview new vs updated clients and properties (no DB write). |
| POST   | `/csv/upload-clients-properties`  | Import CSV into Client and Property tables. Same format as preview. |

Expected CSV columns (header names): Client ID, Client Name, CAD Name, Mailing Address, City, Zip Code, Property Address, County, City, Contact Number, Email Address, Account Number, Account Type, BPP FEE, Contingency Fee, Flat Fee (see `src/config/csvColumnMapping.js` for alternate names).

### Invoice CSV

| Method | Endpoint                 | Description |
|--------|--------------------------|-------------|
| POST   | `/csv/preview-invoices`   | Preview new vs updated invoices (no DB write). Parsed rows include `generatedDate`, `dueDate`, and other metadata fields. |
| POST   | `/csv/upload-invoices`   | Import CSV into Invoice table. Upsert by propertyId + year. Persists date metadata (`invoiceDate`, `generatedDate`, `dueDate`, …) from CSV; recalculates financial fields server-side. |

Expected CSV: `year` (required for every row; must be a 4-digit number YYYY, e.g. 2026 or 2027), `accountNumber` (or `Account Number`; also matches combined accounts like `R477107/R524073` when the CSV row uses a single segment such as `R477107`), and invoice-related columns (camelCase or mapped names). Date columns **`invoiceDate`** / **`Invoice Date`**, **`dueDate`** / **`Due Date`**, and **`generatedDate`** / **`Generated Date`** (or **`Invoice Generated Date`**) are normalized to **`MM/DD/YYYY`** (zero-padded month/day). **`contingencyFee`** in CSV is a **percent** (e.g. `25` or `25%`). **`flatFee`** / **`Flat Fee`** is a **dollar** amount added to total due (e.g. `100` or `$100`). **`taxRate`** supports up to 4 decimal places. **`marketReduction`**, **`appraisedReduction`**, **`taxableSavings`**, and **`invoiceAmount`** in the CSV are **ignored** — the server always recalculates them. If **`noticeMarketValue`** / **`finalMarketValue`** are present, those totals are kept when they differ from land + improvement sums.

---

## Invoice yearly fields & calculations

Per-year property values are stored on the **`Invoice`** table (one row per `propertyId` + `year`). The Edit Property **yearly table** maps to these fields.

### Fee semantics

| Field | Level | Type | Notes |
|-------|-------|------|-------|
| `contingencyFee` | Client (default) + Invoice (per-year override) | **Percent** | e.g. `25` = 25%. Display as `%`, never `$`. Dropdown: `0`, `15`, `25`, `35`, `45`. |
| `flatFee` | Client + Property | **Dollars** (optional) | Not required to save. Property `flatFee` is a string; client `flatFee` is numeric. |

### Invoice date fields

| Field | Purpose | Set via |
|-------|---------|---------|
| `invoiceDate` | Legacy / optional invoice date label | CSV (`Invoice Date`), `yearlyData`, `invoiceDefaults` on generate |
| `generatedDate` | Date the invoice was generated (shown on PDF) | CSV (`Generated Date`, `Invoice Generated Date`), `yearlyData`, `invoiceDefaults` |
| `dueDate` | Payment due date (shown on PDF) | CSV (`Due Date`), `yearlyData`, `invoiceDefaults` |
| `protestDate` | Protest filing date | CSV, `yearlyData`, `invoiceDefaults` |
| `paidDate` | Date paid | CSV, `yearlyData`, `invoiceDefaults` |

All are **optional strings** — normalized to **`MM/DD/YYYY`** with zero-padded month and day on CSV upload, edit-property save, and invoice generate (e.g. `7/1/2026` → `07/01/2026`). Empty string or omitted = unset.

### Yearly invoice fields (`yearlyData` / `Invoice` columns)

All fields are **optional** on save. Use **camelCase** in new frontend code; display labels are supported for compatibility.

| camelCase | Display label | Type | Notes |
|-----------|---------------|------|-------|
| `protestDate` | Protest Date | string | `MM/DD/YYYY` (zero-padded) |
| `bppRendered` | BPP Rendered | string | Date or status text |
| `bppInvoice` | BPP Invoice | string | **BPP fee in dollars** on the invoice row (e.g. `"150"` or `"150.00"`). Parsed server-side as `bppInvoiceAmount`. Legacy ISO date strings (e.g. `"2026-03-18"`) are ignored for amount parsing. |
| `bppPaid` | BPP Paid | string | Date or status text |
| `noticeLandValue` | Notice Land Value | number | |
| `noticeImprovementValue` | Notice Improvement Value | number | |
| `noticeMarketValue` | Notice Market Value | number | Calculated as `noticeLandValue + noticeImprovementValue` unless explicitly sent |
| `noticeAppraisedValue` | Notice Appraised Value | number | |
| `finalLandValue` | Final Land Value | number | |
| `finalImprovementValue` | Final Improvement Value | number | |
| `finalMarketValue` | Final Market Value | number | Calculated as `finalLandValue + finalImprovementValue` unless explicitly sent |
| `finalAppraisedValue` | Final Appraised Value | number | |
| `marketReduction` | Market Reduction | number | **Always calculated** as `noticeMarketValue − finalMarketValue` |
| `appraisedReduction` | Appraised Reduction | number | **Always calculated** as `noticeAppraisedValue − finalAppraisedValue` |
| `hearingDate` | Hearing Date | string | `MM/DD/YYYY` |
| `invoiceDate` | Invoice Date | string | `MM/DD/YYYY`; legacy label — prefer `generatedDate` for PDF |
| `dueDate` | Due Date | string | `MM/DD/YYYY`; payment due on invoice PDF |
| `generatedDate` | Generated Date | string | `MM/DD/YYYY`; CSV also accepts `Invoice Generated Date` |
| `underLitigation` | Under Litigation | boolean | |
| `underArbitration` | Under Arbitration | boolean | |
| `taxRate` | Tax Rate | number | Up to **4** decimal places (e.g. `2.3456`) |
| `taxableSavings` | Taxable Savings | number | **Always calculated** as `appraisedReduction × (taxRate / 100)` |
| `contingencyFee` | Contingency Fee | number | **Percent**; per-year override |
| `flatFee` | Flat Fee | number | **Per-year flat fee in dollars** (optional); added to total due |
| `invoiceAmount` | Invoice Amount | number | **Always calculated** as `(taxableSavings × contingencyFee / 100) + bppInvoiceAmount + flatFee` |
| `paidDate` | Paid Date | string | `MM/DD/YYYY` |
| `paymentNotes` | Payment Notes | string | |
| `beginningMarket` | Beginning Market | number | |
| `endingMarket` | Ending Market | number | |
| `beginningAppraised` | Beginning Appraised | number | |
| `endingAppraised` | Ending Appraised | number | |

### Formulas (server-side)

**Full calculation chain** (applied on save, CSV import, and invoice generate when the derived field is not explicitly provided):

```
noticeMarketValue   = noticeLandValue + noticeImprovementValue
finalMarketValue    = finalLandValue + finalImprovementValue
marketReduction     = noticeMarketValue - finalMarketValue
appraisedReduction  = noticeAppraisedValue - finalAppraisedValue
taxableSavings      = appraisedReduction × (taxRate / 100)
bppInvoiceAmount    = parse dollars from bppInvoice (0 if empty or legacy date string)
invoiceAmount       = (taxableSavings × (contingencyFee / 100)) + bppInvoiceAmount + flatFee
```

**Read responses** also include **`bppInvoiceAmount`** (number) on each invoice DTO alongside the stored **`bppInvoice`** string.

**Invoice UI field mapping (2025+ template):**

| UI label | API field |
|----------|-----------|
| Beginning Appraised | `noticeAppraisedValue` |
| Ending Appraised | `finalAppraisedValue` |
| Appraised Reduction | `appraisedReduction` |
| Beginning Market | `noticeMarketValue` |
| Ending Market | `finalMarketValue` |
| Market Reduction | `marketReduction` |
| Overall Tax Rate | `taxRate` |
| Client Tax Savings | `taxableSavings` |
| Contingency Fee | `contingencyFee` / `contingencyFeePercent` (percent) |
| BPP Invoice | `bppInvoice` (stored string) / `bppInvoiceAmount` (parsed dollars) |
| Due / Total Fee Due | `invoiceAmount` (includes BPP) |
| Due Date | `dueDate` |
| Generated Date | `generatedDate` |
| Invoice Date | `invoiceDate` (legacy) |

Derived fields are auto-calculated only when omitted. If the edit-property API or invoice CSV upload sends a derived field explicitly, the server stores and returns that manual value.

All money outputs are rounded to **2 decimal places**.

### Frontend display checklist

- **Contingency:** show `25%`, not `$25` (`invoices[].contingencyFee` / `contingencyFeePercent`).
- **BPP:** display `invoices[].bppInvoiceAmount` (or parse `bppInvoice` for edit). Store dollar amounts in `bppInvoice` on save — not ISO dates.
- **Total due:** use `invoices[].invoiceAmount` (already includes BPP). Do not add `bppInvoiceAmount` again.
- **Invoice PDF dates:** use `invoices[].generatedDate` for the generated/printed date and `invoices[].dueDate` for payment due. Fall back to `invoiceDate` only if `generatedDate` is empty. Do not subtract months or compute due date in the browser when API values are present.
- **CAD mailing address:** use `propertyDetails.cadMailingAddressDisplay` (or `cadOwner` on list rows); do not require separate empty `cadMailingAddress` fields.
- **Tax rate input:** allow up to 4 decimal places.
- **Save:** send only changed fields per year for partial updates; do not require every column to be filled.

---

## Sample error responses (CSV uploads)

All CSV preview and upload endpoints return errors in this shape when something goes wrong:

- **`code`** – Error code (see below).
- **`message`** – Short, human-readable summary.
- **`details`** – Optional object with extra info (e.g. `line`, `errors`, `hint`).

**Error codes:** `CSV_NO_FILE` | `CSV_PARSE_ERROR` | `CSV_EMPTY` | `CSV_VALIDATION_ERROR` | `CSV_SERVER_ERROR`

### 1. No file sent (400)

When the request has no file or the field name is not `csv`:

```json
{
  "code": "CSV_NO_FILE",
  "message": "CSV file is required. Send a multipart request with field name 'csv' and a file."
}
```

### 2. Parse error – invalid structure (400)

When the CSV has inconsistent columns (e.g. header has 15 columns but a row has 14):

```json
{
  "code": "CSV_PARSE_ERROR",
  "message": "Invalid client/property CSV: row has 14 columns but header has 15. Every row must have the same number of columns as the header.",
  "details": {
    "line": 2,
    "expectedColumns": 15,
    "actualColumns": 14,
    "hint": "Check for missing or extra commas, or unquoted commas inside a field. Quote fields that contain commas."
  }
}
```

For invoice CSV the message will say "Invalid invoice CSV" instead of "Invalid client/property CSV".

### 3. Empty CSV (400)

When the file has only a header or no data rows:

```json
{
  "code": "CSV_EMPTY",
  "message": "The CSV has no data rows. It must contain a header row and at least one data row.",
  "details": {
    "hint": "Add data rows below the header."
  }
}
```

### 4. Validation error – invoice year (400)

When the invoice CSV has missing or invalid `year` (e.g. empty or not YYYY):

```json
{
  "code": "CSV_VALIDATION_ERROR",
  "message": "Invalid year in invoice CSV. Year is required for every row and must be a 4-digit number (YYYY), e.g. 2024.",
  "details": {
    "errors": [
      { "line": 2, "message": "year is required and cannot be empty" },
      { "line": 5, "message": "year must be a 4-digit number (YYYY), e.g. 2024" }
    ],
    "hint": "Ensure the 'year' column exists and every row has a value like 2024 or 2025."
  }
}
```

### 5. Server error (500)

When an unexpected error occurs (e.g. database or internal failure):

```json
{
  "code": "CSV_SERVER_ERROR",
  "message": "Failed to import invoice CSV.",
  "details": {
    "error": "Original error message from the server."
  }
}
```

Preview endpoints use messages like "An error occurred while previewing the invoice CSV." or "An error occurred while previewing the client/property CSV."

---

## Reporting – `/report`

All under prefix `/report`. **Requires `Authorization: Bearer <token>`**.

These endpoints are **purpose-built reports** (not the generic table exports under `/api/download-*` and not the CSV upload tooling under `/csv/*`).

### GET `/report/counties`

Return all available counties in the database (optimized: `distinct` on `Property.cadCounty`).

**Response (200)**

```json
{
  "counties": ["All", "Bexar", "Travis"]
}
```

### GET `/report/properties?county=`

Download a CSV of properties, optionally filtered by county.

**Query params**

| Param    | Type                 | Required | Description |
|----------|----------------------|----------|-------------|
| `county` | string \| string[]    | No       | Filter by county. Supports `?county=Bexar`, `?county=Bexar,Travis`, or repeated `?county=Bexar&county=Travis`. Use `?county=All` (or include `All` among values) to return all. If omitted, returns all non-archived properties. |

**Response (200)**: `text/csv` attachment.

**CSV columns**

- `NAME ON CAD`
- `PROPERTY ADDRESS`
- `COUNTY`
- `Account`

### GET `/report/billed`

JSON billed report. Sums `invoiceAmount` where `invoiceDate` is parseable.

**Query params**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `groupBy` | string | No | `taxYear` (protest year), `county`, `client`, or `property`. Omit to return window totals only. |

**Response (200)** includes `billedThisMonth`, `billedLastMonth`, `billedYtd`, `billedCalendarYear`, date windows, and `collectedDefinition`. When `groupBy` is set, also `groups`.

### GET `/report/collected`

JSON collected report (v1 full-pay). Sums `invoiceAmount` for `isPaid` invoices, grouped by month of `paidDate`.

**Response (200)** includes collected window totals and `byMonth`: `{ year, month, collected }`.

### GET `/report/unpaid`

JSON unpaid / AR snapshot. Outstanding is the full unpaid `invoiceAmount` (no Payment rows yet).

**Query params**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `view` | string | No | `largest` returns up to 25 (or `limit`) outstanding clients instead of 10. |
| `limit` | number | No | Cap for largest-client list when `view=largest` (max 100). |

### GET `/report/reductions`

Protest value reductions and estimated tax savings, plus `byCounty`.

### GET `/report/acquisition/avg-properties`

Average non-archived properties per non-archived `CLIENT`.

### GET `/report/clients/active`

Count of non-archived clients (`type=CLIENT`). v1 until client status ships in Week 3.

---

## Conventions

- **Request bodies:** Use **camelCase** for all field names (e.g. `clientName`, `email`, `phoneNumber`, `mailingAddressCityTxZip`, `propertyData.accountNumber`). Exception: `yearlyData` also accepts legacy **display labels** (e.g. `"Tax Rate"`) for backward compatibility.
- **Content-Type:** `application/json` for JSON bodies.
- **Errors:** Typically `4xx` for validation/client errors, `5xx` for server errors; response body includes `message` and often `error` or `errors`.
- **Percents vs dollars:** `contingencyFee` is always a **percent** (client default + per-year invoice override). `flatFee` is an optional **dollar** amount. Do not interchange them.
- **Account numbers:** Search is leading-zero tolerant; stored values may include leading zeros (e.g. Harris County). Prefer `cadMailingAddressDisplay` over raw empty CAD columns.
- **Maintenance scripts** (operators, not API): `npm run backfill-2026-invoices` creates missing invoice rows for 2026; `npm run backfill-account-leading-zero` aligns account numbers with CSV leading zeros.
