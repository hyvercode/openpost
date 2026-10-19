const fs = require('fs');
let content = fs.readFileSync('src/components/RequestPanel.tsx', 'utf8');
content = content.replace(
  /\s*\} else if \(authConfig\.type === 'awsv4'/,
  " else if (authConfig.type === 'awsv4'"
);
fs.writeFileSync('src/components/RequestPanel.tsx', content);
console.log('Fixed syntax in RequestPanel');
