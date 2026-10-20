import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encField, decField, isEncrypted, __resetKeyCache } from '../src/utils/secretCrypto';

describe('secretCrypto (encryption at rest)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.ENCRYPTION_KEY;
    process.env.NODE_ENV = 'test';
    __resetKeyCache();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    __resetKeyCache();
  });

  it('round-trips a plaintext value', () => {
    const plain = JSON.stringify([{ key: 'API_TOKEN', value: 's3cr3t', isSecret: true }]);
    const enc = encField(plain);
    expect(typeof enc).toBe('string');
    expect(isEncrypted(enc)).toBe(true);
    expect(enc).not.toContain('s3cr3t');
    expect(decField(enc)).toBe(plain);
  });

  it('produces different ciphertext each call (random IV)', () => {
    const plain = 'same-value';
    expect(encField(plain)).not.toBe(encField(plain));
  });

  it('is idempotent — already-encrypted values pass through unchanged', () => {
    const once = encField('value');
    expect(encField(once)).toBe(once);
  });

  it('passes legacy plaintext through on read (lazy migration)', () => {
    const legacy = JSON.stringify([{ key: 'a', value: 'b' }]);
    expect(decField(legacy)).toBe(legacy);
    expect(decField(undefined as any)).toBe(undefined);
    expect(decField(null as any)).toBe(null);
    expect(decField('')).toBe('');
  });

  it('passes non-string values through on write', () => {
    expect(encField(undefined)).toBe(undefined);
    expect(encField(null)).toBe(null);
    expect(encField('')).toBe('');
    expect(encField(42)).toBe(42);
  });

  it('rejects tampered ciphertext', () => {
    const enc = String(encField('original'));
    const payload = Buffer.from(enc.slice('enc:v1:'.length), 'base64');
    payload[payload.length - 1] ^= 0xff;
    const tampered = 'enc:v1:' + payload.toString('base64');
    expect(() => decField(tampered)).toThrow(/failed to decrypt/);
  });

  it('fails clearly when the key changed between write and read', () => {
    const enc = String(encField('secret-data'));
    process.env.ENCRYPTION_KEY = 'a'.repeat(64);
    __resetKeyCache();
    expect(() => decField(enc)).toThrow(/ENCRYPTION_KEY/);
  });

  it('uses a 64-hex ENCRYPTION_KEY as the raw key', () => {
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    __resetKeyCache();
    const enc = String(encField('prod-secret'));
    expect(decField(enc)).toBe('prod-secret');
  });

  it('derives a stable key from a passphrase ENCRYPTION_KEY', () => {
    process.env.ENCRYPTION_KEY = 'my-passphrase';
    __resetKeyCache();
    const enc = String(encField('prod-secret'));
    process.env.ENCRYPTION_KEY = 'my-passphrase';
    __resetKeyCache();
    expect(decField(enc)).toBe('prod-secret');
  });

  it('requires ENCRYPTION_KEY in production', () => {
    process.env.NODE_ENV = 'production';
    __resetKeyCache();
    expect(() => encField('x')).toThrow(/ENCRYPTION_KEY is required/);
  });
});
