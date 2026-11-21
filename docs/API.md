# API OpenPost

Semua route data memakai `requireAuth` (JWT Bearer). Error umum:
`400` validasi zod/body, `401` tanpa token, `403` bukan anggota,
`404` tidak ada, `409` konflik edit (`expectedUpdatedAt` + `force`).

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
- Workflow `/api/workflows`: POST `/webhook/:token` (rate-limit 10), GET `/workspace/:workspaceId`, GET `/:id`, GET `/:id/runs`, POST `/workspace/:workspaceId` (30), PUT `/:id` (30), DELETE `/:id`, POST `/:id/run` (10).
- Admin `/api/admin` (gate `ADMIN_EMAILS`): GET `/stats`, GET `/audit`, GET `/usage`.
