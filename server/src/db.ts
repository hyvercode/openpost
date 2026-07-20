import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';

// Force SQLite for this project as per the schema provider
const databaseUrl = 'file:./dev.db';

const dbPath = databaseUrl.replace('file:', '');
const adapter = new PrismaBetterSqlite3({ url: dbPath });

export const prisma = new PrismaClient({ adapter });

