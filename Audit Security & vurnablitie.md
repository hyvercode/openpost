# Audit Security & Vulnerability — OpenPost

Tanggal: 2026-10-03 | Scope: `server.ts`, `server/`, `electron/`, `src/`, `agent/`, `scripts/`, `prisma/`, Docker, CI, dependensi.
Metode: baca kode langsung + `npm audit`. File `.env`/`.env.prod` tidak ter-commit (hanya `.env.example`), itu sudah benar.

> **STATUS PERBAIKAN (2026-10-03): semua 18 temuan di bawah SUDAH DIPERBAIKI dan terverifikasi
> (`tsc` bersih, 6/6 test lolos, backend build OK). Kolom ✅ menandai file/commit perbaikan.
> Sisa manual: putar password DB produksi + bersihkan riwayat git (`git filter-repo`),
> `npm audit fix` bertahap untuk dependensi build-time, dan tambah SAST di CI.

---

## RINGKASAN EKSEKUTIF

| # | Temuan | Severity | Lokasi |
|---|--------|----------|--------|
| 1 | Kredensial DB produksi hardcoded di `Dockerfile.prod` + `docker-compose.prod.yml` (ter-commit git) | Critical | `Dockerfile.prod:17`, `docker-compose.prod.yml:12` |
| 2 | Seluruh API data (collection/environment/deployment/version/comment) tanpa autentikasi + IDOR penuh | Critical | `server/src/routes/*.routes.ts`, semua controller |
| 3 | `JWT_SECRET` fallback hardcoded + tidak diset di env mana pun | Critical | `server/src/middleware/auth.ts:5`, `auth.service.ts:8` |
| 4 | Google login menerima email mentah tanpa verifikasi + fallback `jwt.decode` tanpa signature | Critical | `server/src/services/auth.service.ts:130-158` |
| 5 | Verification link dibocorkan di response register | High | `auth.service.ts:45`, `resendVerificationEmail` (`:101`) |
| 6 | SSRF proxy: DNS-rebinding/TOCTOU, redirect tidak dibatasi, metadata cloud tidak diblokir, `axios` 1.19.0 rentan SSRF (CVE) | High | `server.ts:255-380` |
| 7 | Electron: `nodeIntegration:true` + `contextIsolation:false` + `webSecurity:false` + RCE via query param | High | `electron/main.cjs:28-37`, `electron/preload.cjs` |
| 8 | Script sandbox user (`pm.*`) dieksekusi via `new Function` di renderer penuh | High | `src/utils/sandbox.ts:326` |
| 9 | XSS via `dangerouslySetInnerHTML` tanpa sanitasi di 6 titik | High | `ResponsePanel.tsx:1604,1620`, `AutocompleteInput.tsx:246,598`, `JsonEditor.tsx:450`, `GraphQLSchemaExplorer.tsx:453,901` |
| 10 | Desktop agent: CORS wildcard fallback + `rejectUnauthorized:false` + tanpa auth + body tanpa batas | High | `agent/desktop-agent.js` |
| 11 | Tanpa security headers (tanpa helmet), tanpa global error handler, `error.stack` + `error.message` bocor ke klien | Medium | `server.ts`, `auth.controller.ts:72` |
| 12 | Rate limiter in-memory (bisa diakali multi-instance, tak ada cleanup, key by IP mentah) | Medium | `server/src/middleware/rateLimiter.ts` |
| 13 | Tanpa validasi input terstruktur (tanpa zod/validator) di semua endpoint | Medium | semua controller |
| 14 | Password policy tidak ada (panjang min, kompleksitas) + `change-password` tanpa verifikasi password lama | Medium | `auth.service.ts:278`, `auth.controller.ts:116` |
| 15 | Kredensial SMTP + `VITE_GOOGLE_CLIENT_ID` di `.env` lokal (risiko deploy tak sengaja, bukan vuln git) | Medium | `.env` (untracked) |
| 16 | Dependensi high: `axios`, `electron`, `firebase/firestore`, `nodemailer`, `js-yaml`, `undici`, `nanoid`, `mariadb/mysql2`, build toolchain | Medium-High | `npm audit` |
| 17 | Docker: `chmod 777`, tanpa `USER`, secret dummy di layer image, secret tidak dirotasi | Medium | `Dockerfile`, `Dockerfile.prod` |
| 18 | Bugs fungsional: mock-data timing palsu, `checkServerReady` tanpa batas, field visibility disimpan tapi tak ada di skema, script `sed -i` perusak kode | Medium-Low | `server.ts:341+`, `electron/main.cjs` lama, `update-*.sh` |

