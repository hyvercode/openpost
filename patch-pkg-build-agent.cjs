const fs = require('fs');
let pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

pkg.scripts['build:agent'] = "mkdir -p public/downloads && npx pkg agent/desktop-agent.js -t node18-win-x64,node18-linux-x64,node18-macos-x64 --out-path public/downloads";

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2), 'utf8');
console.log("package.json updated with build:agent.");
