# API Tester Pro

A powerful, Postman-like API testing application with team collaboration, collections, and environment variable support.

## Features
- **Firebase Realtime Sync**: Instantly sync collections and environments across your team.
- **Offline Support**: IndexedDB caching ensures you can still view and edit requests offline.
- **Postman Import**: Import existing Postman collections (v2.1) directly via the Upload icon.
- **Role-Based Workspaces**: Only invited users can access specific workspaces.
- **Proxy Server**: Bypasses CORS limitations for testing any API in the browser.

## Setup & Running

This application is a full-stack web application (React + Vite front-end, Express backend, Prisma database) that can also be run as a desktop app.

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- Firebase account (if utilizing the real-time sync capabilities)
- Cloud SQL or PostgreSQL database (for the Prisma backend)

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env` (if available) and fill in your environment configurations:
- Database URL (`DATABASE_URL`) for Prisma.
- Firebase credentials (`VITE_FIREBASE_*`).
- Optional proxy configurations or other secrets.

### 3. Database Setup (Prisma)
Ensure your database is running, then apply the schema and generate the client:
```bash
npx prisma generate
npx prisma db push
```
*(If using migrations, run `npx prisma migrate dev` instead)*

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



## Desktop Agent Bridge & Security

To enhance security, the Cloud Agent (web version) blocks Server-Side Request Forgery (SSRF) attempts by restricting access to `localhost`, `127.0.0.1`, and private internal networks. 

To test APIs running on your local machine or private network, you must use the **Desktop Agent Bridge**.

### Running the Desktop Agent locally

You can run the agent bridge locally via Node.js:
```bash
npm run bridge
```
The agent runs on port `8765`.

### Building Desktop Agent Binaries

You can compile the Desktop Agent Bridge into standalone executable binaries for Windows, macOS, and Linux using `pkg`:
```bash
npm run build:agent
```
*(Assuming `build:agent` is configured to run `npx pkg agent/desktop-agent.js -t node18-win-x64,node18-linux-x64,node18-macos-x64 --out-path public/downloads`)*

The binaries will be available in the `public/downloads` directory and can be downloaded directly from the web interface.

## Desktop Build (Electron)
This application is configured to be built as a cross-platform desktop application using Electron.

To run the desktop version locally:
```bash
npm run electron:dev
```

To package for Windows, macOS, and Linux, you can integrate tools like `electron-builder`:
```bash
npm install -D electron-builder
```
Then add packaging scripts to `package.json`.


## Execution Modes

This application can be run in three different setups depending on your deployment and development needs:

### 1. Monolith Mode (Default)
Runs both the frontend assets (Vite dev server or static distribution files) and the backend APIs in a single, combined process.
* **Development**:
  ```bash
  npm run dev
  # or
  npm run dev:monolith
  ```
* **Production Build & Run**:
  ```bash
  npm run build
  npm start
  ```

### 2. Backend Only Mode
Skips frontend compiling and rendering completely. Runs only the Express API routes, auth controller, rate limiters, and mock proxies.
* **Development**:
  ```bash
  npm run dev:backend
  ```
* **Production Build & Run**:
  ```bash
  npm run build:backend
  npm run start:backend
  ```

### 3. Frontend Only Mode
Launches the standalone Vite development environment or builds static client assets only.
* **Development**:
  ```bash
  npm run dev:frontend
  ```
  *Note: Any `/api` calls are automatically proxied to the backend at `http://localhost:3000` (or configured via `VITE_API_URL`).*
* **Production Build & Run**:
  ```bash
  npm run build:frontend
  npm run preview:frontend
  ```

## Cloud

https://openpost.hyvercode.com
