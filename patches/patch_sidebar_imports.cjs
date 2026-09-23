const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

code = code.replace("FileCode } from 'lucide-react';", "FileCode, Cloud } from 'lucide-react';");

fs.writeFileSync('src/components/Sidebar.tsx', code);