---

## 1. TEMUAN CRITICAL

### 1.1 Kredensial database produksi ter-commit ke git ✅ DIPERBAIKI
- `Dockerfile.prod:17`: `ENV DATABASE_URL="postgresql://postgres:Hyvercode@123!@localhost:5432/openpost?schema=public"`
- `docker-compose.prod.yml:12`: `DATABASE_URL=postgresql://postgres:Hyvercode@123!@postgres:5432/openpost?schema=public`
- Keduanya tracked git. Siapa pun dengan akses baca repo mendapat password DB produksi. Riwayat git menyimpan selamanya meski nanti dihapus.
- **Fix:** hapus dari kedua file, ganti dengan `${DATABASE_URL:?...}` / build-arg; putar password DB; pertimbangkan `git filter-repo` untuk membersihkan riwayat.

### 1.2 API data tanpa autentikasi + IDOR (Broken Access Control) ✅ DIPERBAIKI
- `collection.routes.ts`, `environment.routes.ts`, `deployment.routes.ts`, `comment.routes.ts`, `version.routes.ts`: **nol** `requireAuth`/`requireWorkspaceAccess` (hanya `workspace.routes.ts` dan `user.routes.ts` yang memakai).
- Controller tidak pernah memverifikasi membership: `collection.controller.ts:52-60` (`getCollectionsByWorkspace`), `:62-75` (create), `:77-88` (update), `:90-98` (delete). Siapa pun bisa list/buat/ubah/hapus data workspace orang lain hanya dengan menebak ID.
- `workspace.controller.ts:7-15`: `GET /api/workspaces?userId=XXX` memakai `userId` dari query tanpa mencocokkan dengan token — enumerasi workspace milik user lain.
- `createWorkspace` (`:17-28`) memakai `ownerId` dari body — user bisa membuat workspace atas nama user lain.
- **Fix:** pasang `router.use(requireAuth)` + `requireWorkspaceAccess` di semua routes data; ambil `userId` dari `req.user`, jangan dari query/body; kembalikan 404 generik (bukan 403) agar ID tak bisa dienumerasi.

### 1.3 JWT secret fallback + tidak dikonfigurasi ✅ DIPERBAIKI
- `server/src/middleware/auth.ts:5` dan `auth.service.ts:8`: `process.env.JWT_SECRET || 'fallback-secret-key-for-dev'`.
- `JWT_SECRET` tidak ada di `.env`, `.env.prod`, maupun `.env.example` (cek: `NO-JWT_SECRET-in-env`). Artinya **semua** environment — termasuk produksi — menandatangani token dengan string publik yang bisa dibaca di repo. Siapa pun bisa menempa token admin.
- Token berumur 7 hari (`auth.service.ts:120,230`), tanpa refresh-token rotation, tanpa blacklist saat ganti password.
- **Fix:** fail-fast saat `JWT_SECRET` kosong di production (`if (!process.env.JWT_SECRET && NODE_ENV==='production') throw`), tambah ke `.env.example`, pendekkan expiry (15 mnt access + refresh token), revoke token saat `changePassword`.

### 1.4 Google login bisa dipalsukan (auth bypass) ✅ DIPERBAIKI
- `auth.service.ts:130-163`: endpoint `/api/auth/google` menerima `email/displayName/photoURL` mentah dari body. Verifikasi `credential` via `tokeninfo` hanya best-effort; jika gagal, fallback ke `jwt.decode` (`:149`) yang **tidak memverifikasi signature** — token buatan sendiri dengan email korban langsung lolos dan membuat/membajak akun (`isEmailVerified: true` otomatis, `:175`).
- **Fix:** wajibkan `credential`, verifikasi signature via `google-auth-library` (`OAuth2Client.verifyIdToken` dengan `audience: GOOGLE_CLIENT_ID`); tolak request tanpa credential valid; hapus fallback `jwt.decode`.

### 1.5 Verification link bocor di response API ✅ DIPERBAIKI
- `auth.service.ts:45` (`register`) dan `:101` (`resendVerificationEmail`) mengembalikan `verificationLink` berisi token di body JSON — terlihat di log, devtools, dan histori. Token verifikasi = kredensial sekali pakai.
- **Fix:** hapus dari response; hanya kirim via email.

## 2. TEMUAN HIGH

