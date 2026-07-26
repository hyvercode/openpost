const fs = require('fs');
let code = fs.readFileSync('src/components/RequestPanel.tsx', 'utf8');

const COMMON_HEADERS = [
  'Accept', 'Accept-Charset', 'Accept-Encoding', 'Accept-Language',
  'Authorization', 'Cache-Control', 'Connection', 'Content-Length',
  'Content-Type', 'Cookie', 'Date', 'Expect', 'Forwarded', 'From',
  'Host', 'If-Match', 'If-Modified-Since', 'If-None-Match', 'If-Range',
  'If-Unmodified-Since', 'Max-Forwards', 'Origin', 'Pragma', 'Proxy-Authorization',
  'Range', 'Referer', 'TE', 'Upgrade', 'User-Agent', 'Via', 'Warning'
];

code = code.replace(
  "const renderKeyValueEditor = (type: 'headers' | 'params' | 'mockHeaders') => {",
  `const COMMON_HEADERS = ${JSON.stringify(COMMON_HEADERS)};\n  const renderKeyValueEditor = (type: 'headers' | 'params' | 'mockHeaders') => {`
);

code = code.replace(
  /onValueChange=\{\(val\) => handleKeyValueChange\(type, item.id, 'key', val\)\}/,
  `suggestions={type === 'headers' ? COMMON_HEADERS : undefined}\n                    onValueChange={(val) => handleKeyValueChange(type, item.id, 'key', val)}`
);

fs.writeFileSync('src/components/RequestPanel.tsx', code);
