# API Tester Pro

A powerful, Postman-like API testing application with team collaboration, collections, and environment variable support.

## Features
- **Firebase Realtime Sync**: Instantly sync collections and environments across your team.
- **Offline Support**: IndexedDB caching ensures you can still view and edit requests offline.
- **Postman Import**: Import existing Postman collections (v2.1) directly via the Upload icon.
- **Role-Based Workspaces**: Only invited users can access specific workspaces.
- **Proxy Server**: Bypasses CORS limitations for testing any API in the browser.

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
