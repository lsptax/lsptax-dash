# LSP Tax Backend API

## Local dev

```bash
npm install
npm run dev
```

- Base URL: `http://localhost:3000`
- Most routes require a Bearer token (see Postman collection).

## Properties endpoints

### List properties

- `GET /api/properties`
  - **query params**
    - `limit` (number)
    - `offset` (number)
    - `search` (string)
    - `accountType` (string, optional): **`real`** or **`bpp`**
- Convenience routes:
  - `GET /api/properties/real` (same as `accountType=real`)
  - `GET /api/properties/bpp` (same as `accountType=bpp`)

### List archived properties

- `GET /api/archive_properties`
  - **query params**
    - `limit` (number)
    - `offset` (number)
    - `search` (string)
    - `accountType` (string, optional): **`real`** or **`bpp`**

### Download properties export

- XLSX: `GET /api/download-properties-xlsx`
  - **query params**
    - `accountType` (string, optional): **`real`** or **`bpp`**
- CSV: `GET /api/download-properties-csv`
  - **query params**
    - `accountType` (string, optional): **`real`** or **`bpp`**
- Convenience routes:
  - `GET /api/download-properties-real-csv`
  - `GET /api/download-properties-bpp-csv`

## Contracts endpoints

### Send docs (unified)

- `POST /api/contracts/send-docs`
  - **body**: `{ "clientId": number, "type": "contract" | "aoa" | "aoa_all" | "all_docs", "propertyId"?: number }`
  - **notes**:
    - `propertyId` is required only when `type="aoa"`
    - `type="aoa_all"` sends **one envelope** containing **one AOA per property**
    - `type="all_docs"` sends **one envelope** containing **contract + all AOAs**

## Postman

- Import `postman_collection.json`
