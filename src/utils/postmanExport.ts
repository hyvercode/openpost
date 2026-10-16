import { v4 as uuidv4 } from 'uuid';
import { ApiCollection, RequestItem } from '../types';

const COLLECTION_SCHEMA =
  'https://schema.getpostman.com/json/collection/v2.1.0/collection.json';

/**
 * Canonical Postman Collection v2.1 export.
 *
 * Previous output was rejected by newer Postman importers: request items
 * lacked the mandatory `response: []` slot and `info._postman_id`,
 * non-standard methods (GQL/WS/SSE/GRPC) were emitted verbatim, embedded
 * URL query strings were dropped from the structured `query` table, auth
 * types beyond bearer/basic/apikey were silently lost, and pre-request /
 * test scripts were discarded.
 */
export function exportToPostman(collections: ApiCollection[]): any {
  return {
    info: {
      _postman_id: uuidv4(),
      name: 'OpenPost Export',
      schema: COLLECTION_SCHEMA,
    },
    item: collections.map((collection) => ({
      name: collection.name || 'Untitled Collection',
      ...(collection.description ? { description: collection.description } : {}),
      item: (collection.requests || []).map(mapRequestToPostmanItem),
    })),
  };
}

/** Single-collection variant (used by the version-snapshot export). */
export function exportSingleCollectionToPostman(
  collection: ApiCollection,
  name?: string,
  description?: string
): any {
  return {
    info: {
      _postman_id: uuidv4(),
      name: name || collection.name || 'Untitled Collection',
      ...(description ? { description } : {}),
      schema: COLLECTION_SCHEMA,
    },
    item: (collection.requests || []).map(mapRequestToPostmanItem),
  };
}

/** Postman only understands standard HTTP methods — map ours onto them. */
function mapMethod(method: string): { method: string; original?: string } {
  const upper = (method || 'GET').toUpperCase();
  switch (upper) {
    case 'GQL':
      return { method: 'POST', original: 'GQL' };
    case 'WS':
      return { method: 'GET', original: 'WS' };
    case 'SSE':
      return { method: 'GET', original: 'SSE' };
    case 'GRPC':
      return { method: 'POST', original: 'GRPC' };
    default:
      return { method: upper };
  }
}

interface QueryPair {
  key: string;
  value: string;
  disabled?: boolean;
}

function parseEmbeddedQuery(url: string): QueryPair[] {
  const qIndex = url.indexOf('?');
  if (qIndex === -1) return [];
  const hashIndex = url.indexOf('#', qIndex);
  const qs = hashIndex === -1 ? url.slice(qIndex + 1) : url.slice(qIndex + 1, hashIndex);
  if (!qs) return [];
  return qs
    .split('&')
    .filter((part) => part.length > 0)
    .map((part) => {
      const eq = part.indexOf('=');
      if (eq === -1) return { key: part, value: '' };
      return { key: part.slice(0, eq), value: part.slice(eq + 1) };
    });
}

function buildUrl(rawUrl: string, params?: RequestItem['params']): any {
  const raw = rawUrl || '';
  // Strip fragment + query for structural parsing; raw stays untouched.
  const withoutFragment = raw.split('#')[0];
  const withoutQuery = withoutFragment.split('?')[0];

  let protocol: string | undefined;
  let authorityAndPath = withoutQuery;
  const protocolMatch = withoutQuery.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/(.*)$/);
  if (protocolMatch) {
    protocol = protocolMatch[1].toLowerCase();
    authorityAndPath = protocolMatch[2];
  }

  let hostPart = authorityAndPath;
  let pathPart = '';
  const slashIndex = authorityAndPath.indexOf('/');
  if (slashIndex !== -1) {
    hostPart = authorityAndPath.slice(0, slashIndex);
    pathPart = authorityAndPath.slice(slashIndex + 1);
  }

  let host: string[] = [];
  let port: string | undefined;
  if (hostPart) {
    const portIndex = hostPart.lastIndexOf(':');
    // A single colon with a numeric suffix is host:port (but not {{var}}).
    if (portIndex !== -1 && /^\d+$/.test(hostPart.slice(portIndex + 1))) {
      port = hostPart.slice(portIndex + 1);
      hostPart = hostPart.slice(0, portIndex);
    }
    // Postman splits domain hosts on '.'; keep {{variables}} whole.
    host = hostPart.includes('{{') && hostPart.includes('}}') ? [hostPart] : hostPart.split('.');
  }

  const path = pathPart ? pathPart.split('/').filter((seg) => seg.length > 0) : [];

  const query: QueryPair[] = [
    ...parseEmbeddedQuery(raw),
    ...(params || [])
      .filter((p) => p.key)
      .map((p) => ({
        key: p.key,
        value: p.value ?? '',
        ...(p.enabled === false ? { disabled: true } : {}),
      })),
  ];

  const urlObj: any = { raw, host, path, query };
  if (protocol) urlObj.protocol = protocol;
  if (port) urlObj.port = port;
  return urlObj;
}

function buildHeaders(headers?: RequestItem['headers']): any[] {
  return (headers || [])
    .filter((h) => h.key)
    .map((h) => ({
      key: h.key,
      value: h.value ?? '',
      type: 'text',
      ...(h.enabled === false ? { disabled: true } : {}),
    }));
}

function looksLikeJson(content: string): boolean {
  const trimmed = (content || '').trim();
  return (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  );
}

