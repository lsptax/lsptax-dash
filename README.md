# lsptax-dash

Monorepo for LSPTax portal (frontend + API). Created for local testing before retiring the separate `web` and `new-backend` repos.

## Layout

| Directory | Description |
|-----------|-------------|
| `web/` | React + Vite frontend (Vercel) |
| `api/` | Express + Prisma backend (Fly.io) |

## Specs

- [`docs/specs/financial-dashboard-13-week.md`](docs/specs/financial-dashboard-13-week.md) — Owner reports, dashboard, tracking fields, then Payments (13 weeks)

## API documentation

- [`api/doc/api_v2.md`](api/doc/api_v2.md) — API v2 reference
- [`api/doc/document-signing-process.md`](api/doc/document-signing-process.md) — DocuSign / signing flow

## Local development

From the **repo root** (after `npm run install:all` once):

| Command | What it starts |
|---------|----------------|
| `pnpm dev` / `npm run dev` | API (`http://localhost:3000`) **and** web (Vite) together |
| `npm run local` | Web only, proxied to `http://localhost:3000` (start API separately) |
| `npm run prod` | Web only, proxied to `https://lsptax-dash.fly.dev` — no local API needed |
| `npm run api:dev` | API only |

In dev, the frontend uses relative URLs; Vite proxies `/api`, `/auth`, `/invoice`, etc. to whichever backend URL the script sets (see `web/vite.config.ts`).

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
# lsptax-dash
# lsptax-dash
