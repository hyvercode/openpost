import fs from 'fs';
let content = fs.readFileSync('prisma/schema.prisma', 'utf8');
content = content.replace('engineType = "library"', '');
fs.writeFileSync('prisma/schema.prisma', content);