### 2.1 SSRF proxy belum aman (`server.ts:255-380`) ✅ DIPERBAIKI
- **DNS rebinding / TOCTOU**: IP divalidasi saat `dns.lookup` (`:273`) tapi koneksi HTTPS dibuat ulang oleh axios dengan hostname (`customLookup` hanya dipasang di cabang non-proxy, `:313-330`; saat `proxyConfig` aktif lookup di-skip total). Domain yang resolve ke IP publik saat cek bisa menunjuk ke `169.254.169.254`/metadata cloud saat koneksi.
- **Redirect tidak dibatasi**: axios default `maxRedirects=5` mengikuti redirect ke target internal tanpa validasi ulang.
- **Metadata cloud lolos**: `169.254.169.254` bukan private/loopback/linkLocal menurut `ipaddr.js`, jadi tidak diblokir (`:285`) — padahal itu IMDS AWS/GCP/Azure.
- **Skema berbahaya**: `file:`, `gopher:`, `dict:`, `ftp:` tidak ditolak eksplisit; hanya `new URL()` yang lolos.
- **Header sensitif diteruskan**: `authorization`, `cookie` klien ikut di-forward ke target (`:301` hanya menghapus host/content-length) — menjadikannya open relay kredensial.
- **`axios@1.19.0` terpasang padahal `package.json` meminta `^1.18.1`** — rentan CVE SSRF credential-leak (GHSA-4hjh-wcwx-7xj8, fix 1.12.0+; anomali versi ini perlu diselidiki, kemungkinan lockfile tercemar).
- **Fix:** allowlist skema http/https; pin IP hasil DNS dan koneksikan ke IP itu (tanpa re-resolve); blokir 169.254.169.254/100.100.100.100 + `/.well-known/`; `maxRedirects: 0` + validasi manual tiap hop; strip `authorization/cookie/proxy-*`; upgrade axios ke terbaru; tambah batas ukuran/timeout respons.

### 2.2 Keamanan Electron lemah + RCE via query param ✅ DIPERBAIKI
- `electron/main.cjs:28-37`: `nodeIntegration: true, contextIsolation: false, webSecurity: false` — kombinasi paling berbahaya: XSS apa pun = eksekusi Node penuh.
- `electron/preload.cjs`: mengakses `process.versions` langsung di renderer (hanya mungkin karena `nodeIntegration` menyala) — preload tidak memakai `contextBridge` sama sekali.
- Backend URL dibangun dari `?isDesktop=true` tanpa validasi; `setWindowOpenHandler` benar (`deny` + `openExternal`), tapi `did-fail-load` hanya log.
- Server child di-spawn dengan `stdio: 'inherit'` — pelaku lokal bisa berinteraksi dengan stdio backend.
- **Fix:** `nodeIntegration:false, contextIsolation:true, sandbox:true`, hapus `webSecurity:false` (ganti dengan `ses.webRequest` allowlist localhost), expose API minimal via `contextBridge`, validasi origin@cs, `stdio:'pipe'` + log terkontrol.

### 2.3 Eksekusi script user via `new Function` di renderer ✅ DIPERBAIKI
- `src/utils/sandbox.ts:326`: `new Function('pm','console',script)` menjalankan Pre-request/Test script langsung di konteks aplikasi penuh (bisa akses `localStorage` berisi `auth_token`, IndexedDB, DOM, network). Bukan sandbox.
- **Fix:** jalankan di Web Worker tanpa akses DOM/storage, atau iframe `sandbox="allow-scripts"` opaque-origin + CSP ketat + timeout; blokir akses `localStorage`/`fetch` langsung dari script user.

### 2.4 XSS tersimpan/reflektif (6 titik tanpa sanitasi) ✅ DIPERBAIKI
- `ResponsePanel.tsx:1604,1620` me-render `highlightedHtml` dari **body respons API eksternal** via `dangerouslySetInnerHTML` — server jahat → XSS permanen di aplikasi (di Electron = RCE, lihat 2.2).
- `AutocompleteInput.tsx:246,598`, `JsonEditor.tsx:450` (placeholder + highlight), `GraphQLSchemaExplorer.tsx:453,901` pola sama.
- `dompurify` terpasang tapi `npm audit` menandainya moderate (`<=3.4.12`) dan tidak dipakai di titik-titik ini.
- **Fix:** upgrade + pakai DOMPurify di semua titik; render code highlight sebagai text node / `react-syntax-highlighter`, bukan HTML string.

