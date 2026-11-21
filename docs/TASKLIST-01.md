# TASKLIST-01 — Hasil Pemeriksaan Proyek OpenPost

Tanggal: 2026-11-21 | Pemeriksa: Muse Code | Basis: checkout lokal, `npm run lint` ✅, `npm test` ✅ (5 file, 38 tests lolos)

## Ringkasan
- Kondisi umum sehat: TypeScript lolos (`tsc --noEmit`), seluruh test backend (`server/tests/`) lolos.
- Masalah utama: folder `docs/` belum ada, artefak build ikut ter-commit, script manual campur aduk, dan dokumentasi rilis/env belum sinkron dengan kode.

## Yang Kurang / Perlu Diperbarui

### P1 — Wajib
1. **Folder `docs/` tidak ada.** Tidak ada dokumentasi arsitektur, setup, API, dan ADRs.
   - Aksi: buat `docs/` + file ini; susul `ARCHITECTURE.md`, `SETUP.md`, `API.md`.
2. **Artefak build ter-commit: `server.cjs` (~5,2 MB) tercatat di git.** `dist/` dan `release/` juga ada di working tree.
   - Aksi: hapus `server.cjs` dari git (`git rm --cached server.cjs`), pastikan `.gitignore` mencakup `server.cjs`, `dist/`, `release/`.
3. **`tests/manual/` hanya skrip ad-hoc** (`test.js`, `test2.ts`, `test-email.ts`, `test-generator*.ts`, `test-ip.js`, `test-new-adapter.ts`, `test-pg.ts`, `test-prisma.ts`, `test-protobuf.ts`), di-exclude dari `tsconfig` dan tidak dijalankan vitest (vitest hanya include `server/tests/**/*.test.ts`).
   - Aksi: pindahkan yang masih relevan jadi test otomatis di `server/tests/`, hapus sisanya.
4. **`.env.production` ada di working tree tapi tidak ter-track; `.env` lokal juga tak ter-track.** Risiko beda config dev/prod/docker.
   - Aksi: sinkronkan `.env.example` + `.env.prod.example` dengan `server/src/env.ts` + `docker-compose*.yml`; dokumentasikan variabel wajib di `docs/SETUP.md`.

### P2 — Sebaiknya
5. **Cakupan test sempit.** Hanya auth, workspace, security, secretCrypto, responseDecode. Controller lain (collection, environment, version, comment, monitor, workflow, deployment, admin, user) belum ada test.
   - Aksi: tambah test per controller prioritas: collection → environment → version.
6. **`README.md` vs `RELEASE.md` belum sinkron dengan script `package.json`.** Script banyak (`dev`, `dev:monolith`, `build:electron:*`, `bridge`) tapi alur utama tidak ditegaskan.
   - Aksi: tulis alur baku dev/build/rilis di `docs/SETUP.md`, jadikan README ringkas menunjuk ke docs.
7. **Duplikasi entrypoint server**: `server.ts` (51 KB) + `server.cjs` hasil bundle + `dist/server.cjs`. Bikin bingung mana sumber kebenaran.
   - Aksi: tegaskan `server.ts` = sumber; `server.cjs`/`dist/` = output, jangan diedit manual.
8. **Skema Prisma ganda**: `prisma/schema.prisma`, `schema.template.prisma`, `sqlite-schema.sql`, `prisma.config.ts`, `scripts/setup-prisma.*`.
   - Aksi: dokumentasikan matriks DB (sqlite/postgres/mongo/dll) dan kapan tiap file dipakai.

### P3 — Kecil / Housekeeping
9. **`src/generated/` ter-commit?** Periksa apakah itu output Prisma yang seharusnya di-generate.
10. **CI ada (`.github/workflows/build-desktop.yml`, `security.yml`)** tapi belum memverifikasi docs/test baru — tambah job `lint + test`.
11. **`metadata.json`, `LICENSE.md`, ikon `assets/`** belum dirujuk dari README/RELEASE — tautkan.

## Status Verifikasi
- [x] `npm run lint` — lolos, 2026-11-21 (rerun: bersih)
- [x] `npm test` — 8 file, 55 tests lolos, 2026-11-21 (awal 5 file/38; +collection, +environment, +version)
- [x] Audit `.env*` vs `server/src/env.ts` — selesai (`.env.example` + `GOOGLE_CLIENT_SECRET`, `ADMIN_EMAILS`, `API_ONLY`)
- [x] Audit README/RELEASE vs `package.json` scripts — selesai (README menaut ke docs, header RELEASE sinkron, CI pakai `npm run lint`)
- [x] Putuskan nasib `tests/manual/*` — selesai (10 skrip ad-hoc dihapus via `git rm`, tak ada yang layak migrasi)

## Urutan Kerja Disarankan
1. Keluarkan artefak dari git + rapikan `.gitignore`.
2. Tulis `docs/ARCHITECTURE.md`, `docs/SETUP.md`, `docs/API.md`.
3. Migrasi/hapus `tests/manual/*`.
4. Tambah test controller yang belum ter-cover.
5. Sinkronkan README/RELEASE + contoh env.
