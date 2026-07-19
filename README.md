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
