const fs = require('fs');
let code = fs.readFileSync('src/components/MockSettings.tsx', 'utf8');

code = code.replace(
`                {req.mockResponse?.body || '{
  "message": "Default mock response"
}'}`,
`                {req.mockResponse?.body || '{\n  "message": "Default mock response"\n}'}`
);

fs.writeFileSync('src/components/MockSettings.tsx', code);
