import fs from 'fs';
let content = fs.readFileSync('prisma/schema.prisma', 'utf8');
content = content.replace('provider = "prisma-client-js"', 'provider = "prisma-client-js"\n  engineType = "library"');
fs.writeFileSync('prisma/schema.prisma', content);
