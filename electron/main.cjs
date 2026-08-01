const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let serverProcess;
let mainWindow;

function checkServerReady(url, cb) {
  const req = http.get(url, (res) => {
    if (res.statusCode === 200 || res.statusCode === 404) {
      cb();
    } else {
      setTimeout(() => checkServerReady(url, cb), 200);
    }
  });
  req.on('error', () => {
    setTimeout(() => checkServerReady(url, cb), 200);
  });
}

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false // bypass CORS for direct local requests
    }
  });

  const appUrl = `http://localhost:${port}`;
  
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
  
  // Use the built CommonJS server script
  const serverPath = path.join(__dirname, '../dist/server.cjs');
  console.log(`Starting backend server from: ${serverPath} on port ${port}`);
  
  serverProcess = spawn('node', [serverPath], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: port.toString()
    },
    stdio: 'inherit', cwd: path.join(__dirname, '..')
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start backend server:', err);
  });

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
