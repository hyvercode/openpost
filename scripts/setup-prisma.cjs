const fs = require('fs');
const path = require('path');
// Mirror server/src/env.ts: production builds always read .env.production,
// development reads .env. Real environment variables always win.
(function loadEnv() {
  const filename = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
  const roots = [process.cwd()];
  if (process.env.OPENPOST_APP_ROOT) roots.push(process.env.OPENPOST_APP_ROOT);
  for (const root of roots) {
    const file = path.join(root, filename);
    if (fs.existsSync(file)) {
      require('dotenv').config({ path: file, override: false });
      return;
    }
  }
})();

const argv = process.argv.slice(2);
// Allow forcing a provider from CLI (used by desktop packaging which must
// bundle a SQLite client regardless of the dev DATABASE_URL):
//   node scripts/setup-prisma.cjs --sqlite
//   node scripts/setup-prisma.cjs --provider=postgresql
let cliProvider = null;
for (const arg of argv) {
  if (arg === '--sqlite') cliProvider = 'sqlite';
  else if (arg.startsWith('--provider=')) cliProvider = arg.split('=')[1];
}

let url = process.env.DATABASE_URL || '';
let provider = cliProvider || process.env.DB_PROVIDER;

// CLI --sqlite / --provider=* always wins (desktop packaging must bundle a
// SQLite client regardless of the dev DATABASE_URL in .env).
if (!cliProvider) {
  // Prioritize protocol detection from DATABASE_URL if DATABASE_URL is provided
  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
    provider = 'postgresql';
  } else if (url.startsWith('mysql://') || url.startsWith('mariadb://')) {
    provider = 'mysql';
  } else if (url.startsWith('mongodb://') || url.startsWith('mongodb+srv://')) {
    provider = 'mongodb';
  } else if (url.startsWith('file:') || url.startsWith('sqlite:')) {
    provider = 'sqlite';
  } else if (!provider) {
    provider = 'sqlite';
  }
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
