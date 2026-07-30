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
 10. Buat email konfirmasi jika register berhasil dan user hanya bisa login jika email sudah terkonfimrasi
     Done
 11. Create a Settings panel interface that allows users to pick custom primary colors for the UI instead of being limited to the three predefined themes.
     Done
 12. Add a 'Mock Server' feature that allows users to define endpoint responses based on path/method, enabling them to simulate an API before the backend is ready.
     Done
 13. Integrated GraphQL Schema Explorer, Visual Query Builder, and Live Query Validation within RequestPanel.
     Done
 14. Desktop Agent Bridge and SSRF implemented
     Done
 15. Desktop Agent binaries built
     Done
 16. Implemented automatic ping mechanism to detect and switch to Desktop Agent Bridge
     Done
 17. Updated Dockerfile
     Done
 18. Implemented multiple request selection and sequential running with aggregate results in Response Panel.
     Done
 19. Added visual progress indicator and success/failure summary bar for sequential request batch runner.
     Done
