const fs = require('fs');
const path = require('path');
require('dotenv/config');

let url = process.env.DATABASE_URL || '';
let provider = process.env.DB_PROVIDER;

// Prioritize protocol detection from DATABASE_URL if DATABASE_URL is provided
if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
  provider = 'postgresql';
} else if (url.startsWith('mysql://') || url.startsWith('mariadb://')) {
  provider = 'mysql';
} else if (url.startsWith('mongodb://') || url.startsWith('mongodb+srv://')) {
  provider = 'mongodb';
} else if (url.startsWith('file:') || url.startsWith('sqlite:')) {
  provider = 'postgresql';
} else if (!provider) {
  provider = 'postgresql';
}

console.log(`Setting up Prisma for provider: ${provider} (DATABASE_URL protocol: ${url.split(':')[0] || 'none'})`);

const templatePath = path.join(process.cwd(), 'prisma', 'schema.template.prisma');
const outPath = path.join(process.cwd(), 'prisma', 'schema.prisma');

if (!fs.existsSync(templatePath)) {
  console.error(`Template not found at ${templatePath}`);
  process.exit(1);
}

let schema = fs.readFileSync(templatePath, 'utf8');

schema = schema.replace(/@@PROVIDER@@/g, provider);

if (provider === 'mongodb') {
  schema = schema.replace(/@@ID@@/g, 'String @id @default(auto()) @map("_id") @db.ObjectId');
  schema = schema.replace(/@@FOREIGN_KEY@@/g, 'String @db.ObjectId');
} else {
  schema = schema.replace(/@@ID@@/g, 'String @id @default(uuid())');
  schema = schema.replace(/@@FOREIGN_KEY@@/g, 'String');
}

fs.writeFileSync(outPath, schema);
console.log(`Successfully generated prisma/schema.prisma for ${provider}`);
