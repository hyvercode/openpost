// Desktop Agent Bridge
// Run this locally with: node desktop-agent.js

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 8765;

const server = http.createServer((req, res) => {
  // Add CORS headers for the web app to communicate with the bridge
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-target-url, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', agent: 'DesktopAgentBridge' }));
    return;
  }

  if (req.method === 'POST' && req.url === '/api/proxy') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const targetUrl = req.headers['x-target-url'] || payload.url;
        
        if (!targetUrl) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Missing x-target-url header or url in payload' }));
          return;
        }

        const parsedUrl = new URL(targetUrl);
        const client = parsedUrl.protocol === 'https:' ? https : http;

        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
          method: payload.method || 'GET',
          headers: payload.headers || {},
          rejectUnauthorized: false // Allow self-signed certs for local testing
        };

        // Remove problematic headers
        delete options.headers['host'];
        delete options.headers['content-length'];

        const startTime = performance.now();

        const proxyReq = client.request(options, (proxyRes) => {
          let responseData = [];
          proxyRes.on('data', chunk => {
            responseData.push(chunk);
          });
          proxyRes.on('end', () => {
            const buffer = Buffer.concat(responseData);
            const isJson = proxyRes.headers['content-type']?.includes('application/json');
            let data = buffer.toString('utf8');
            try {
              if (isJson) data = JSON.parse(data);
            } catch (e) {}

            const endTime = performance.now();
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              status: proxyRes.statusCode,
              statusText: proxyRes.statusMessage,
              headers: proxyRes.headers,
              data: data,
              timeMs: Math.round(endTime - startTime),
              size: buffer.length,
              timings: {
                 dns: 0, connect: 0, ssl: 0, send: 0, receive: 0,
                 total: Math.round(endTime - startTime)
              }
            }));
          });
        });

        proxyReq.on('error', (e) => {
          const endTime = performance.now();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
             status: 0,
             statusText: 'Agent Bridge Connection Failed',
             headers: {},
             data: { error: e.message, message: 'Desktop agent failed to connect to target.' },
             timeMs: Math.round(endTime - startTime),
             size: 0,
             timings: { dns: 0, connect: 0, ssl: 0, send: 0, receive: 0, total: 0 }
          }));
        });

        if (payload.body) {
           let writeBody = payload.body;
           if (typeof writeBody === 'object') {
             writeBody = JSON.stringify(writeBody);
           }
           proxyReq.write(writeBody);
        }
        
        proxyReq.end();

      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Desktop Agent Bridge running at http://127.0.0.1:${PORT}/`);
  console.log(`Select 'Desktop Agent' in the web application to route requests through this bridge.`);
});
