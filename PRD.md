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
 20. Redesigned Header Bar UI/UX with modern grouped toolbars, custom environment status indicator, and streamlined layout controls.
     Done
 21. Fixed Desktop Agent file download route (/downloads/:filename) with attachment headers and added Node.js script download & quick-run copy option.
     Done
 22. Streamlined Header Bar action buttons to compact icon-only controls with descriptive hover tooltips.
     Done
 23. Moved Desktop Agent modal state (isAgentModalOpen, setIsAgentModalOpen) to global Zustand store for universal accessibility across components.
     Done
 24. Implemented global keyboard shortcut (Cmd/Ctrl + K) command palette search overlay for jumping between requests, collections, and environments.
     Done
 25. Enhanced Manage Workspace Members modal with a solid opaque background container and added loading state spinners when sending and resending invitations.
     Done
 26. Fixed Docker deployment database connection handling by auto-detecting DATABASE_URL protocol in setup-prisma, updating Prisma driver adapter pools in server/src/db.ts, and updating docker-entrypoint.sh.
     Done
 27. Implemented a feature to define mock server responses for endpoints, allowing developers to test frontend integrations before the actual backend is ready.
     Done

 28. Added subtle layout transitions for the Request/Response panels when switching between horizontal and vertical split modes to improve the UI feel.
     Done
 29. Implemented Protobuf File Upload for gRPC, allowing users to upload .proto files, select services/methods, and automatically encode/decode JSON payloads into gRPC binaries.
     Done
 30. Added Native Desktop App support (Electron) by embedding the Express backend and disabling webSecurity for native cross-origin requests, along with electron-builder configuration for packaging.
     Done
 31. Implemented real-time Comments functionality for requests, allowing team members to discuss directly inside the API editor using a new Comments tab.
     Done
 33. Set default database provider to PostgreSQL in scripts/setup-prisma.cjs, server/src/db.ts, and .env.example.
     Done
 34. Added Data-Driven Testing (CSV/JSON Import untuk Runner) allowing Automated API Testing to receive input files and execute requests repetitively using data from the file.
     Done
 35. Implement an API Mocking feature that allows users to create mock responses for specific paths. Store these mocks in the database so that when a request is sent to a mocked URL, the app returns the defined JSON response instead of performing a live network call.
     Done
 36. Create a new 'Mock Server' management view that lists created mock responses, allowing users to toggle them on/off, edit the JSON response content, and delete existing mocks.
     Done
 37. Updated Dockerfile to set default database provider to PostgreSQL via ENV DB_PROVIDER=postgresql.
     Done
 38. Fixed Docker deployment missing files for /downloads/desktop-agent by copying public and agent directories into the production image.
     Done
 39. Added a 'Copy JSON Path' feature to the JSON viewer in the ResponsePanel, allowing users to right-click a JSON key/value or object/array and copy its path (e.g., $.data.user.id) to their clipboard.
     Done
 40. Fixed the Team & Members page to actually fetch and display members and pending invitations from the backend instead of using mock data.
     Done
 41. Added a loading indicator to the 'Invite Member' button and the 'Resend Invitation' button on the Team & Collaboration settings page.
     Done
 42. Added HTTP request header value suggestions with common content types (like application/json) and other frequent headers.
     Done
 43. Enhanced Empty States & Onboarding: Added visually appealing empty states for the Request Panel, Collections, Environments, and Mock Servers, providing clear actions for users to get started (e.g., Create Request, Import cURL, Create Collection, Import OpenAPI).
     Done
