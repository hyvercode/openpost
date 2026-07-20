import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL || '';

let prismaOptions: any = {};

if (databaseUrl.startsWith('file:')) {
  const dbPath = databaseUrl.replace('file:', '');
  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  prismaOptions.adapter = adapter;
} else if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  prismaOptions.adapter = adapter;
}

export const prisma = new PrismaClient(prismaOptions);

