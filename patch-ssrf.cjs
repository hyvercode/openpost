const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf8');

if (!server.includes("import ip from 'ip'")) {
    server = server.replace('import express from "express";', 'import express from "express";\nimport ip from "ip";\nimport dns from "dns/promises";');
}

const targetStr = `      if (!targetUrl) {
        return res.status(400).json({ error: "Missing x-target-url header or url in request body" });
      }`;

const replacementStr = `      if (!targetUrl) {
        return res.status(400).json({ error: "Missing x-target-url header or url in request body" });
      }

      // SSRF Protection
      try {
        const urlObj = new URL(targetUrl);
        const resolved = await dns.lookup(urlObj.hostname);
        if (ip.isPrivate(resolved.address) || ip.isLoopback(resolved.address)) {
          return res.status(403).json({ 
            error: "SSRF Protection: Access to internal or local networks is blocked.",
            suggestion: "To test local APIs, please use the Desktop Agent Bridge."
          });
        }
      } catch (err) {
        return res.status(400).json({ error: "Invalid URL or DNS resolution failed: " + err.message });
      }`;

if (!server.includes("// SSRF Protection")) {
    server = server.replace(targetStr, replacementStr);
    fs.writeFileSync('server.ts', server, 'utf8');
    console.log("Patched server.ts with SSRF protection.");
} else {
    console.log("SSRF protection already exists.");
}

