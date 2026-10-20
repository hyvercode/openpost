import { describe, it, expect } from 'vitest';
import { isTextualContentType, decodeUpstreamBody } from '../src/utils/responseDecode';

describe('isTextualContentType', () => {
  it('recognizes textual types', () => {
    expect(isTextualContentType('text/html; charset=utf-8')).toBe(true);
    expect(isTextualContentType('application/json')).toBe(true);
    expect(isTextualContentType('application/ld+json')).toBe(true);
    expect(isTextualContentType('application/hal+json')).toBe(true);
    expect(isTextualContentType('application/xml')).toBe(true);
    expect(isTextualContentType('image/svg+xml')).toBe(true);
    expect(isTextualContentType('application/grpc-web+proto')).toBe(false);
  });

  it('rejects binary types', () => {
    expect(isTextualContentType('image/png')).toBe(false);
    expect(isTextualContentType('application/pdf')).toBe(false);
    expect(isTextualContentType('application/octet-stream')).toBe(false);
    expect(isTextualContentType('application/grpc')).toBe(false);
    expect(isTextualContentType(undefined)).toBe(false);
    expect(isTextualContentType('')).toBe(false);
  });
});

describe('decodeUpstreamBody', () => {
  it('parses JSON content-types into objects', () => {
    const buf = Buffer.from('{"hello":"world","n":1}');
    const out = decodeUpstreamBody(buf, 'application/json; charset=utf-8');
    expect(out.isBase64).toBe(false);
    expect(out.data).toEqual({ hello: 'world', n: 1 });
  });

  it('returns malformed JSON as raw text instead of throwing', () => {
    const buf = Buffer.from('{"hello": world}');
    const out = decodeUpstreamBody(buf, 'application/json');
    expect(out.isBase64).toBe(false);
    expect(out.data).toBe('{"hello": world}');
  });

  it('base64-encodes binary content-types', () => {
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const out = decodeUpstreamBody(bytes, 'image/png');
    expect(out.isBase64).toBe(true);
    expect(out.data).toBe(bytes.toString('base64'));
  });

  it('base64-encodes PDF payloads', () => {
    const bytes = Buffer.from('%PDF-1.7 fake pdf bytes');
    const out = decodeUpstreamBody(bytes, 'application/pdf');
    expect(out.isBase64).toBe(true);
    expect(out.data).toBe(bytes.toString('base64'));
  });

  it('decodes UTF-8 text when content-type is missing', () => {
    const buf = Buffer.from('plain text ✓ with unicode', 'utf-8');
    const out = decodeUpstreamBody(buf, undefined);
    expect(out.isBase64).toBe(false);
    expect(out.data).toBe('plain text ✓ with unicode');
  });

  it('base64-encodes invalid UTF-8 bytes when content-type is missing', () => {
    const buf = Buffer.from([0xff, 0xfe, 0x00, 0x80, 0xc3, 0x28]);
    const out = decodeUpstreamBody(buf, undefined);
    expect(out.isBase64).toBe(true);
    expect(out.data).toBe(buf.toString('base64'));
  });

  it('keeps HTML as text', () => {
    const buf = Buffer.from('<!DOCTYPE html><html><body>hi</body></html>');
    const out = decodeUpstreamBody(buf, 'text/html; charset=utf-8');
    expect(out.isBase64).toBe(false);
    expect(out.data).toBe('<!DOCTYPE html><html><body>hi</body></html>');
  });

  it('base64-encodes gRPC responses', () => {
    const bytes = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x02, 0x10, 0x01]);
    const out = decodeUpstreamBody(bytes, 'application/grpc');
    expect(out.isBase64).toBe(true);
    expect(out.data).toBe(bytes.toString('base64'));
  });

  it('returns empty string for empty buffers', () => {
    expect(decodeUpstreamBody(Buffer.alloc(0), 'image/png')).toEqual({
      data: '',
      isBase64: false,
    });
  });
});
