# LSP Tax Backend API v2
<!-- test -->
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
| `search`| string | —      | **Clients:** client name, number, email, or phone. **Properties:** property id, account number, or client name. **Invoices:** client number or property/account number. All case-insensitive, partial match. Omit for no filter. |
| `accountType`| string | —  | **Clients/Properties only (optional):** filter by account type. Allowed: `real`, `bpp` (case-insensitive). |

**Server-side search**

- **Client list** (`/api/clients`, `/api/archive_clients`): filter by **client name**, **client number**, **email**, or **phone number** (partial, case-insensitive). You can also search by **Client ID** using `#<id>`, e.g. `search=#231` will match only the client with `clientId = 231` (and will not be treated as phone/email text).
- **Property list** (`/api/properties`, `/api/archive_properties`): filter by **property id** (numeric), **account number**, or **client name** (partial, case-insensitive).
- **Invoice list** (`/api/invoices`, `/api/archive-invoices`): filter by **client number** or **property/account number** (partial, case-insensitive).

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
| GET    | `/api/client`         | Client details. Query: `clientId`. Response includes full client (e.g. clientName, email, phoneNumber, mailingAddress, mailingAddressCityTxZip, **contingencyFee**, etc.) and `properties`. (Lifecycle is now per-property; see `/api/property`.) |
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

Fetch a single property with its related client and invoices.

**Query params**

| Param        | Type   | Required | Description |
|-------------|--------|----------|-------------|
| `propertyId`| number | Yes      | Property ID (`Property.id`) |

**Response (200)**

```json
{
  "propertyDetails": { "id": 1, "clientId": 1, "accountNumber": "P378436", "...": "..." },
  "client": { "id": 1, "type": "CLIENT", "typeOfAcct": "BPP", "...": "..." },
  "invoices": [],
  "lifecycle": { "phaseId": null, "stepId": null, "completedAt": null, "notes": null, "history": [], "phases": [/* ... */] },
  "hearings": [
    {
      "id": 1,
      "propertyId": 1,
      "date": "2026-05-15T14:00:00.000Z",
      "status": "SCHEDULED",
      "notes": null,
      "createdAt": "2026-05-10T12:00:00.000Z",
      "updatedAt": "2026-05-10T12:00:00.000Z"
    }
  ]
}
```

