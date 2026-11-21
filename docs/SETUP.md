# Setup OpenPost

## Prasyarat

- Node.js ≥ 18, npm.
- PostgreSQL (docker/prod) atau SQLite (lokal/desktop, tanpa setup DB).

## Alur baku

| Kebutuhan | Perintah |
|---|---|
| Install | `npm install` |
| Dev monolith (default, port 3000) | `npm run dev` |
| Dev backend saja | `npm run dev:backend` (alias `dev:api`) |
| Dev frontend saja | `npm run dev:frontend` (alias `dev:web`) |
| Desktop lokal | `npm run electron:dev` |
| Agent bridge (testing localhost, port 8765) | `npm run bridge` |
| Build web/prod | `npm run build` lalu `npm start` |
| Build backend saja | `npm run build:backend` |
| Build Electron | `npm run build:electron` (atau `:all`, `:win`, `:mac`, `:linux`) |
| Lint (tsc) | `npm run lint` |
| Test | `npm test` |
| Setup DB manual | `npm run db:setup` (sqlite: `db:setup:sqlite`) |

`predev`/`prebuild` menjalankan `db:setup` otomatis (memilih provider dari
`DB_PROVIDER`/`DATABASE_URL` via `scripts/setup-prisma.*`).

## Environment

Salin salah satu contoh (jangan commit file asli):

- Lokal: `cp .env.example .env`
- Produksi: salin `.env.prod.example` menjadi `.env.production` **di server
  deploy / secret manager saja**.

Loader (`server/src/env.ts`): production → `.env.production`, selain itu
`.env`. Process env selalu menang atas isi file.

### Variabel wajib

| Var | Wajib | Keterangan |
|---|---|---|
| `JWT_SECRET` | Ya (prod fail-fast, min 32 char) | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `DATABASE_URL` | Ya | `file:./dev.db` (sqlite) atau `postgresql://USER:PASSWORD@HOST:5432/openpost?schema=public` |
| `DB_PROVIDER` | Ya | sqlite \| postgresql \| mysql \| mongodb \| sqlserver \| cockroachdb |
| `PORT` | Tidak (default 3000) | Port listen backend |
| `APP_URL` | Prod ya | URL publik (callback, link) |
| `CORS_ORIGINS` | Prod ya (multi-DNS) | Daftar origin koma-separated, tanpa trailing slash |
| `GEMINI_API_KEY` | AI Gemini | Atau `AI_PROVIDER`/`AI_MODEL`/`OPENAI_API_KEY`/`OLLAMA_BASE_URL`/`CUSTOM_AI_*`/`AI_BASE_URL`/`AI_MONTHLY_LIMIT` |
| `SMTP_HOST/PORT/USER/PASS/FROM` | Email | Tanpa ini email verification dimatikan (fallback log) |
| `ADMIN_EMAILS` | `/api/admin/*` | Daftar email koma-separated |
| `GOOGLE_CLIENT_ID` (+`GOOGLE_CLIENT_SECRET`) | Google login | Opsional; frontend `VITE_GOOGLE_CLIENT_ID` |
| `VITE_API_URL` | Frontend | Default `http://localhost:3000` |
| `API_ONLY`, `BACKEND_ONLY` | Mode | Backend-only tanpa frontend |

Docker (`docker-compose.yml`): service `app` + `db` (postgres:15).
`GEMINI_API_KEY` diteruskan via `${GEMINI_API_KEY}` dari shell — jangan tulis
secret di compose file.

## Troubleshooting

- `JWT_SECRET must be at least 32 characters` → isi secret ≥32 char.
- Prisma provider salah → cek `DB_PROVIDER`+`DATABASE_URL`, jalankan ulang
  `npm run db:setup`.
- CORS diblokir → samakan `CORS_ORIGINS` dengan DNS publik (lihat log origin).
