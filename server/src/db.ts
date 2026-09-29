import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import BetterSqlite3 from 'better-sqlite3';

function resolveDatabaseUrl(): string {
  return process.env.DATABASE_URL || 'file:./dev.db';
}

function isSqliteUrl(url: string): boolean {
  return url.startsWith('file:') || url.startsWith('sqlite:');
}

// Resolve the SQLite file path from a file: URL so we can guarantee the
// parent directory exists before better-sqlite3 tries to open it.
function sqliteFilePath(url: string): string | null {
  try {
    const withoutScheme = url.replace(/^sqlite:/, '').replace(/^file:/, '');
    // Strip query params (e.g. ?connection_limit=1)
    const clean = withoutScheme.split('?')[0];
    if (!clean || clean === ':memory:') return null;
    return path.isAbsolute(clean) ? clean : path.join(process.cwd(), clean);
  } catch {
    return null;
  }
}

// Create tables on first run for the embedded desktop SQLite database.
// The packaged app ships with a generated Prisma Client but no migration
// engine (prisma CLI is dev-only), so we apply a checked-in SQL schema
// directly via better-sqlite3. Server-managed DBs (postgres/mysql/mongo)
// are left untouched — those are migrated via `prisma db push` in Docker/CI.
function ensureDesktopSqliteSchema(url: string): void {
  const dbFile = sqliteFilePath(url);
  if (!dbFile) return;
  try {
    const dir = path.dirname(dbFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Skip if tables already exist.
    let needsInit = true;
    if (fs.existsSync(dbFile)) {
      try {
        const probe = new BetterSqlite3(dbFile, { readonly: true });
        const row = probe.prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='User'"
        ).get();
        probe.close();
        needsInit = !row;
      } catch {
        needsInit = true;
      }
    }
    if (!needsInit) return;

    // Locate the bundled schema SQL: dev path, dist-adjacent path, or
    // electron-builder extraResources path.
    const here = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
    const candidates = [
      path.join(process.cwd(), 'prisma', 'sqlite-schema.sql'),
      path.join(here, '..', '..', 'prisma', 'sqlite-schema.sql'),
      path.join((process as any).resourcesPath || '', 'prisma', 'sqlite-schema.sql'),
    ];
    const schemaFile = candidates.find((c) => c && fs.existsSync(c));
    if (!schemaFile) {
      console.warn('[db] sqlite-schema.sql not found, skipping desktop DB init');
      return;
    }
    const sql = fs.readFileSync(schemaFile, 'utf8');
    const db = new BetterSqlite3(dbFile);
    db.exec(sql);
    db.close();
    console.log(`[db] initialized desktop SQLite database at ${dbFile}`);
  } catch (err: any) {
    console.error('[db] failed to initialize desktop SQLite database:', err?.message || err);
  }
}

function createPrismaClient(): PrismaClient {
  const databaseUrl = resolveDatabaseUrl();
  if (isSqliteUrl(databaseUrl)) {
    ensureDesktopSqliteSchema(databaseUrl);
    const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
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

// Lazy singleton: importing this module must NEVER throw (e.g. when the
// generated client was built for a different provider than the runtime
// DATABASE_URL). The real client is created on first property access, and
// a failed init must not crash unrelated endpoints like /api/health or /.
let cached: PrismaClient | null = null;

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    if (cached === null) {
      cached = createPrismaClient();
    }
    const value = Reflect.get(cached as object, prop, receiver);
    return typeof value === 'function' ? value.bind(cached) : value;
  },
});
