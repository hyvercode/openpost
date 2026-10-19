const fs = require('fs');
let api = fs.readFileSync('src/lib/api.ts', 'utf8');

if (!api.includes('useStore.getState().agentMode')) {
    api = api.replace(
        `import { useStore } from '../store/useStore';`,
        `import { useStore } from '../store/useStore';` // Ensure imported
    );

    const replacement = `async executeRequest(req: any, proxyConfig?: any, forceDirect = false) {
    const { agentMode } = useStore.getState();
    const isDesktopAgent = agentMode === 'desktop';

    // If using Desktop Agent, we route to local bridge port (default 8765)
    const proxyBaseUrl = isDesktopAgent ? 'http://127.0.0.1:8765/api/proxy' : ((import.meta as any).env?.VITE_API_URL || '') + '/api/proxy';

    const url = req.url || '';
    // If not desktop agent and force direct or it's a local IP
    const isLocal = !isDesktopAgent && (forceDirect || /localhost|127\\.0\\.0\\.1|\\[::1\\]|192\\.168\\.\\d+\\.\\d+|10\\.\\d+\\.\\d+\\.\\d+/i.test(url));

    if (isLocal) {`;

    api = api.replace(
        /async executeRequest\(req: any, proxyConfig\?: any, forceDirect = false\) \{\s*const url = req\.url \|\| '';\s*const isLocal = forceDirect \|\| \/localhost\|127\\\.0\\\.0\\\.1\|\\\[::1\\]\|192\\\.168\\\.\\d\+\\\.\\d\+\|10\\\.\\d\+\\\.\\d\+\\\.\\d\+\/i\.test\(url\);\s*if \(isLocal\) \{/,
        replacement
    );

    const replacementProxyCall = `      const method = (req.method || 'GET').toUpperCase();
      const headers = req.headers ? req.headers.reduce((acc: any, h: any) => {
        if (h.enabled && h.key) acc[h.key] = h.value;
        return acc;
      }, {}) : {};

      let bodyData = undefined;
      if (req.body) {
        if (typeof req.body === 'object') {
          if (req.body.content !== undefined) {
            bodyData = req.body.content;
          } else {
            bodyData = req.body;
          }
        } else {
          bodyData = req.body;
        }
      }

      const proxyPayload = {
        url,
        method,
        headers,
        body: bodyData,
        proxyConfig
      };

      try {
        const response = await api.post(isDesktopAgent ? 'http://127.0.0.1:8765/api/proxy' : '/proxy', proxyPayload, {
          headers: {
            'x-target-url': url
          }
        });`;

    api = api.replace(
        /const method = \(req\.method \|\| 'GET'\)\.toUpperCase\(\);\s*const headers = req\.headers \? req\.headers\.reduce\(\(acc: any, h: any\) => \{\s*if \(h\.enabled && h\.key\) acc\[h\.key\] = h\.value;\s*return acc;\s*\}, \{\}\) : \{\};\s*let bodyData = undefined;\s*if \(req\.body\) \{\s*if \(typeof req\.body === 'object'\) \{\s*if \(req\.body\.content !== undefined\) \{\s*bodyData = req\.body\.content;\s*\} else \{\s*bodyData = req\.body;\s*\}\s*\} else \{\s*bodyData = req\.body;\s*\}\s*\}\s*try \{\s*const response = await api\.post\('\/proxy', \{\s*url,\s*method,\s*headers,\s*body: bodyData,\s*proxyConfig\s*\}, \{\s*headers: \{\s*'x-target-url': url\s*\}\s*\}\);/,
        replacementProxyCall
    );

    fs.writeFileSync('src/lib/api.ts', api, 'utf8');
    console.log("Patched api.ts for desktop agent proxy.");
}
