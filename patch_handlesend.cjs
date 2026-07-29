const fs = require('fs');
let content = fs.readFileSync('src/components/RequestPanel.tsx', 'utf8');

const newMethodHandle = `
    if (method === 'WS') {
      const reqId = activeRequest?.id;
      if (!reqId) return;
      const status = wsStatus[reqId] || 'disconnected';
      if (status === 'disconnected') {
        let finalUrl = replaceEnvironmentVariables(url, currentEnvironment?.variables || []);
        if (!finalUrl.startsWith('ws://') && !finalUrl.startsWith('wss://')) {
          finalUrl = 'ws://' + finalUrl.replace(/^https?:\\/\\//, '');
        }
        wsManager.connect(reqId, finalUrl);
        setActiveTab('ws_messages');
      } else {
        wsManager.disconnect(reqId);
      }
      return;
    }

    if (method === 'SSE') {
      const reqId = activeRequest?.id;
      if (!reqId) return;
      const status = wsStatus[reqId] || 'disconnected';
      if (status === 'disconnected') {
        let finalUrl = replaceEnvironmentVariables(url, currentEnvironment?.variables || []);
        if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
          finalUrl = 'http://' + finalUrl;
        }
        sseManager.connect(reqId, finalUrl);
        setActiveTab('ws_messages');
      } else {
        sseManager.disconnect(reqId);
      }
      return;
    }

    if (method === 'GRPC') {
      addToast('gRPC support is in preview. Treating as standard POST proxy.', 'info');
      // Continues as POST...
    }
`;

content = content.replace(
  /    if \(method === 'WS'\) \{\n      const reqId = activeRequest\?\.id;\n      if \(!reqId\) return;\n      const status = wsStatus\[reqId\] \|\| 'disconnected';\n      if \(status === 'disconnected'\) \{\n        let finalUrl = replaceEnvironmentVariables\(url, currentEnvironment\?\.variables \|\| \[\]\);\n        if \(\!finalUrl\.startsWith\('ws:\/\/'\) && \!finalUrl\.startsWith\('wss:\/\/'\)\) \{\n          finalUrl = 'ws:\/\/' \+ finalUrl\.replace\(\/\^https\?:\/\\\/\/, ''\);\n        \}\n        wsManager\.connect\(reqId, finalUrl\);\n        setActiveTab\('ws_messages'\);\n      \} else \{\n        wsManager\.disconnect\(reqId\);\n      \}\n      return;\n    \}/,
  newMethodHandle
);

fs.writeFileSync('src/components/RequestPanel.tsx', content);
console.log('done patching handlesend');
