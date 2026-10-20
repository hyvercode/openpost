/**
 * Application-level encryption-at-rest for secret-bearing JSON columns.
 *
 * Why: Environment variables (tokens/passwords), collection requests
 * (Authorization headers, credential-bearing bodies), workflow variables and
 * run logs were stored in Postgres as plaintext JSON — a DB dump, leaked
 * backup or SQL-injection read exposed every secret. With encField() on the
 * write path and decField() on the read path the database only ever holds
 * `enc:v1:<base64(iv||tag||ciphertext)>` (AES-256-GCM, random IV per value).
 *
 * Format & migration notes:
 *  - `encField` is idempotent: already-encrypted values pass through, so the
 *    in-place migration script and repeated writes are safe to run any time.
 *  - `decField` passes non-prefixed (legacy plaintext) values through
 *    unchanged — no migration cut-over needed; rows migrate lazily on their
 *    next write. When ENCRYPTION_KEY changes, old ciphertext fails to decrypt
 *    with an explicit error instead of corrupting data.
 *  - The API still returns decrypted values to clients (protected by TLS) —
 *    encryption is at rest only, so the UI, workflow runner and monitors keep
 *    working unchanged.
 *
 * Key resolution:
 *  - ENCRYPTION_KEY env: 64 hex chars (raw 32-byte key) or any passphrase
 *    (SHA-256-derived). Required in production.
 *  - Development fallback: a fixed, dev-only constant key so `npm run dev`
 *    works out of the box. NEVER used when NODE_ENV=production.
 */
import crypto from 'crypto';

const PREFIX = 'enc:v1:';
const IV_LEN = 12;
const TAG_LEN = 16;

let cachedKey: Buffer | null = null;

function resolveKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = (process.env.ENCRYPTION_KEY || '').trim();
  if (raw) {
    cachedKey = /^[0-9a-fA-F]{64}$/.test(raw)
      ? Buffer.from(raw, 'hex')
      : crypto.createHash('sha256').update(raw, 'utf8').digest();
    return cachedKey;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'ENCRYPTION_KEY is required in production. Generate one with: ' +
        "node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\" " +
        'and add it to .env.production.'
    );
  }
  // Fixed dev-only key (intentionally not configurable to avoid a missing-key
  // footgun during development; deterministic so restarts can still read data).
  cachedKey = crypto.createHash('sha256').update('openpost-dev-encryption-v1', 'utf8').digest();
  return cachedKey;
}

/** Test-only: forget the cached key after mutating process.env. */
export function __resetKeyCache(): void {
  cachedKey = null;
}

export function isEncrypted(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

/**
 * Encrypt a stored value for write. Non-string/falsy input passes through.
 * Idempotent — values already in `enc:v1:` form are returned unchanged.
 */
export function encField(value: string): string;
export function encField<T>(value: T): T;
export function encField(value: unknown): unknown {
  if (typeof value !== 'string' || value.length === 0 || isEncrypted(value)) {
    return value;
  }
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-gcm', resolveKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

/**
 * Decrypt a stored value for read. Legacy plaintext (no prefix) passes
 * through unchanged. Throws a descriptive error when the key is wrong or the
 * ciphertext was tampered with — better than silently returning garbage.
 */
export function decField<T = string>(value: T): T {
  if (typeof value !== 'string' || !value.startsWith(PREFIX)) {
    return value;
  }
  const payload = Buffer.from(value.slice(PREFIX.length), 'base64');
  if (payload.length <= IV_LEN + TAG_LEN) {
    throw new Error('secretCrypto: encrypted value is malformed (truncated payload)');
  }
  const iv = payload.subarray(0, IV_LEN);
  const tag = payload.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = payload.subarray(IV_LEN + TAG_LEN);
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', resolveKey(), iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    return plaintext as unknown as T;
  } catch {
    throw new Error(
      'secretCrypto: failed to decrypt stored value — ENCRYPTION_KEY is missing or different from the key used when the data was written.'
    );
  }
}