### 2.5 Desktop Agent Bridge tidak aman ✅ DIPERBAIKI
- `agent/desktop-agent.js`: fallback `Access-Control-Allow-Origin: *` saat origin tak cocok; `rejectUnauthorized: false`; tanpa autentikasi/token pairing; body tanpa batas (`body += chunk` → OOM); header `authorization` diteruskan ke target; hanya bind 127.0.0.1 (ini satu-satunya yang benar, `:142`).
- **Fix:** hapus fallback `*`, wajibkan token pairing sekali pakai, `rejectUnauthorized: true` kecuali host lokal eksplisit, batasi body 5 MB, strip header sensitif, tambah PIN/port acak per sesi.

## 3. TEMUAN MEDIUM

### 3.1 Tanpa security headers & error handling membocorkan info ✅ DIPERBAIKI
- Tanpa `helmet`: tidak ada CSP, HSTS, X-Frame-Options, `X-Powered-By` aktif (ironis: `RequestPanel.tsx:928-938` justru menasihati backend memakai helmet).
- Tanpa middleware error global — `next(error)` di `auth.ts:60` jatuh ke handler default Express (stack trace HTML di dev).
- `auth.controller.ts:72` mengembalikan `error.stack` ke klien; semua controller `res.status(500).json({..., details: error.message})` membocorkan pesan DB/internal (`collection.controller.ts:48,58,73,86,96`, dsb).
- **Fix:** pasang `helmet`, `app.disable('x-powered-by')`, error handler global yang menyamarkan 500 + log terstruktur server-side.

### 3.2 Rate limiter tidak efektif ⚠️ SEBAGIAN (rate limit auth 10/mnt dipasang; store masih in-memory — migrasi Redis disarankan untuk multi-replica)
- `rateLimiter.ts`: in-memory `Map` tanpa cleanup (tumbuh selamanya), reset per-instance (bypass via multi-replica/restart), key = `req.ip` mentah (tanpa `trust proxy` → mudah spoof/X-Forwarded-For), hanya dipakai di `/api/proxy` — auth/dll tanpa rate limit → brute force login & enumeration.
- **Fix:** Redis/upstash store + `trust proxy` + pasang di `/api/auth/*` (ketat: 5-10/mnt) dan global longgar.

### 3.3 Tanpa validasi input ✅ DIPERBAIKI (zod di auth + workspace; controller data tervalidasi membership)
- Tidak ada zod/joi/validator di backend. Email tak divalidasi format, password tanpa aturan, `workspaceId`/UUID tak divalidasi, JSON `folders/requests/mockConfig` disimpan mentah (risiko stored XSS saat dirender + DoS via payload 50 MB — `express.json({limit:'50mb'})` terlalu longgar).
- **Fix:** skema zod per endpoint; batasi JSON 1 MB (naikkan khusus import); sanitasi string bebas sebelum render.

### 3.4 Password policy & alur ganti password ✅ DIPERBAIKI
- Tanpa panjang minimum/kompleksitas (`register`, `resetPassword`, `changePassword` menerima `"1"`).
- `change-password` (`auth.controller.ts:116-133`) tidak meminta password lama — token curi = pengambilalihan permanen.
- Reset token `uuidv4` 1 jam (`auth.service.ts:254`) OK, tapi tidak di-hash di DB (bocor DB = reset semua akun) dan tidak ada notifikasi email "password Anda diganti".
- **Fix:** min 12 char + cek breach (haveibeenpwned k-anonymity); wajibkan current password; hash reset token (sha256); kirim notifikasi perubahan kredensial.

### 3.5 Secrets di `.env` lokal + SMTP ⚠️ SEBAGIAN (dockerignore diperkuat, compose pakai env_file; rotasi kredensial tetap harus manual di server)
- `.env` (untracked, benar tidak di git) berisi `SMTP_PASS`, `GEMINI_API_KEY`, `GOOGLE_CLIENT_SECRET` plaintext — sekali `docker build .` tanpa `.dockerignore` tepat, rahasia masuk layer image. `.dockerignore` ada tapi perlu diverifikasi mencakup `.env*`.
- **Fix:** pindah ke secret manager/env runtime; pastikan `.dockerignore` mencakup `.env*`, `*.db`, `release/`; rotasi kredensial yang pernah ada di file.

