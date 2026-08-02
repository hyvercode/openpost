import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/openpost';

function createPrismaClient(): PrismaClient {
  if (databaseUrl.startsWith('file:') || databaseUrl.startsWith('sqlite:')) {
    const adapter = new PrismaBetterSqlite3({ url: databaseUrl.replace('sqlite:', 'file:') });
    return new PrismaClient({ adapter });
  } else if (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://')) {
    const pool = new pg.Pool({ connectionString: databaseUrl });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  } else if (databaseUrl.startsWith('mysql://') || databaseUrl.startsWith('mariadb://')) {
    const mariadbUrl = databaseUrl.replace(/^mysql:\/\//, 'mariadb://');
    const adapter = new PrismaMariaDb(mariadbUrl);
    return new PrismaClient({ adapter });
  } else {
    // MongoDB or standard connection strings without driver adapters
    return new PrismaClient();
  }
}

export const prisma = createPrismaClient();
