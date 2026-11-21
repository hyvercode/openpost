/**
 * HTML preview helpers for the response panel (pure functions, no React).
 * Tested via tsx smoke probes; see getPreviewHtmlSource / withBaseTag.
 */

function getPreviewContentType(response: any): string {
  const headers = response?.headers || {};
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === 'content-type') {
      return String(headers[key] || '').toLowerCase();
    }
  }
  return '';
}

export function decodeBase64Text(base64: string): string | null {
  try {
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

const TEXTUAL_PREVIEW_CT = ['text/', 'application/xhtml+xml', 'application/xml', 'text/xml', '+xml'];

export function isTextualPreviewCt(ct: string): boolean {
  return TEXTUAL_PREVIEW_CT.some((s) => ct.includes(s));
}

/**
 * HTML source for the preview iframe, or null when the response is not
 * previewable HTML. Covers the edge paths where HTML arrives base64-encoded
 * (which getBinaryKind() reports as generic 'binary'): textual content-types
 * are decoded back to text instead of landing on the Binary card.
 */
export function getPreviewHtmlSource(response: any): string | null {
  if (typeof response?.data !== 'string') return null;
  const ct = getPreviewContentType(response);
  let text: string;
  if (response.isBase64) {
    if (!isTextualPreviewCt(ct)) return null;
    const decoded = decodeBase64Text(response.data);
    if (decoded === null) return null;
    text = decoded;
  } else {
    text = response.data;
  }
  const trimmed = text.trim();
  if (!trimmed.startsWith('<') || trimmed.startsWith('<?xml')) return null;
  if (ct.includes('xml') && !ct.includes('html') && !ct.includes('xhtml')) return null;
  return text;
}

/**
 * srcdoc iframes resolve relative URLs against the app document, so styles,
 * images and links of a rendered page break. Inject <base> from the request
 * URL so relative assets resolve against the target site.
 */
export function withBaseTag(html: string, baseUrl?: string): string {
  if (!baseUrl) return html;
  try {
    const u = new URL(baseUrl.startsWith('http') ? baseUrl : `http://${baseUrl}`);
    const dir = u.pathname.replace(/[^/]*$/, '');
    const tag = `<base href="${u.origin}${dir}">`;
    if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => `${m}${tag}`);
    if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (m) => `${m}<head>${tag}</head>`);
    return `<head>${tag}</head>${html}`;
  } catch {
    return html;
  }
}
