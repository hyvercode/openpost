# API Tester Pro

A powerful, Postman-like API testing application with team collaboration, collections, and environment variable support.

## Features
- **Firebase Realtime Sync**: Instantly sync collections and environments across your team.
- **Offline Support**: IndexedDB caching ensures you can still view and edit requests offline.
- **Postman & OpenAPI Import**: Import existing Postman collections (v2.1) and OpenAPI/Swagger specs directly.
- **Role-Based Workspaces**: Only invited users can access specific workspaces.
- **Proxy Server**: Bypasses CORS limitations for testing any API in the browser.
- **Scripting Sandbox (`pm.*`)**: Pre-request scripts and post-response test assertions.
- **Mock Servers**: Define and deploy mock endpoint responses for frontend simulation.
- **GraphQL Studio**: Schema introspection, visual query builder, and query validation.
- **Automated Collection Runner**: Sequential batch testing with CSV/JSON data-driven execution.
- **Desktop Agent Bridge**: Localhost and private network API testing with SSRF protection.
- **Workspace & Collection JSON Backup**: Instant JSON export and restore for entire workspaces, collections, and environments.

---

## User Guide & Feature Documentation

### 1. Scripting Sandbox (`pm.*`)

The application includes a Postman-compatible JavaScript sandbox for **Pre-request Scripts** and **Test Scripts**.

#### Pre-request Scripts
Executed immediately before a request is sent. Use it to manipulate variables or sign headers:
```javascript
// Set environment variables dynamically
pm.environment.set("timestamp", Date.now());
pm.environment.set("requestId", "REQ_" + Math.random().toString(36).substring(7));

// Add custom headers
pm.request.headers.add({ key: "X-Custom-Header", value: "CustomValue" });
```

#### Test Scripts & Assertions
Executed after the HTTP response is received. Write tests using `pm.test` and inspect response data:
```javascript
// Verify Status Code
pm.test("Status code is 200", function () {
    pm.expect(pm.response.code).to.equal(200);
});

// Parse JSON response body & save authentication token
pm.test("Response contains valid auth token", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.token).to.be.a('string');
    pm.environment.set("authToken", jsonData.token);
});

// Response time check
pm.test("Response time is under 500ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(500);
});
```

---

### 2. Mock Servers & Endpoint Simulation

Mock Servers allow you to simulate API endpoints before the actual backend is ready.

1. **Define a Mock Response**: Inside any request, open the **Mock Response** tab. Set the status code (e.g., 200, 201, 404), custom headers, and desired JSON body payload.
2. **Enable Mocking**: Toggle **Enable Mock Response** to ON. When sending a request to that URL, the application will intercept the call and instantly return your mock JSON response.
3. **Mock Server Management**: Switch to the **Mock API Servers** view from the left sidebar to view all registered mock endpoints, edit JSON content on the fly, toggle active states, or copy public mock URLs.

---

### 3. GraphQL Studio

- **Schema Introspection**: Set request method to `GQL` or select `GraphQL` body type. Click **Introspect Schema** to retrieve all available types, queries, and mutations from the target GraphQL server.
- **Visual Query Builder**: Open the **Schema Explorer** panel on the right side of the Request Panel to visually navigate types and click fields to auto-construct GraphQL queries.
- **Variables & History**: Pass JSON variables in the Variables editor. Past queries are saved in GraphQL History for instant replay.

---

### 4. Automated Collection Runner & CSV Data

- **Sequential Execution**: Click **Run Collection** on any folder or collection to launch the Automated Runner.
- **Data-Driven Testing (CSV/JSON)**: Upload a CSV or JSON file containing test data rows. Use column headers as environment variable placeholders (e.g. `{{user_email}}`, `{{user_role}}`).
- **Iteration Reports**: The runner will loop through each row in the data file, executing the full collection of requests and presenting a real-time pass/fail summary report.

---

### 5. Desktop Agent Bridge & SSRF Protection

To enhance security, the Cloud Agent blocks Server-Side Request Forgery (SSRF) attempts by restricting access to `localhost`, `127.0.0.1`, and private internal networks. 

To test APIs running on your local machine or private network, you must use the **Desktop Agent Bridge**.

#### Running the Desktop Agent locally
You can run the agent bridge locally via Node.js:
```bash
npm run bridge
```
The agent runs on port `8765`. The web app will automatically detect the local bridge and allow seamless testing of `http://localhost:*` endpoints.

---

### 6. Workspace Data Backup & JSON Export

The application provides native JSON export and backup capabilities:

1. **Full Workspace Backup**: In **Settings -> Workspace Settings**, click **Export Workspace (JSON Backup)** to download a complete `.json` snapshot (`openpost_workspace_backup_*.json`) containing all collections, subfolders, requests, headers, body payloads, and environment variables.
2. **Single Collection JSON**: In the sidebar, click the context menu (`...`) next to any collection and select **Collection JSON (Backup)** to download an individual collection file.
3. **Sidebar Quick Export**: Use the export icon (`Download`) in the sidebar header to quickly generate an OpenPost or Postman collection export.
4. **Restoring Backups**: Drag & drop or upload any exported `.json` file using the **Import** button in the sidebar to restore collections and environment variables into your active workspace.

---

## Setup & Running

This application is a full-stack web application (React + Vite front-end, Express backend, Prisma database) that can also be run as a desktop app.

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- Firebase account (if utilizing real-time sync capabilities)
- Cloud SQL or PostgreSQL database (for the Prisma backend)

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env` and configure your environment variables:
- Database URL (`DATABASE_URL`) for Prisma.
- Firebase credentials (`VITE_FIREBASE_*`).

### 3. Database Setup (Prisma)
Ensure your database is running, then apply the schema and generate the client:
```bash
npx prisma generate
npx prisma db push
```

### 4. Running the Application

**Development Server (Web)**
Starts the Express server with Vite middleware for full-stack HMR (runs on port 3000):
```bash
npm run dev
```

**Production Build (Web)**
Builds the client and server for deployment, then starts the optimized production server:
```bash
npm run build
npm run start
```

---

## Desktop Build (Electron)

To run the desktop version locally:
```bash
npm run electron:dev
```

To package for Windows, macOS, and Linux:
```bash
npm run build:electron
```

---

## Execution Modes

### 1. Monolith Mode (Default)
Runs both frontend assets and backend APIs in a single process on port 3000.
```bash
npm run dev
```

### 2. Backend Only Mode
Runs only the Express API routes and auth controller.
```bash
npm run dev:backend
```

### 3. Frontend Only Mode
Launches the standalone Vite development environment.
```bash
npm run dev:frontend
```

---

## Live Cloud App

https://openpost.hyvercode.com
