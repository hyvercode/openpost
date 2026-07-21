import fs from 'fs';
import path from 'path';
import 'dotenv/config';

let provider = process.env.DB_PROVIDER;

if (!provider) {
  const url = process.env.DATABASE_URL || '';
  if (url.startsWith('postgres') || url.startsWith('postgresql')) {
    provider = 'postgresql';
  } else if (url.startsWith('mysql')) {
    provider = 'mysql';
  } else if (url.startsWith('mongodb')) {
    provider = 'mongodb';
  } else if (url.startsWith('sqlserver')) {
    provider = 'sqlserver';
  } else {
    provider = 'sqlite';
  }
}

console.log(`Setting up Prisma for provider: ${provider}`);

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
