# Arsitektur OpenPost

Sumber kebenaran: `server.ts` (entrypoint). `server.cjs` dan `dist/server.cjs`
adalah output bundle esbuild — jangan diedit manual, jangan di-commit.

## Komponen

- **Frontend**: React + Vite (`src/`). `npm run dev:frontend` (Vite saja),
  `VITE_API_URL` menunjuk ke backend.
- **Backend**: Express di `server.ts` + `server/src/` (routes, controllers,
  services, middleware). `npm run dev` / `dev:backend` / `dev:api`.
- **Monolith (default)**: satu proses Express + Vite middleware di port 3000.
  `dev:monolith` = `dev`. Build: `vite build` + esbuild `server.ts` →
  `dist/server.cjs`; run: `npm start`.
- **Desktop**: Electron (`electron/`), agent bridge `agent/desktop-agent.cjs`
  (`npm run bridge`, port 8765). Build: `build:electron*` → `release/`.

## Request flow

Browser → Express (`server.ts`) → `requireAuth` (JWT) →
`requireWorkspaceAccess` / `assertWorkspaceAccess`+`assertRecordAccess`
(ownership) → controller → service → Prisma → DB.

## Env & config

Loader tunggal `server/src/env.ts`: `NODE_ENV=production` →
`.env.production`, selain itu `.env`. Process env selalu menang
(`override: false`). Validasi fail-fast di `server/src/config.ts`
(`JWT_SECRET` wajib ≥32 char di production).

## Matriks database (Prisma)

| File | Peran |
|---|---|
| `prisma/schema.template.prisma` | Template, placeholder `@@PROVIDER@@` / `@@ID@@` |
| `prisma/schema.prisma` | Hasil generate (di-ignore, jangan edit manual) |
| `prisma/sqlite-schema.sql` | Seed/skema SQLite |
| `prisma.config.ts` | Konfigurasi Prisma |
| `scripts/setup-prisma.*` | Memilih provider via `DB_PROVIDER`/`DATABASE_URL`, dijalankan oleh `db:setup` / `predev` / `prebuild` |

`DB_PROVIDER`: sqlite, postgresql, mysql, mongodb, sqlserver, cockroachdb.
SQLite untuk desktop/lokal, PostgreSQL untuk docker/prod
(`docker-compose.yml`: `db` postgres:15 + `app` dengan `DATABASE_URL`,
`DB_PROVIDER`, `NODE_ENV=production`).

## Generated code

`src/generated/prisma` = output `prisma generate` (client self-contained
untuk electron-builder asar). Jangan edit manual; regenerate via
`npm run db:setup`.
