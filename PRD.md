## Features

  1. Request History: Menyimpan riwayat (history) request yang pernah dikirim oleh user sehingga mudah untuk diulang atau dicari kembali tanpa harus menyimpannya secara permanen ke dalam collection.
     Done
  2. GraphQL Support: Dukungan khusus untuk query GraphQL beserta fitur autocomplete dan schema introspection di bagian tab Body.
     Done
  3. Advanced Authorization: Menambahkan tipe otorisasi yang lebih kompleks seperti OAuth 2.0, AWS Signature, Digest Auth, atau Hawk Authentication (selain Bearer/Basic auth yang standar).
     Done
  4. WebSocket / gRPC / SSE Support: Dukungan untuk melakukan testing pada protokol komunikasi secara real-time selain HTTP/REST biasa.
     Done

  5. Cookies Manager: Fitur untuk melihat, menambah, dan mengelola cookies secara otomatis untuk domain tertentu agar testing API yang membutuhkan sesi/cookie menjadi lebih mudah.
     Done
  6. Code Snippet Generator: Fitur untuk otomatis meng-generate kode request ke dalam berbagai bahasa pemrograman (cURL, JavaScript Axios/Fetch, Python Requests, Go, dll) dari request yang sedang dibuka.
     Done

  7. Scripting Sandbox API (pm.*): Eksekusi Pre-request Scripts & Tests menggunakan environment sandbox yang mirip dengan Postman (misalnya dengan syntax pm.response.json()) untuk validasi response yang lebih advanced.
     Done

  8. OpenAPI / Swagger Import: Selain mendukung import format Postman v2.1, aplikasi juga bisa mendukung import langsung dari file dokumentasi OpenAPI/Swagger.
     Done

  9. Automated API Testing (Runner): Fitur untuk menjalankan serangkaian request dalam satu folder/collection secara berurutan dengan laporan keberhasilan test (mirip Postman Collection Runner).
     Done