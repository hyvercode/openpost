import './env';

// Centralized security-sensitive configuration with fail-fast validation.
// Import this module FIRST in server.ts (before any route/middleware import)
// so misconfiguration crashes the process at boot, not at first request.
function required(name: string, opts?: { minLength?: number }): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `[config] FATAL: environment variable ${name} is required in production. ` +
        `Set it via env / secret manager. Refusing to start.`
      );
    }
    console.warn(`[config] WARNING: ${name} is not set — using insecure development fallback. Never deploy like this.`);
    return `dev-insecure-${name.toLowerCase()}-do-not-use-in-production`;
  }
  if (opts?.minLength && value.length < opts.minLength) {
    throw new Error(
      `[config] FATAL: ${name} must be at least ${opts.minLength} characters long. Refusing to start.`
    );
  }
  return value;
}

export const JWT_SECRET = required('JWT_SECRET', { minLength: 32 });

// Short-lived access token lifetime. Kept as a constant so auth middleware
// and login stay consistent.
export const JWT_EXPIRES_IN = '2h';
