/**
 * Upstream response body decoding for the /proxy endpoint.
 *
 * The proxy always fetches with responseType 'arraybuffer' so binary payloads
 * (images, PDFs, protobuf, wasm, ...) survive the trip byte-for-byte. Text
 * content-types are decoded back to UTF-8 strings (JSON is parsed to objects
 * for a nicer client tree); everything else is sent as base64 with
 * isBase64: true so the frontend can render images/PDFs via data: URLs.
 */

const TEXTUAL_CT = [
  'text/',
  'application/json',
  'application/ld+json',
  'application/graphql',
  'application/x-www-form-urlencoded',
  'application/javascript',
  'application/x-javascript',
  'application/ecmascript',
  'application/xml',
  'application/xhtml+xml',
  'application/manifest+json',
  'application/problem+json',
  'application/hal+json',
  'image/svg+xml',
];

export function isTextualContentType(raw: string | undefined | null): boolean {
  const ct = String(raw || '').toLowerCase();
  if (!ct) return false;
  if (TEXTUAL_CT.some((p) => ct.includes(p))) return true;
  // Structured suffixes: application/*+json, application/*+xml, ...
  return /\+[a-z0-9-]+\s*(;|$)/.test(ct) && (ct.includes('+json') || ct.includes('+xml'));
}

function utf8DecodeStrict(buf: Buffer): string | null {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return null;
  }
}

export interface DecodedBody {
  data: string | Record<string, unknown> | unknown[];
  isBase64: boolean;
}

export function decodeUpstreamBody(
  buf: Buffer,
  contentType: string | undefined
): DecodedBody {
  if (!buf || buf.length === 0) {
    return { data: '', isBase64: false };
  }

  // No content-type header: trust the bytes — strict UTF-8 decode decides.
  if (!contentType) {
    const text = utf8DecodeStrict(buf);
    if (text === null) return { data: buf.toString('base64'), isBase64: true };
    return { data: tryJsonParse(text) ?? text, isBase64: false };
  }

  if (!isTextualContentType(contentType)) {
    return { data: buf.toString('base64'), isBase64: true };
  }

  const text = buf.toString('utf8');
  if (contentType.toLowerCase().includes('json')) {
    // Malformed JSON with a json content-type must NOT fail the whole proxy
    // call (the old axios 'json' responseType threw here) — return raw text.
    const parsed = tryJsonParse(text);
    if (parsed !== undefined) return { data: parsed, isBase64: false };
  }
  return { data: text, isBase64: false };
}

function tryJsonParse(text: string): Record<string, unknown> | unknown[] | undefined {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return undefined;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') return parsed;
    return undefined;
  } catch {
    return undefined;
  }
}
