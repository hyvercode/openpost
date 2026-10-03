import DOMPurify from 'dompurify';

/**
 * Centralized HTML sanitizer for all dangerouslySetInnerHTML usages.
 * Code highlighters and markdown renderers produce HTML strings that may
 * embed untrusted content (API response bodies, schema names, placeholders).
 * Everything rendered as HTML must pass through here.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    // Highlight output only needs spans; strip everything executable.
    ALLOWED_TAGS: ['span', 'br', 'code', 'pre'],
    ALLOWED_ATTR: ['class', 'style'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'a', 'img'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'href', 'src', 'xlink:href'],
    ALLOW_DATA_ATTR: false,
  });
}
