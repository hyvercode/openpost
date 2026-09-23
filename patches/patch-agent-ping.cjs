const fs = require('fs');
let agent = fs.readFileSync('agent/desktop-agent.js', 'utf8');

const targetStr = `  if (req.method === 'POST' && req.url === '/api/proxy') {`;
const replacementStr = `  if (req.method === 'GET' && req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', agent: 'DesktopAgentBridge' }));
    return;
  }

  if (req.method === 'POST' && req.url === '/api/proxy') {`;

if (!agent.includes('/ping')) {
    agent = agent.replace(targetStr, replacementStr);
    fs.writeFileSync('agent/desktop-agent.js', agent, 'utf8');
    console.log("Patched desktop-agent.js with /ping route.");
} else {
    console.log("desktop-agent.js already has /ping route.");
}
