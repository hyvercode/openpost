const fs = require('fs');
let content = fs.readFileSync('src/components/CookieManager.tsx', 'utf8');

// wrap icons with span that has title
content = content.replace(
  /<Shield className="w-3.5 h-3.5 text-emerald-500" title="Secure" \/>/g,
  '<span title="Secure"><Shield className="w-3.5 h-3.5 text-emerald-500" /></span>'
);

content = content.replace(
  /<ShieldOff className="w-3.5 h-3.5 text-red-500 opacity-50" title="Not Secure" \/>/g,
  '<span title="Not Secure"><ShieldOff className="w-3.5 h-3.5 text-red-500 opacity-50" /></span>'
);

fs.writeFileSync('src/components/CookieManager.tsx', content);
console.log('Fixed CookieManager');
