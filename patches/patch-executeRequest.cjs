const fs = require('fs');

let api = fs.readFileSync('src/lib/api.ts', 'utf8');

// I will extract everything before executeRequest and everything after it.
const startIdx = api.indexOf('async executeRequest(req: any, proxyConfig?: any, forceDirect = false) {');
if (startIdx === -1) {
    console.error("Could not find executeRequest!");
    process.exit(1);
}

const beforeExecuteRequest = api.slice(0, startIdx);

const newExecuteRequest = `async executeRequest(req: any, proxyConfig?: any, forceDirect = false) {
    const { agentMode } = useStore.getState();
    const isDesktopAgent = agentMode === 'desktop';
    const proxyBaseUrl = isDesktopAgent ? 'http://127.0.0.1:8765/api/proxy' : '/proxy';

    const url = req.url || '';
    const isLocal = !isDesktopAgent && (forceDirect || /localhost|127\\.0\\.0\\.1|\\[::1\\]|192\\.168\\.\\d+\\.\\d+|10\\.\\d+\\.\\d+\\.\\d+/i.test(url));

    if (isLocal) {
      const startTime = performance.now();
      const method = (req.method || 'GET').toUpperCase();
      const headers = req.headers ? req.headers.reduce((acc: any, h: any) => {
        if (h.enabled && h.key) acc[h.key] = h.value;
        return acc;
      }, {}) : {};

      let bodyData = undefined;
      if (req.body) {
        if (typeof req.body === 'object') {
          if (req.body.content !== undefined) {
            try {
              bodyData = JSON.parse(req.body.content);
            } catch {
              bodyData = req.body.content;
            }
          } else {
            bodyData = req.body;
          }
        } else {
          bodyData = req.body;
        }
      }

      try {
        const response = await axios({
          method,
          url,
          headers,
          data: bodyData,
          validateStatus: () => true,
        });
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        const responseData = response.data;
        const size = typeof responseData === 'string' ? responseData.length : JSON.stringify(responseData || '').length;

        return {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data: responseData,
          timeMs: Math.round(totalTime),
          size,
          timings: {
            dns: 0,
            connect: 0,
            ssl: 0,
            send: 0,
            wait: Math.round(totalTime),
            receive: 0,
          }
        };
      } catch (err: any) {
        const endTime = performance.now();
        return {
          status: 0,
          statusText: 'CORS Block or Connection Refused',
          headers: {},
          data: {
            error: err.message || 'Connection Failed',
            message: \`Could not connect to \${url} directly from the browser.\`,
            troubleshooting: [
              "Verify your local server is running on the specified port.",
              "Ensure CORS is enabled in your server configuration (headers: Access-Control-Allow-Origin: *).",
              "Install a CORS-unblocking browser extension to bypass restrictions in the preview environment.",
              "If the server is not accessible publicly, run 'ngrok http 3000' and use the secure public URL instead."
            ]
          },
          timeMs: Math.round(endTime - startTime),
          size: 0,
          timings: { dns: 0, connect: 0, ssl: 0, send: 0, wait: 0, receive: 0 }
        };
      }
    }

    let proxyBody = undefined;
    if (req.body) {
      if (typeof req.body === 'object') {
        if (req.body.content !== undefined) {
          try {
            proxyBody = JSON.parse(req.body.content);
          } catch {
            proxyBody = req.body.content;
          }
        } else {
          proxyBody = req.body;
        }
      } else {
        proxyBody = req.body;
      }
    }

    try {
      const res = await api.post(isDesktopAgent ? 'http://127.0.0.1:8765/api/proxy' : '/proxy', {
        method: req.method,
        url: req.url,
        headers: req.headers ? req.headers.reduce((acc: any, h: any) => {
          if (h.enabled && h.key) acc[h.key] = h.value;
          return acc;
        }, {}) : {},
        body: proxyBody,
        proxyConfig,
      }, {
        headers: {
          'x-target-url': req.url
        }
      });
      return res.data;
    } catch (err: any) {
      if (isDesktopAgent) {
         return {
            status: 0,
            statusText: 'Agent Bridge Not Found',
            headers: {},
            data: {
              error: 'Connection to Desktop Agent Bridge Failed',
              message: 'Make sure your local Desktop Agent Bridge is running on port 8765.',
              troubleshooting: [
                "Run 'npm run bridge' or start the agent executable locally.",
                "Ensure no firewall is blocking access to 127.0.0.1:8765."
              ]
            },
            timeMs: 0,
            size: 0,
            timings: { dns: 0, connect: 0, ssl: 0, send: 0, wait: 0, receive: 0 }
         };
      } else {
         throw err;
      }
    }
  },
};`;

fs.writeFileSync('src/lib/api.ts', beforeExecuteRequest + newExecuteRequest, 'utf8');
console.log("Execute request patched!");
