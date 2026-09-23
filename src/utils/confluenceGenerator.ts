import { ApiCollection } from "../types";

export function generateCollectionConfluenceMarkup(
  collection: ApiCollection, 
  selectedRequestIds?: Set<string>, 
  docVersion?: string
): string {
  const requestsToInclude = selectedRequestIds 
    ? (collection.requests || []).filter(req => selectedRequestIds.has(req.id))
    : (collection.requests || []);

  let markup = `h1. ${collection.name || 'API Documentation'}\n\n`;

  if (docVersion) {
    markup += `*Version:* {{${docVersion}}} | *Updated:* ${new Date().toLocaleDateString()}\n\n`;
  }

  if (collection.description) {
    markup += `{quote}\n${collection.description}\n{quote}\n\n`;
  }

  markup += `----\n\n`;

  requestsToInclude.forEach(req => {
    markup += `h2. ${req.name || 'Endpoint'}\n\n`;
    markup += `* *Method:* {{${req.method}}}\n`;
    markup += `* *URL:* {{${req.url || '/'}}}\n`;
    if (req.description) {
      markup += `* *Description:* ${req.description}\n`;
    }
    markup += `\n`;

    const activeHeaders = (req.headers || []).filter(h => h.enabled && h.key);
    if (activeHeaders.length > 0) {
      markup += `h3. Headers\n`;
      markup += `||Header Key||Header Value||\n`;
      activeHeaders.forEach(h => {
        markup += `|{{${h.key}}}|${h.value || '-'}\n`;
      });
      markup += `\n`;
    }

    const activeParams = (req.params || []).filter(p => p.enabled && p.key);
    if (activeParams.length > 0) {
      markup += `h3. Query Parameters\n`;
      markup += `||Parameter||Value||\n`;
      activeParams.forEach(p => {
        markup += `|{{${p.key}}}|${p.value || '-'}\n`;
      });
      markup += `\n`;
    }

    if (req.body && req.body.type !== 'none' && req.body.content) {
      markup += `h3. Request Body (${req.body.type})\n`;
      markup += `{code:language=json|title=Request Payload}\n`;
      try {
        const formatted = JSON.stringify(JSON.parse(req.body.content), null, 2);
        markup += formatted;
      } catch {
        markup += req.body.content;
      }
      markup += `\n{code}\n\n`;
    }

    if (req.mockResponse && req.mockResponse.body) {
      markup += `h3. Sample Response (${req.mockResponse.status || 200})\n`;
      markup += `{code:language=json|title=Sample Response Payload}\n`;
      try {
        const formatted = JSON.stringify(JSON.parse(req.mockResponse.body), null, 2);
        markup += formatted;
      } catch {
        markup += req.mockResponse.body;
      }
      markup += `\n{code}\n\n`;
    }

    markup += `----\n\n`;
  });

  return markup;
}
