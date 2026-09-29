const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');

let serverProcess;
let mainWindow;

function checkServerReady(url, cb, attempts = 0) {
  if (attempts > 150) {
    console.error('Backend server did not become ready in time.');
    return;
  }
  const req = http.get(url, (res) => {
    if (res.statusCode === 200 || res.statusCode === 404) {
      cb();
    } else {
      setTimeout(() => checkServerReady(url, cb, attempts + 1), 200);
    }
  });
  req.on('error', () => {
    setTimeout(() => checkServerReady(url, cb, attempts + 1), 200);
  });
}

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: false // bypass CORS for direct local requests
    }
  });

  const appUrl = `http://localhost:${port}?isDesktop=true`;

  console.log('Waiting for backend server to be ready...');

  checkServerReady(appUrl, () => {
    console.log(`Backend server ready. Loading URL: ${appUrl}`);
    mainWindow.loadURL(appUrl).catch(err => {
      console.error('Failed to load URL:', err);
    });
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`Failed to load: ${errorCode} - ${errorDescription}`);
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  const port = process.env.PORT || 3000;

  // __dirname = <resources>/app.asar/electron (packaged)
  //          or <project>/electron             (dev)
  // Prefer the unpacked server copy when present so the child Node process
  // gets a real filesystem path instead of an asar virtual path.
  const asarServerPath = path.join(__dirname, '../dist/server.cjs');
  const unpackedServerPath = process.resourcesPath
    ? path.join(process.resourcesPath, 'app.asar.unpacked/dist/server.cjs')
    : null;
  const serverPath = unpackedServerPath && fs.existsSync(unpackedServerPath)
    ? unpackedServerPath
    : asarServerPath;
  console.log(`Starting backend server from: ${serverPath} on port ${port}`);

  // Writable user-data dir (packaged app dir / asar is read-only).
  // IMPORTANT: defined before spawning — the child uses this as cwd because
  // spawning with cwd inside app.asar fails with ENOTDIR.
  const userDataDir = app.getPath('userData');
  try {
    if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });
  } catch (e) {
    console.error('Failed to create userData dir:', e);
  }

  // Default to an embedded SQLite DB inside userData so the packaged desktop
  // app boots offline without requiring an external DATABASE_URL.
  // Respect an explicitly provided DATABASE_URL (e.g. power users / CI).
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = `file:${path.join(userDataDir, 'openpost.db')}`;
  }
  if (!process.env.DB_PROVIDER) {
    process.env.DB_PROVIDER = 'sqlite';
  }

  // Run the backend with the Node.js bundled inside Electron via
  // ELECTRON_RUN_AS_NODE. This is required because:
  // 1. End users don't have Node.js installed (system `node` is absent).
  // 2. Native modules (better-sqlite3) are rebuilt against Electron's Node
  //    ABI — they load under Electron's Node but NOT under a system Node.
  // Never spawn bare `node` as the primary strategy, and never spawn
  // process.execPath without ELECTRON_RUN_AS_NODE (it would relaunch the
  // Electron GUI instead of running the script).
  // Tell the backend where its bundled assets live (independent of cwd).
  // Packaged (asar:false): <resources>/app ; dev: <project>/
  let appRootEnv = process.env.OPENPOST_APP_ROOT;
  if (!appRootEnv) {
    try {
      appRootEnv = app.getAppPath();
    } catch {
      appRootEnv = path.join(__dirname, '..');
    }
  }
  const nodeBinary = process.env.NODE_BINARY || process.execPath;
  const serverEnv = {
    ...process.env,
    OPENPOST_APP_ROOT: appRootEnv,
    ELECTRON_RUN_AS_NODE: '1',
    NODE_ENV: 'production',
    PORT: port.toString()
  };

  function spawnServer(binary) {
    return spawn(binary, [serverPath], {
      env: { ...serverEnv },
      stdio: 'inherit',
      cwd: userDataDir
    });
  }

  try {
    serverProcess = spawnServer(nodeBinary);
  } catch (err) {
    console.error('Failed to spawn backend server:', err);
    serverProcess = undefined;
  }

  if (serverProcess) {
    serverProcess.on('error', (err) => {
      console.error(`Backend spawn failed with "${nodeBinary}":`, err.message);
      // Fallback: try system node (dev machines / NODE_BINARY override).
      if (nodeBinary !== 'node') {
        console.log('Retrying backend with system "node"...');
        try {
          serverProcess = spawnServer('node');
          if (serverProcess) {
            serverProcess.on('error', (e2) => {
              console.error('System node fallback also failed:', e2.message);
            });
          }
        } catch (e2) {
          console.error('System node fallback failed:', e2.message);
        }
      } else {
        console.error('Make sure Node.js is installed and on PATH, or set NODE_BINARY env var.');
      }
    });
  }

  createWindow(port);

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(port);
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
