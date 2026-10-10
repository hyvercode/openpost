# Release Notes - API Tester Pro

## 🚀 v2.0.0 (10 Oktober 2026)

### 1. Automation Workflows (Full DAG)
- **Visual Workflow Builder**: Susun alur pengujian API sebagai graf (drag node, connect edge) dengan node Request, Condition, Delay, Extract, dan Set Variable.
- **Branch & Parallel**: Kondisi true/false (`{{lastStatus}} == 200`), eksekusi paralel dalam satu level, dan deteksi cycle otomatis.
- **Chaining Variabel**: Extract value dari response (`$.data.token`), rangkai via Set Variable (`Bearer {{token}}`), pakai di node berikutnya — mis. login → condition → get profile.
- **Trigger Manual / Webhook / Schedule**: Jalankan manual (dengan modal pengisian variabel), via webhook URL bertoken, atau terjadwal per interval dengan scheduler + overlap guard.
- **Terhubung Koleksi & Environment**: Node request bisa dipilih langsung dari collection/API, auto-fill method/URL/headers/params/body (tetap bisa diedit), dan environment workflow meng-inject `{{var}}` saat run.
- **Run History & Rate Limit**: Riwayat eksekusi per workflow, anti-spam run, dan batasan laju eksekusi.

### 2. Provider AI Lebih Lengkap + Pengaturan di UI
- **4 Provider**: Gemini, OpenAI, Ollama (lokal), dan Custom OpenAI-compatible — diatur lewat **Settings → AI** (provider, model, API key, base URL) tanpa edit file env.
- **Hardening AI**: Validasi SSRF untuk base URL kustom, API key tidak pernah bocor ke log/error, validasi input zod, dan kuota bulanan.

### 3. Perbaikan Collection & Sidebar
- **Drag-and-drop reorder** collection/environment kini benar-benar tersimpan (persist ke database).
- **Pindah folder antar collection** (termasuk subtree + request di dalamnya).

### 4. Deploy & Operasional
- **Sumber env produksi tunggal**: `npm run build` / `npm start` selalu memakai `.env.production` (dev tetap `.env`); secret runtime tidak tertanam di image Docker.
- **CORS multi-origin**: `CORS_ORIGINS` koma-separated untuk deploy multi-DNS, plus log origin yang diblokir agar mudah diagnosa.

---

## 🚀 Ringkasan Fitur v1.0.0

Selamat datang di perilisan perdana **API Tester Pro v1.0.0**! Aplikasi API Testing & Client tingkat lanjut (Postman alternative) ini telah dilengkapi dengan beragam fitur mutakhir untuk mempermudah alur kerja pengembangan API, pengujian otomatis, simulasi server, hingga kolaborasi tim.

---

### 1. Manajemen Workspace & Kolaborasi Tim
- **Role-Based Workspaces**: Kelola workspace pribadi maupun tim dengan pembagian peran (Owner / Admin / Editor / Viewer) yang ditegakkan di sisi server, lengkap dengan undangan terverifikasi email dan deteksi konflik edit bersamaan.
- **Undangan Tim & Anggota**: Tambah dan kelola anggota workspace secara langsung.

### 2. Eksekusi Request & Integrasi Environment Variables
- **Dukungan Multi-Protokol**: HTTP/REST (GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD), WebSocket (WS/WSS), Server-Sent Events (SSE), dan GraphQL.
- **Seamless Environment Variables**: Ganti URL, Header, Params, maupun Body secara otomatis dengan sintaks `{{variable_name}}`.
- **Autocomplete & Quick Manager Modal**: Autocomplete otomatis saat mengetik `{{` di input/textarea, lengkap dengan modal *Quick Manage* untuk menambah, mengedit, dan mengamankan variabel rahasia (*secret masking*).
- **Proxy Server (CORS Bypass)**: Bypasses keterbatasan CORS browser untuk menguji endpoint eksternal tanpa kendala.

### 3. Ekspor & Impor Data (Backup & Compatibility)
- **Full Workspace Backup (JSON)**: Ekspor dan unduh seluruh isi workspace (koleksi, folder, request, environment) ke format JSON.
- **Impor Serbaguna**: Mendukung impor dari **Postman Collection v2.1**, **OpenAPI 3.0 / Swagger (JSON/YAML)**, perintah **cURL**, serta file **Environment JSON**.
- **Ekspor Konfigurasi API Gateway**: Ekspor koleksi langsung ke format konfigurasi gateway populer: **KrakenD**, **Kong Declarative (YAML/JSON)**, dan **Spring Cloud Gateway**.

### 4. Interactive Scripting Sandbox (`pm.*`)
- **Pre-request Scripts**: Eksekusi JavaScript sebelum request dikirim untuk set variabel dinamis (`pm.environment.set`), pembuatan timestamp, atau manipulasi header.
- **Test Scripts & Assertions**: Pengujian respon otomatis menggunakan sintaks assertion kompatibel Postman (`pm.test`, `pm.expect`, `pm.response.code`, `pm.response.json()`).