Notes:
- `propertyDetails` contains **only property fields** (no nested `client`, `invoices`, or raw `lifecycle*` columns).
- `client`, `invoices`, `lifecycle`, and **`hearings`** are returned **once** at the top level to avoid duplication.
- Property **`hearings`** are compact rows (no nested `property` / `client` — you already have those on the same response).

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
    "weekStart": "2026-05-17T18:30:00.000Z",
    "weekEnd": "2026-05-24T18:29:59.999Z"
  }
}
```

| Field | Description |
|-------|-------------|
| `meetingsThisWeek` | Hearings with `date` in the current calendar week (Mon–Sun, server timezone) |
| `meetingsToday` | Hearings with `date` today |
| `totalScheduled` | Hearings with `status` = `SCHEDULED` (includes today’s slot even if the clock time has passed; use status `ATTENDED` / `CANCELLED` / `NO_SHOW` when done) |

**`GET /api/property`** — includes **`hearings`** array for that property (sorted by `date` ascending; compact rows without nested client/property).

### Invoices

| Method | Endpoint                 | Description                                      |
|--------|---------------------------|--------------------------------------------------|
| GET    | `/api/invoice/:clientId`  | Invoices by client ID                           |
| GET    | `/api/invoices`           | All invoices (grouped by client). Query: `limit`, `offset`, `search` |
| GET    | `/api/archive-invoices`   | Archived invoices. Query: `limit`, `offset`, `search` |

### Other

| Method | Endpoint                         | Description           |
|--------|----------------------------------|-----------------------|
| GET    | `/api/stats`                     | Dashboard counts + **`hearings`** stats — see [GET `/api/stats`](#get-apistats) under Hearings |
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
| contingencyFee          | string | No       | Contingency fee (e.g. "25" for 25%) |

**Example:**
`{ "clientName": "Acme Inc", "clientNumber": "100", "email": "acme@example.com", "phoneNumber": "", "mailingAddressCityTxZip": "", "typeOfAcct": "", "contingencyFee": "25" }`

---

#### POST `/action/edit-client`

Update a client.

**Body:**

| Field         | Type   | Required | Description                          |
|---------------|--------|----------|--------------------------------------|
| clientId      | number | Yes      | Client ID                            |
| clientDetails | object | Yes      | Fields to update (camelCase): clientName, email, phoneNumber, mailingAddress, mailingAddressCityTxZip, typeOfAcct, **contingencyFee**, etc. (Lifecycle is now per-property; see `/action/edit-property`.) |

**Example:**  
`{ "clientId": 1, "clientDetails": { "clientName": "Updated Name", "email": "updated@example.com", "contingencyFee": "25" } }`

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
| contingencyFee          | string | No       |

**Example:**  
`{ "clientName": "Prospect Name", "email": "prospect@example.com", "phoneNumber": "", "mailingAddress": "", "mailingAddressCityTxZip": "", "contingencyFee": "25" }`

---

#### PUT `/action/edit-prospect`

**Body:** `{ "prospectId": 1, "prospectDetails": { ... } }` — use camelCase keys in `prospectDetails` (e.g. clientName, email, phoneNumber, mailingAddress, mailingAddressCityTxZip, **contingencyFee**, etc.).

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

**Body:** `{ "propertyId": 1, "propertyDetails": { ... }, "yearlyData": { "2025": { ... } } }`  
Use camelCase in `propertyDetails` (supports the same property keys as add-property, including `propertyAddress`, plus **`lifecyclePhase`** / **`lifecycleStep`** / **`lifecycleNotes`** — see [Property lifecycle](#property-lifecycle-phase-1) for rules). `yearlyData` is optional (invoice fields per year).

**Example (lifecycle only):**  
`{ "propertyId": 1, "propertyDetails": { "lifecycleStep": "authorizationFiling", "lifecycleNotes": "Filed" } }`

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

### POST `/invoice/generate`

Generate invoices for clients.

**Body (JSON):**

| Field                  | Type    | Required | Description                          |
|------------------------|---------|----------|--------------------------------------|
| clientIds              | number[]| Yes      | Array of client IDs (Client.id)     |
| propertyAccountNumbers | string[]| No       | Optional filter by account numbers   |
| years                  | number[]| No       | Defaults to current year if omitted  |
| invoiceDefaults        | object  | No       | Default values for generated invoices|

**Example:**  
`{ "clientIds": [1, 2], "propertyAccountNumbers": null, "years": [2025], "invoiceDefaults": {} }`

---

### GET `/invoice/properties`

Available properties for invoice generation. Query: `clientIds` (required, comma-separated or array).

---

### GET `/invoice/clients`

Clients available for invoice generation.

---

### GET `/invoice/stats`

Invoice generation statistics. Query: `clientIds` (optional, comma-separated), `years` (optional).

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
| POST   | `/csv/preview-invoices`   | Preview new vs updated invoices (no DB write). |
| POST   | `/csv/upload-invoices`   | Import CSV into Invoice table. Upsert by propertyId + year. |

Expected CSV: `year` (required for every row; must be 4-digit number YYYY, e.g. 2024), `accountNumber`, and invoice-related columns (camelCase or mapped names).

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

---

## Conventions

- **Request bodies:** Use **camelCase** for all field names (e.g. `clientName`, `email`, `phoneNumber`, `mailingAddressCityTxZip`, `propertyData.accountNumber`).
- **Content-Type:** `application/json` for JSON bodies.
- **Errors:** Typically `4xx` for validation/client errors, `5xx` for server errors; response body includes `message` and often `error` or `errors`.
