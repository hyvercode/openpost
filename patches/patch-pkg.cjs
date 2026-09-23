const fs = require('fs');
let pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

pkg.scripts.bridge = "node desktop-agent.js";

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2), 'utf8');
console.log("package.json updated.");
