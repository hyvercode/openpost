// Secure Electron preload script.
//
// SECURITY: this runs with full Node access, but exposes ONLY a minimal
// read-only API to the renderer via contextBridge. The renderer must run
// with nodeIntegration:false + contextIsolation:true + sandbox (see
// electron/main.cjs), so `process`, `require` and `window.isElectron`-style
// globals are NOT available to web content. Renderer code should use
// `window.openpost.isDesktop` instead of sniffing globals/query params.
const { contextBridge } = require('electron');

const openpostApi = Object.freeze({
  isDesktop: true,
  platform: process.platform,
  versions: Object.freeze({
    chrome: process.versions.chrome,
    node: process.versions.node,
    electron: process.versions.electron,
  }),
});

try {
  contextBridge.exposeInMainWorld('openpost', openpostApi);
  // Back-compat flags for existing renderer checks (read-only booleans,
  // no Node access leaked).
  contextBridge.exposeInMainWorld('isDesktop', true);
  contextBridge.exposeInMainWorld('isElectron', true);
} catch (err) {
  console.error('preload: failed to expose openpost API', err);
}

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type]);
  }
});
