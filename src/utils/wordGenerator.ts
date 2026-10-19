import { ApiCollection } from "../types";

export function generateCollectionWordHtml(collection: ApiCollection, selectedRequestIds?: Set<string>, docVersion?: string): string {
  const requestsToInclude = selectedRequestIds 
    ? (collection.requests || []).filter(req => selectedRequestIds.has(req.id))
    : (collection.requests || []);

  let html = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset="utf-8">
<title>${collection.name || 'API Documentation'}</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #1f2937; margin: 40px; }
  h1 { font-size: 24pt; color: #1e3a8a; border-bottom: 2pt solid #2563eb; padding-bottom: 6px; margin-bottom: 12px; }
  h2 { font-size: 16pt; color: #1e40af; margin-top: 24px; margin-bottom: 8px; border-bottom: 1pt solid #cbd5e1; padding-bottom: 4px; }
  h3 { font-size: 12pt; color: #374151; margin-top: 16px; margin-bottom: 6px; }
  p { margin: 0 0 10px 0; }
  .badge { display: inline-block; padding: 2px 6px; font-weight: bold; font-size: 9pt; border-radius: 4px; text-transform: uppercase; }
  .method-GET { background-color: #dcfce7; color: #166534; }
  .method-POST { background-color: #dbeafe; color: #1e40af; }
  .method-PUT { background-color: #fef3c7; color: #92400e; }
  .method-DELETE { background-color: #fee2e2; color: #991b1b; }
  .method-PATCH { background-color: #f3e8ff; color: #6b21a8; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 16px; }
  th, td { border: 1pt solid #cbd5e1; padding: 6px 10px; font-size: 10pt; text-align: left; }
  th { background-color: #f1f5f9; font-weight: bold; }
  pre { background-color: #f8fafc; border: 1pt solid #e2e8f0; padding: 10px; font-family: Consolas, monospace; font-size: 9.5pt; overflow-x: auto; white-space: pre-wrap; }
  .meta-box { background-color: #f8fafc; border-left: 3pt solid #2563eb; padding: 10px 14px; margin-bottom: 20px; font-size: 10pt; }
</style>
</head>
<body>
  <h1>${collection.name || 'API Documentation'}</h1>
  <div class="meta-box">
    ${docVersion ? `<p><strong>Version:</strong> ${docVersion}</p>` : ''}
    <p><strong>Generated On:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>Total Endpoints:</strong> ${requestsToInclude.length}</p>
  </div>

  ${collection.description ? `<p>${collection.description}</p>` : ''}
`;

  requestsToInclude.forEach(req => {
    const methodClass = `method-${req.method}`;
    html += `
    <h2>${req.name || 'Endpoint'}</h2>
    <p>
      <span class="badge ${methodClass}">${req.method}</span>
      <code style="font-size: 10.5pt; font-weight: bold; margin-left: 8px;">${req.url || '/'}</code>
    </p>
    ${req.description ? `<p>${req.description}</p>` : ''}
    `;

    const activeHeaders = (req.headers || []).filter(h => h.enabled && h.key);
    if (activeHeaders.length > 0) {
      html += `
      <h3>Headers</h3>
      <table>
        <thead>
          <tr><th>Key</th><th>Value</th></tr>
        </thead>
        <tbody>
      `;
      activeHeaders.forEach(h => {
        html += `<tr><td><code>${h.key}</code></td><td>${h.value || ''}</td></tr>`;
      });
      html += `</tbody></table>`;
    }

    const activeParams = (req.params || []).filter(p => p.enabled && p.key);
    if (activeParams.length > 0) {
      html += `
      <h3>Query Parameters</h3>
      <table>
        <thead>
          <tr><th>Parameter</th><th>Value</th></tr>
        </thead>
        <tbody>
      `;
      activeParams.forEach(p => {
        html += `<tr><td><code>${p.key}</code></td><td>${p.value || ''}</td></tr>`;
      });
      html += `</tbody></table>`;
    }

    if (req.body && req.body.type !== 'none' && req.body.content) {
      html += `<h3>Request Body (${req.body.type})</h3><pre>`;
      try {
        const formatted = JSON.stringify(JSON.parse(req.body.content), null, 2);
        html += formatted;
      } catch {
        html += req.body.content;
      }
      html += `</pre>`;
    }

    if (req.mockResponse && req.mockResponse.body) {
      html += `<h3>Sample Response (${req.mockResponse.status || 200})</h3><pre>`;
      try {
        const formatted = JSON.stringify(JSON.parse(req.mockResponse.body), null, 2);
        html += formatted;
      } catch {
        html += req.mockResponse.body;
      }
      html += `</pre>`;
    }
  });

  html += `
</body>
</html>`;

  return html;
}

export function downloadWordDocument(collection: ApiCollection, selectedRequestIds?: Set<string>, docVersion?: string): void {
  const htmlContent = generateCollectionWordHtml(collection, selectedRequestIds, docVersion);
  const blob = new Blob(['\ufeff', htmlContent], {
    type: 'application/msword'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileName = `${(collection.name || 'collection').toLowerCase().replace(/\s+/g, '-')}-docs.doc`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
