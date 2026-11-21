# API OpenPost

Semua route data memakai `requireAuth` (JWT Bearer). Error umum:
`400` validasi zod/body, `401` tanpa token, `403` bukan anggota,
`404` tidak ada, `409` konflik edit (`expectedUpdatedAt` + `force`).

## Format Error Standar

Semua error memakai bentuk `{ error, details?, code? }`
(lihat `server/src/utils/errors.ts` → `sendError`). Field `error`
stabil (klien boleh match string ini); `details` berisi pesan exception
server untuk debugging dan boleh berubah-ubah.

```http
GET /api/monitors/no-such-id/runs
Authorization: Bearer <jwt>
```
```json
{ "error": "Not found" }
```
```http
GET /api/versions/collection/c1
Authorization: Bearer <jwt>
```
```json
{
  "error": "Failed to fetch collection versions",
  "details": "Can't reach database server at `db:5432`"
}
```
```http
GET /api/admin/audit
Authorization: Bearer <jwt-non-admin>
```
```json
{ "error": "Forbidden" }
```

## Auth — `/api/auth`

| Method & Path | Deskripsi |
|---|---|
| POST `/api/auth/register` | Registrasi (rate-limit + zod) |
| GET/POST `/api/auth/verify-email` | Verifikasi email |
| POST `/api/auth/login` | Login (rate-limit + zod) |
| POST `/api/auth/google` | Login Google |
| GET `/api/auth/me` | Profil sendiri (auth) |
| POST `/api/auth/logout` | Logout (auth) |
| POST `/api/auth/reset-password` | Reset password |
| POST `/api/auth/change-password` | Ganti password (auth) |
| DELETE `/api/auth/account` | Hapus akun (auth) |

## Workspace — `/api/workspaces`

GET `/`, GET `/trash`, POST `/`, PUT `/:id`, DELETE `/:id` (OWNER),
POST `/:id/restore` (OWNER), GET `/:id/audit` (ADMIN),
GET `/:id/members`, POST `/:id/invite` (ADMIN),
GET `/:id/invitations` (ADMIN), PATCH/DELETE `/:id/members/:userId` (ADMIN),
GET `/invitations/:token`, POST `/invitations/:token/accept`,
POST `/invitations/:invitationId/resend`, DELETE `/invitations/:invitationId`.

## Collection — `/api/collections`

| Method & Path | Deskripsi |
|---|---|
| GET `/shared/:id` | Ambil shared collection (`?purpose=import\|doc`; private perlu Bearer + membership) |
| GET `/trash/:workspaceId` | Sampah per workspace |
| GET `/:workspaceId` | List per workspace |
| POST `/` | Buat (`workspaceId`, `name` wajib) → 201 |
| PUT `/:id` | Update (409 bila konflik) |
| DELETE `/:id` | Soft-delete → `{success:true}` |
| POST `/:id/restore` | Restore |

## Environment — `/api/environments`

GET `/:workspaceId`, POST `/` (`workspaceId`+`name` wajib → 201),
PUT `/:id` (409 bila konflik), DELETE `/:id` (soft-delete),
POST `/:id/restore`.

## Lainnya

- Deployment `/api/deployments`: GET `/:workspaceId`, POST `/`, PUT `/:id`, DELETE `/:id`.
- User `/api/users`: POST `/avatar`, DELETE `/avatar`, GET `/:uid`, POST `/` (upsert).
- Comment `/api/comments`: GET/POST `/:requestId`, DELETE `/:id`.
- Version `/api/versions`: GET `/collection/:collectionId`, GET `/workspace/:workspaceId`, GET `/:id`, POST `/`, PUT `/:id`, POST `/:id/rollback`, POST `/:id/fork`, DELETE `/:id`.
- Monitor `/api/monitors`: GET/POST `/workspace/:workspaceId`, GET `/:id/runs`, PUT `/:id`, DELETE `/:id`, POST `/:id/run`.
- Workflow `/api/workflows`: POST `/webhook/:token` (rate-limit 10), GET `/workspace/:workspaceId`, GET `/:id`, GET `/:id/runs`, POST `/workspace/:workspaceId` (30), PUT `/:id` (30, `regenerateWebhookToken: true` untuk rotasi token), DELETE `/:id`, POST `/:id/run` (10).
- Workflow schedule: `intervalMinutes` (≥5) atau `scheduleCron` (cron 5-field, menang atas interval; 1 run per menit cocok; cron invalid = tidak jalan). Scheduler juga menandai run `running` > 30 menit sebagai gagal (orphan reaper).
- Admin `/api/admin` (gate `ADMIN_EMAILS`): GET `/stats`, GET `/audit`, GET `/usage`.

