import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

/**
 * Single environment-file loader for the whole project.
 *
 * - NODE_ENV=production  -> `.env.production` (always, for every build/run)
 * - anything else         -> `.env` (local development)
 *
 * Real process environment variables ALWAYS win (override: false), so Docker
 * secrets, CI variables, and shell exports keep working and are never
 * clobbered by file values. Missing files are silently ignored (e.g. Docker
 * builder context excludes *.env via .dockerignore).
 *
 * Import this module FIRST (before config/routes) wherever env is needed:
 * server.ts, server/src/config.ts, prisma.config.ts, scripts/setup-prisma.cjs.
 */
function candidateRoots(): string[] {
  const roots: string[] = [process.cwd()];
  // Bundled server runs as dist/server.cjs -> project root is one level up.
  try {
    const script = process.argv[1] ? path.resolve(process.argv[1]) : '';
    if (script) {
      if (path.basename(path.dirname(script)) === 'dist') {
        roots.push(path.dirname(path.dirname(script)));
      }
      roots.push(path.dirname(script));
    }
  } catch {
    /* ignore */
  }
  if (process.env.OPENPOST_APP_ROOT) roots.push(process.env.OPENPOST_APP_ROOT);
  return [...new Set(roots.filter(Boolean))];
}

export function loadEnv(): string | null {
  const production = process.env.NODE_ENV === 'production';
  const filename = production ? '.env.production' : '.env';
  for (const root of candidateRoots()) {
    const file = path.join(root, filename);
    try {
      if (fs.existsSync(file)) {
        dotenv.config({ path: file, override: false });
        return file;
      }
    } catch {
      /* try next root */
    }
  }
  return null;
}

// Side-effect import: `import './env'` / `import '../server/src/env'` loads it.
loadEnv();