### 5. Mock Servers & Endpoint Simulation
- **Simulasi Respon Backend**: Definisikan status code, header kustom, dan payload respon JSON untuk setiap endpoint.
- **Manajemen Server Mock**: Panel khusus untuk mengaktifkan/nondisiapkan mock endpoint, mengedit respon secara langsung, dan menyalin URL mock publik.

### 6. GraphQL Studio
- **Introspeksi Skema Otomatis**: Ambil skema type, query, dan mutation dari server GraphQL hanya dengan satu klik.
- **Visual Schema Explorer**: Panel navigasi skema visual untuk menyusun Query/Mutation secara interaktif.
- **GraphQL History & Variables**: Simpan riwayat query GraphQL dan passing variabel JSON.

### 7. Automated Collection Runner (Data-Driven Testing)
- **Eksekusi Batch Otomatis**: Jalankan seluruh request dalam koleksi atau folder secara sekuensial.
- **Pengujian berbasis Data (CSV/JSON)**: Unggah file CSV/JSON berisi baris data pengujian untuk mengiterasi pengujian secara dinamis.
- **Laporan Ringkasan Respon**: Grafik dan statistik pass/fail, waktu respon rata-rata, dan opsi ekspor laporan ke JSON.

### 8. Desktop Agent Bridge & SSRF Protection
- **Pengujian Localhost & Jaringan Privat**: Menghubungkan aplikasi web dengan jembatan lokal (Node.js agent di port `8765`) untuk menguji endpoint `http://localhost:*` tanpa terhalang proteksi SSRF cloud.

### 9. Respons Inspection & JSON Path Utilities
- **JSON Tree Viewer**: Format tampilan JSON interaktif dengan tombol lipat/buka node.
- **Copy JSON Path Feature**: Klik kanan / klik ikon pada key/value JSON untuk menyalin path presisi (contoh: `$.data.user.id`).
- **Code Snippet Generator**: Generasi cuplikan kode request untuk berbagai bahasa (cURL, JavaScript Fetch, Axios, Python, Go, Node.js).

### 10. Dokumentasi & Panduan Interaktif
- **Help Guide Modal**: Panduan penggunaan interaktif langsung di dalam aplikasi (diakses via tombol **Help / Documentations** di baris header).
- **Panduan README.md Lengkap**: Dokumentasi teknis terstruktur untuk membantu tim memulai proyek dengan cepat.

### 11. Pintasan Papan Ketik & Hotkeys (Global Shortcuts)
- **Save Request (`Ctrl+S` / `Cmd+S`)**: Menyimpan konfigurasi request aktif secara cepat.
- **Send Request (`Ctrl+Enter` / `Cmd+Enter`)**: Mengirim request HTTP/WS/SSE aktif dari layar manapun.
- **Create Standalone Request (`Ctrl+N` / `Cmd+N`)**: Membuat request independen baru tanpa perlu membuat koleksi terlebih dahulu.
- **Quick Search (`Ctrl+K` / `Cmd+K`)**: Membuka modal pencarian pintar untuk mencari request, koleksi, dan variabel environment.
- **Quick Env Manager (`Ctrl+E` / `Cmd+E`)**: Membuka pengelola variabel lingkungan secara melayang.
- **Keyboard Cheatsheet (`Ctrl+/` / `Cmd+/`)**: Membuka dialog cheatsheet seluruh pintasan tombol aplikasi.
- **Quick View Switcher (`Alt+1` s.d. `Alt+5`)**: Berpindah tampilan instan antara Request Builder, Environment Manager, Collection Runner, Mock Servers, dan GraphQL Studio.
- **Fast Escape (`Esc`)**: Menutup modal, dropdown, atau overlay aktif secara instan.

### 12. Standalone / Unsaved Requests & Flexibility
- **Request Tanpa Harus Buat Koleksi**: Buat request API baru kapan saja secara langsung tanpa perlu membuat atau memilih koleksi terlebih dahulu (via `Ctrl+N`, tombol `+` di TabBar, atau tombol `+` di Sidebar).
- **Draft Requests Engine**: Request independen tersimpan secara lokal sebagai draft sehingga pengguna dapat langsung melakukan pengujian tanpa hambatan alur kerja.
- **Save / Move to Collection**: Pindahkan atau simpan request draft ke dalam koleksi & folder mana pun kapan saja melalui tombol **Save to Collection** / modal yang interaktif.

---

## 🛠️ Persyaratan Sistem & Dependensi
- **Node.js**: v18.0.0 atau lebih baru.
- **Database**: PostgreSQL / SQLite (via Prisma ORM).
- **Frontend Framework**: React 18, Vite, Tailwind CSS, Lucide Icons, Recharts, Motion.
- **Backend Framework**: Express.js (Mode Full-stack & Standalone).

---
*API Tester Pro v1.0.0 siap digunakan untuk mendukung produktivitas pengujian API Anda!*
