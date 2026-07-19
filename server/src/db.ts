import { PrismaClient } from '@prisma/client';
import Database from 'better-sqlite3';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const connectionString = "dev.db";
const sqlite = new Database(connectionString);
const adapter = new PrismaBetterSqlite3(sqlite);

export const prisma = new PrismaClient({ adapter });
