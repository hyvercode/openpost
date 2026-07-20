import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const databaseUrl = process.env.DATABASE_URL || '';

let prismaOptions: any = {};

if (databaseUrl.startsWith('file:')) {
  const dbPath = databaseUrl.replace('file:', '');
  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  prismaOptions.adapter = adapter;
}

export const prisma = new PrismaClient(prismaOptions);

