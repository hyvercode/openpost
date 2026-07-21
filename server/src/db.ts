import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';

let adapter: any;

if (databaseUrl.startsWith('file:') || databaseUrl.startsWith('sqlite:')) {
  adapter = new PrismaBetterSqlite3({ url: databaseUrl.replace('sqlite:', 'file:') });
} else if (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://')) {
  adapter = new PrismaPg(databaseUrl);
} else if (databaseUrl.startsWith('mysql://') || databaseUrl.startsWith('mariadb://')) {
  adapter = new PrismaMariaDb(databaseUrl);
} else {
  throw new Error(`Unsupported database URL: ${databaseUrl}`);
}

export const prisma = new PrismaClient({ adapter });