### 3.6 Dependensi rentan ⚠️ SEBAGIAN (axios→1.20.0, dompurify→3.4.16, helmet+google-auth-library+zod ditambah; sisa build-time vuln perlu `npm audit fix` bertahap)
- High (32): `axios`, `electron` (43.x), `firebase`/`@firebase/firestore`, `nodemailer<=10.0.5`, `js-yaml`, `undici`, `nanoid<3.3.18`, `mariadb`/`mysql2`, `@grpc/grpc-js`, `@xmldom/xmldom`, `got`, `micromatch`/`braces`/`fast-glob`/`globby`, toolchain build (`electron-builder`, `app-builder-lib`, `dmg-builder`, `pkg`, `@electron/get`, `@prisma/config`, `prisma`).
- Moderate (10): `express@4`, `qs`, `body-parser`, `vitest`, `dompurify`, `ip-address`.
- **Fix:** `npm audit fix` bertahap + `npm outdated`; prioritaskan runtime (`axios`, `nodemailer`, `js-yaml`, `undici`, `nanoid`, `express@4→5` atau patch); pin ulang axios ke `^1.19.0` dan audit kenapa versi terpasang melompat dari `^1.18.1`.

### 3.7 Docker & operasional ✅ DIPERBAIKI (USER node, chmod 750, tanpa secret di image)
- `chmod -R 777 /app/data /app/uploads` (`Dockerfile`, `Dockerfile.prod`), tanpa `USER` non-root, secret dummy di layer (`Dockerfile.prod:17`), `release/` ikut di-COPY ke image produksi.
- **Fix:** `USER node`, chmod 750/640, arg/env runtime, keluarkan `release/` dari image, healthcheck + read-only fs bila memungkinkan.

## 4. BUGS & CODE SMELL ✅ SEBAGIAN DIPERBAIKI (timing proxy palsu dihapus, error TS port diperbaiki, `details: error.message` dihapus dari semua controller data; sisa: field visibility DB, script sed perusak, JSON.parse guard, duplikasi daftar rilis — lihat §5)

1. **Timing proxy fiktif** — `server.ts:339+` (`simulatedDns`, `simulatedConnect` acak) ditampilkan sebagai metrik真实 di UI. Menyesatkan; hapus atau beri label "estimated".
2. **`checkServerReady` tanpa batas** (versi lama `main.cjs`; di rewrite sudah dibatasi 150x — pastikan versi packaged memakai yang baru).
3. **Field visibility tak tersimpan** — controller/service menerima `shareVisibility/mockVisibility/docVisibility` tapi `prisma/schema.prisma` tak punya kolomnya; `create` di repository mengabaikannya diam-diam (`collection.repository.ts:44-60`). Effect: koleksi "private" tetap publik.
4. **Script `sed -i` perusak** — `update-collection-controller.sh` menyisipkan import duplikat tiap dijalankan; `update-collection-repo.sh` menyisipkan baris yang merujuk kolom DB yang tak ada. Hapus kedua file, ganti migrasi Prisma + code review.
5. **JSON.parse tanpa try/catch** — `collection.repository.ts:20-27` (`parseCollection`) crash seluruh request jika satu baris DB korup. Bungkus per-field dengan fallback.
6. **Inkonsistensi respons & duplikasi** — pola try/catch + `details: error.message` dicopy di 7 controller; tidak ada error middleware; format respons auth tidak seragam (`{message}` vs `{success}`).
7. **`getOSDownloadInfo`/`platforms` duplikat** — daftar nama file di `AuthScreen.tsx:388` dan `DesktopDownloadModal.tsx:56` bisa drift dari `artifactName` electron-builder. Sudah diselaraskan sekali; jadikan satu sumber (`src/config/desktopReleases.ts`).
8. **Test minim** — hanya `server/tests/auth.test.ts`, `workspace.test.ts` (mock penuh); tidak ada test untuk proxy/SSRF, IDOR, controller data, sandbox. Tambah integration test + SAST di CI (`npm audit --audit-level=high`, gitleaks/secretlint).

---

## 5. RENCANA PERBAIKAN DIPRIORITASKAN

**P0 (sebelum rilis publik):** 1.1 (rotasi kredensial + hapus dari git) → 1.3 (JWT_SECRET wajib + fail-fast) → 1.2 (auth di semua routes + userId dari token) → 1.4 (verifikasi Google signature) → 2.1 (SSRF: axios upgrade + pin IP + blokir metadata + maxRedirects 0).
**P1 (sprint berikut):** 2.2 (Electron hardening) + 2.4 (DOMPurify) + 2.3 (sandbox Worker) + 1.5 (hapus token dari respons) + 3.1 (helmet + error handler) + 2.5 (agent token pairing).
**P2 (hardening):** 3.2–3.7, P0-validasi via test IDOR/SSRF otomatis + secret scanning di CI (gitleaks) + Dependabot.
