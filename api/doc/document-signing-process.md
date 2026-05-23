# Document Signing Process (DocuSign + Supabase)

This document describes the contract and AOA signing flow for **frontend integration** and **future reference**.

---

## Overview

- **Client Contract** – One per client. Generated from client data + all their properties; sent for signature via DocuSign.
- **AOA (Authorization of Agent)** – One per property. Generated for a single property; sent for signature via DocuSign.

After the signer completes in DocuSign, the backend receives a webhook, downloads the signed PDF from DocuSign, stores it in Supabase Storage, and updates the contract record. The frontend can then offer a “Download signed” link using a short-lived URL from the API.

---

## Frontend Flow

### 1. Preview before sending

User chooses “Create Contract” (client-level) or “Generate AOA” (property-level). Before sending, show a preview.

**Client Contract**

| Step | API | Body | Response |
|------|-----|------|----------|
| Preview | `POST /api/contracts/preview-contract` | `{ "clientId": number }` | `{ "contractPdf": "<base64>" }` |

**AOA (per property)**

| Step | API | Body | Response |
|------|-----|------|----------|
| Preview | `POST /api/contracts/preview-aoa` | `{ "clientId": number, "propertyId": number }` | `{ "aoaPdf": "<base64>" }` |

**UI:** Decode the base64 and display in a PDF viewer (e.g. iframe with `data:application/pdf;base64,<base64>`, or a library like PDF.js). Show a “Looks good, send for signing” (or “Send to client”) button.

All requests require: `Authorization: Bearer <token>`.

---

### 2. Send for signing

After the user confirms from the preview:

**Unified send endpoint**

| Step | API | Body | Response |
|------|-----|------|----------|
| Send | `POST /api/contracts/send-docs` | `{ "clientId": number, "type": "contract" \| "aoa" \| "aoa_all" \| "all_docs", "propertyId"?: number }` | `{ "success": true, ... }` |

**UI:** Show success message; optionally show “Contract sent – signer will receive email from DocuSign.” Store `contract.id` and/or `envelopeId` if you need to poll or show status.

---

### 3. List contracts for a client

To show “Contracts” or “AOAs” on the client profile:

| API | Response |
|-----|----------|
| `GET /api/contracts/client/:clientId` | Array of contracts: `{ id, type, status, clientId, propertyId, envelopeId, signedAt, signedFileUrl, createdAt, property?: { id, accountNumber } }` |

**Contract types:** `CLIENT_CONTRACT` | `AOA`  
**Statuses:** `DRAFT` | `SENT` | `COMPLETED` | `DECLINED` | `VOIDED`

**UI:** Filter by `type` to show “Client contracts” vs “AOAs”. Use `status` for badges (e.g. Sent, Completed, Declined). For AOA rows, use `property.accountNumber` to label which property.

---

### 4. Download signed PDF

When `status === "COMPLETED"` and you want to offer “Download signed”:

| API | Query | Response |
|-----|-------|----------|
| `GET /api/contracts/:contractId/download-url?expiresIn=3600` | `expiresIn` optional (seconds, max 86400) | `{ "url": "<signed URL>" }` |

**UI:** Call this API, then redirect user to `url` or open in new tab. The URL is short-lived (default 1 hour); generate a new one each time the user clicks “Download signed”.

If the contract is not yet completed or the signed file is not stored, the API returns 404 with a message like “Signed document not yet available”.

---

### 5. Optional: Poll status (fallback)

If you don’t rely on the webhook (e.g. during development or if webhook is not configured), you can manually poll:

| API | Body | Response |
|-----|------|----------|
| `POST /api/contracts/poll-status` | `{ "envelopeId": string }` | `{ "success": true, "status": "sent" \| "completed" \| ... }` |

When status is `completed`, the backend will also fetch the signed PDF from DocuSign and store it in Supabase. Prefer using the webhook in production so status updates and stored PDFs happen automatically.

---

## Contract status lifecycle

```
DRAFT → SENT → COMPLETED
              → DECLINED
              → VOIDED
```