## Contoh Request/Response

### Buat collection → 201

```http
POST /api/collections
Authorization: Bearer <jwt>
Content-Type: application/json

{ "workspaceId": "ws1", "name": "Billing API" }
```
```json
{ "id": "c1", "workspaceId": "ws1", "name": "Billing API" }
```

Gagal validasi → 400:

```json
{ "error": "WorkspaceId and name are required" }
```

### Jalankan monitor manual

```http
POST /api/monitors/m1/run
Authorization: Bearer <jwt>
```
```json
{ "status": "up", "passed": 3, "failed": 0, "timeMs": 412 }
```

Tiap check GET/HEAD di-retry maks 3x untuk error jaringan saja
(backoff 500ms → 1500ms); status HTTP 5xx tidak di-retry.

### Jadwal fleksibel monitor

Selain interval (`intervalMinutes`, min 5), monitor mendukung:

| Field | Arti |
|---|---|
| `scheduleMode: "interval" \| "cron"` | Mode jadwal (default `interval`) |
| `cronExpr` | Cron 5 field `min hour dom mon dow`, cth `*/15 * * * *`, `0 9 * * 1-5`. Wajib bila mode `cron` |
| `activeStart` / `activeEnd` | Jam aktif `HH:MM` (server local). Di luar jam ini run dilewati. Mendukung overnight (`22:00`–`06:00`) |
| `pausedUntil` | ISO datetime — jeda/maintenance window; run dilewati sampai waktu ini. `null` = resume |
| `timezone` | Label IANA opsional, hanya display |

Contoh — hanya hari kerja jam 9–17, jeda 8 jam:

```http
POST /api/monitors/workspace/ws1
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "collectionId": "c1",
  "name": "Billing API",
  "scheduleMode": "cron",
  "cronExpr": "*/15 9-17 * * 1-5",
  "activeStart": "09:00",
  "activeEnd": "17:00"
}
```
```http
PUT /api/monitors/m1
Authorization: Bearer <jwt>
Content-Type: application/json

{ "pausedUntil": "2026-11-22T01:00:00.000Z" }
```

Gagal validasi → 400 (`Invalid cronExpr: …`, `activeStart must be HH:MM (24h)`).
Scheduler tick (60 detik) mengevaluasi satu keputusan
`shouldRunMonitor` (`server/src/services/schedule.ts`): enabled → belum di-pause →
dalam jam aktif → cocok interval/cron (cron dieksekusi maks 1x per menit yang cocok).

### Jalankan workflow + riwayat run

```http
POST /api/workflows/w1/run
Authorization: Bearer <jwt>
Content-Type: application/json

{ "variables": { "baseUrl": "https://api.example.com" } }
```
```http
GET /api/workflows/w1/runs?limit=20
Authorization: Bearer <jwt>
```

Webhook tanpa auth (token di URL adalah secret, rate-limit 10/menit):

```http
POST /api/workflows/webhook/<token>
Content-Type: application/json

{ "event": "deploy", "ref": "main" }
```
```json
{ "ok": true, "workflowId": "w1" }
```

### Audit log (admin)

```http
GET /api/admin/audit?limit=100
Authorization: Bearer <jwt-admin>
```
```json
[
  {
    "id": "a1",
    "action": "monitor.run",
    "userId": null,
    "workspaceId": "ws1",
    "entityType": "monitor",
    "entityId": "m1",
    "detail": "down passed=0 failed=1",
    "createdAt": "2026-11-21T13:00:00.000Z"
  }
]
```

### Catatan generated code

- `src/generated/` adalah output `prisma generate`, di-ignore
  (`/src/generated/prisma` di `.gitignore`) dan tidak di-commit.
  Regenerasi via `npm run db:setup` (otomatis di `predev`/`prebuild`).
- `prisma/schema.prisma` juga generated dari `schema.template.prisma`
  oleh `scripts/setup-prisma.*` — jangan edit langsung.
- `Dockerfile.prod` + `docker-compose.prod.yml` di-commit (tanpa secret;
  secret via `.env.production` yang tetap di-ignore).
