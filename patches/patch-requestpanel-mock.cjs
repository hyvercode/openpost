const fs = require('fs');
let code = fs.readFileSync('src/components/RequestPanel.tsx', 'utf8');

code = code.replace(
  /suggestions=\{type === 'headers' \? COMMON_HEADERS : undefined\}/,
  "suggestions={type === 'headers' || type === 'mockHeaders' ? COMMON_HEADERS : undefined}"
);

fs.writeFileSync('src/components/RequestPanel.tsx', code);