- **DRAFT** – Created but not sent (current flow creates contracts in SENT when you call send).
- **SENT** – Envelope sent to signer (DocuSign email sent).
- **COMPLETED** – Signer finished; signed PDF stored in Supabase; `signedAt` and `signedFileUrl` set.
- **DECLINED** – Signer declined.
- **VOIDED** – Envelope voided (e.g. cancelled by sender).

---

## Error handling (frontend)

- **400** – Validation (e.g. missing `clientId`, `propertyId`). Response body: `{ "success": false, "message": "..." }`.
- **404** – Client/property/contract not found, or “Signed document not yet available” for download URL.
- **401** – Missing or invalid JWT (include `Authorization: Bearer <token>`).
- **500** – Server error (e.g. DocuSign/Supabase failure). Show a generic “Something went wrong” and optionally retry.

---

## Backend behavior (for reference)

- **Preview** – Fills the template PDF (client contract or AOA) with client/property data using `pdf-lib` and returns base64. No DocuSign call.
- **Send** – Fills PDF, creates a DocuSign envelope with one document, sends to the client’s email, creates a `Contract` row with `status: SENT` and `envelopeId`.
- **Webhook** – `POST /webhooks/docusign` (no auth). When DocuSign sends “envelope completed”, backend downloads the signed PDF from DocuSign, uploads to Supabase bucket `contracts`, and updates the contract to `COMPLETED` with `signedFileUrl` and `signedAt`.
- **Sync status** – Call **POST /api/contracts/sync-client-status** with `{ "clientId": 434 }` to poll DocuSign for that client's SENT contracts and update status (use when webhook is not available, e.g. localhost).
- **Download URL** – Backend uses the stored `signedFileUrl` (path in Supabase) to create a short-lived signed URL for the private bucket.

---

## Verifying PDF templates

Before changing `pdfFieldMappings.js` or DocuSign anchor strings, confirm the template PDFs match.

### 1. Form field names (Date, Title, etc.)

Run the verification script to list **exact** AcroForm field names in each template:

```bash
node scripts/verify-pdf-templates.js
```

Use the printed names to ensure mappings in `src/utils/pdfFieldMappings.js` match. For example, AOA must have fields named exactly **"Date Agents Authority Ends"** and **"Title"** for pre-fill to work.

### 2. Signature anchor text

DocuSign places the signature tab using **visible text** in the PDF (anchor string). The backend uses:
- **Contract:** anchor `"Signature of Owner/Representative"` — the signature tab is placed above this line.
- **AOA (50-162):** anchor `"Signature of Property Owner, Property Manager or Other Person"` — the signature tab is placed above this line.

To verify in a template: open the PDF, use Find (Ctrl+F / Cmd+F) for the anchor string, and confirm it appears where the signer should sign. If the template text changes, update the anchor in `src/controller/docuSignUtils.js` (or pass a different `anchorString` when calling `sendEnvelope` for that document type).

---

## Future ideas

- **Resend / reminder** – DocuSign supports “resend” and “reminder” APIs; could add endpoints to resend or send a reminder for a given `envelopeId`.
- **Multiple signers** – Current flow is one signer per envelope; DocuSign supports multiple signers and routing order for more complex agreements.
- **Void envelope** – Allow staff to void a sent envelope from the UI; call DocuSign void API and set contract status to `VOIDED`.
- **Audit trail in UI** – Show “Sent at”, “Completed at”, “Declined at” from contract record and optionally pull DocuSign audit events for more detail.
- **Preview without property** – If client has no properties yet, preview/send could show a validation message or a “Add property first” CTA.
- **Bulk send AOA** – Send AOA for all properties of a client in one action (multiple envelopes or one envelope with multiple documents), with clear labeling per property.
- **DocuSign embedded signing** – Instead of email link, open DocuSign signing in an iframe (embedded signing) for a smoother in-app experience; requires extra DocuSign setup and a return URL.
- **Templates in DocuSign** – For static documents, consider DocuSign templates and merge fields; current flow uses fillable PDFs filled in the backend for flexibility (e.g. dynamic property rows in AOA).