function buildBody(req: RequestItem): any | undefined {
  const type = req.body?.type || 'none';
  if (type === 'none') return undefined;

  if (type === 'raw' || type === 'protobuf') {
    const raw = req.body?.content ?? '';
    const body: any = { mode: 'raw', raw };
    if (looksLikeJson(raw)) {
      body.options = { raw: { language: 'json' } };
    }
    return body;
  }
  if (type === 'form-data') {
    return {
      mode: 'formdata',
      formdata: (req.body?.formData || [])
        .filter((f) => f.key)
        .map((f) => ({
          key: f.key,
          value: f.value ?? '',
          type: 'text',
          ...(f.enabled === false ? { disabled: true } : {}),
        })),
    };
  }
  if (type === 'x-www-form-urlencoded') {
    return {
      mode: 'urlencoded',
      urlencoded: (req.body?.formData || [])
        .filter((f) => f.key)
        .map((f) => ({
          key: f.key,
          value: f.value ?? '',
          type: 'text',
          ...(f.enabled === false ? { disabled: true } : {}),
        })),
    };
  }
  if (type === 'graphql') {
    const graphql: any = { query: req.body?.content ?? '' };
    if (req.body?.variables) graphql.variables = req.body.variables;
    return { mode: 'graphql', graphql };
  }
  return undefined;
}

function buildAuth(req: RequestItem): any | undefined {
  const auth = req.auth;
  if (!auth || auth.type === 'none') return undefined;

  switch (auth.type) {
    case 'bearer':
      return {
        type: 'bearer',
        bearer: [{ key: 'token', value: auth.bearer?.token || '', type: 'string' }],
      };
    case 'basic':
      return {
        type: 'basic',
        basic: [
          { key: 'username', value: auth.basic?.username || '', type: 'string' },
          { key: 'password', value: auth.basic?.password || '', type: 'string' },
        ],
      };
    case 'apikey':
      return {
        type: 'apikey',
        apikey: [
          { key: 'key', value: auth.apikey?.key || '', type: 'string' },
          { key: 'value', value: auth.apikey?.value || '', type: 'string' },
          { key: 'in', value: auth.apikey?.addTo || 'header', type: 'string' },
        ],
      };
    case 'oauth2': {
      const o = auth.oauth2;
      return {
        type: 'oauth2',
        oauth2: [
          { key: 'grant_type', value: o?.grantType || 'authorization_code', type: 'string' },
          ...(o?.authUrl ? [{ key: 'authUrl', value: o.authUrl, type: 'string' }] : []),
          ...(o?.accessTokenUrl
            ? [{ key: 'accessTokenUrl', value: o.accessTokenUrl, type: 'string' }]
            : []),
          ...(o?.clientId ? [{ key: 'clientId', value: o.clientId, type: 'string' }] : []),
          ...(o?.scope ? [{ key: 'scope', value: o.scope, type: 'string' }] : []),
          ...(o?.accessToken ? [{ key: 'accessToken', value: o.accessToken, type: 'string' }] : []),
          { key: 'addTokenTo', value: 'header', type: 'string' },
        ],
      };
    }
    case 'awsv4': {
      const a = auth.awsv4;
      return {
        type: 'awsv4',
        awsv4: [
          { key: 'accessKey', value: a?.accessKey || '', type: 'string' },
          { key: 'secretKey', value: a?.secretKey || '', type: 'string' },
          { key: 'region', value: a?.region || '', type: 'string' },
          { key: 'service', value: a?.service || '', type: 'string' },
          ...(a?.sessionToken
            ? [{ key: 'sessionToken', value: a.sessionToken, type: 'string' }]
            : []),
        ],
      };
    }
    case 'digest':
      return {
        type: 'digest',
        digest: [
          { key: 'username', value: auth.digest?.username || '', type: 'string' },
          { key: 'password', value: auth.digest?.password || '', type: 'string' },
          { key: 'algorithm', value: auth.digest?.algorithm || 'MD5', type: 'string' },
        ],
      };
    case 'hawk': {
      const h = auth.hawk;
      return {
        type: 'hawk',
        hawk: [
          { key: 'authId', value: h?.authId || '', type: 'string' },
          { key: 'authKey', value: h?.authKey || '', type: 'string' },
          { key: 'algorithm', value: h?.algorithm || 'sha256', type: 'string' },
        ],
      };
    }
    default:
      return undefined;
  }
}

function toExecLines(script: string | undefined): string[] | null {
  if (!script || !script.trim()) return null;
  return script.replace(/\r\n/g, '\n').split('\n');
}

export function mapRequestToPostmanItem(req: RequestItem): any {
  const { method, original } = mapMethod(req.method);
  const body = buildBody(req);
  const auth = buildAuth(req);

  const request: any = {
    method,
    header: buildHeaders(req.headers),
    url: buildUrl(req.url, req.params),
  };
  if (body) request.body = body;
  if (auth) request.auth = auth;
  if (req.description) request.description = req.description;
  else if (original) request.description = `Original OpenPost method: ${original}`;

  const item: any = {
    name: req.name || 'Untitled Request',
    request,
    // Mandatory slot in the v2.1 schema — its absence makes newer
    // Postman versions reject the whole file on import.
    response: [],
  };

  const events: any[] = [];
  const preLines = toExecLines(req.preRequestScript);
  if (preLines) {
    events.push({
      listen: 'prerequest',
      script: { type: 'text/javascript', exec: preLines },
    });
  }
  const testLines = toExecLines(req.postResponseScript);
  if (testLines) {
    events.push({
      listen: 'test',
      script: { type: 'text/javascript', exec: testLines },
    });
  }
  if (events.length > 0) item.event = events;

  return item;
}
