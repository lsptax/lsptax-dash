# lsptax-dash

Monorepo for LSPTax portal (frontend + API). Created for local testing before retiring the separate `web` and `new-backend` repos.

## Layout

| Directory | Description |
|-----------|-------------|
| `web/` | React + Vite frontend (Vercel) |
| `api/` | Express + Prisma backend (Fly.io) |

## API documentation

- [`api/doc/api_v2.md`](api/doc/api_v2.md) — API v2 reference
- [`api/doc/document-signing-process.md`](api/doc/document-signing-process.md) — DocuSign / signing flow

## Local development

From the **repo root** (after `npm run install:all` once):

| Command | Web dev server | API target (via Vite proxy) |
|---------|----------------|-----------------------------|
| `npm run local` | `web/` | `http://localhost:3000` — start API separately (see below) |
| `npm run prod` | `web/` | `https://lsptax-server.fly.dev` — no local API needed |

In dev, the frontend uses relative URLs; Vite proxies `/api`, `/auth`, `/invoice`, etc. to whichever backend URL the script sets (see `web/vite.config.ts`).

### API (only for `npm run local`)

```bash
npm run api:dev
# or: cd api && npm run dev
```

Copy `.env` into `api/` from your existing backend if you have not already (`api/.env.example` is a template).

### Install

```bash
npm run install:all
```

`install:all` runs `setup:env` first: copies `../new-backend/.env` → `api/.env` when present, otherwise `api/.env.example`. Prisma `generate` works without a real DB; you still need a valid `DATABASE_URL` in `api/.env` to run the API locally.

### Web only (manual)

```bash
cd web
cp .env.example .env
npm run dev
```

## Deploy (when ready)

- **Vercel:** connect this repo, set **Root Directory** to `web`
- **Fly:** deploy from `api/` (or set build context to `api`); `fly.toml` lives in `api/`

## Original repos (unchanged)

- Frontend: `JF-Capitals/lsptax-web`
- Backend: `JF-Capitals/lsptax-server`
# lsptax-dash
