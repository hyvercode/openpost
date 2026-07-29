const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  "import { SettingsView } from './components/SettingsView';",
  "import { SettingsView } from './components/SettingsView';\nimport { CookieManager } from './components/CookieManager';"
);

content = content.replace(
  "          ) : activeView === 'test_suite' ? (",
  "          ) : activeView === 'cookies' ? (\n            <CookieManager />\n          ) : activeView === 'test_suite' ? ("
);

fs.writeFileSync('src/App.tsx', content);
console.log('App patched');
