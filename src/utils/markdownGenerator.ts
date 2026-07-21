import { ApiCollection } from "../types";

export function generateCollectionMarkdown(collection: ApiCollection, selectedRequestIds?: Set<string>, docVersion?: string): string {
  let md = `# ${collection.name}\n\n`;
  
  if (docVersion) {
    md += `**Version:** \`${docVersion}\`  \n`;
    md += `**Date:** ${new Date().toLocaleDateString()}  \n\n`;
  }
  
  if (collection.description) {
    md += `${collection.description}\n\n`;
  }

  md += `--- \n\n`;

  const requestsToInclude = selectedRequestIds 
    ? collection.requests.filter(req => selectedRequestIds.has(req.id))
    : collection.requests;

  requestsToInclude.forEach(req => {
    md += `## ${req.name}\n\n`;
    md += `**Endpoint:** \`${req.method}\` \`${req.url}\`  \n`;
    
    md += `\n`;

    // Headers
    const activeHeaders = req.headers.filter(h => h.enabled && h.key);
    if (activeHeaders.length > 0) {
      md += `### Headers\n\n`;
      md += `| Key | Value |\n`;
      md += `| :--- | :--- |\n`;
      activeHeaders.forEach(h => {
        md += `| ${h.key} | ${h.value} |\n`;
      });
      md += `\n`;
    }

    // Body
    if (req.body && req.body.type !== 'none' && req.body.content) {
      md += `### Request Body (${req.body.type})\n\n`;
      md += `\`\`\`json\n`;
      try {
        const formatted = JSON.stringify(JSON.parse(req.body.content), null, 2);
        md += formatted;
      } catch (e) {
        md += req.body.content;
      }
      md += `\n\`\`\`\n\n`;
    }

    // Mock Response
    if (req.mockResponse && req.mockResponse.body) {
      md += `### Example Response (\`${req.mockResponse.status}\`)\n\n`;
      md += `\`\`\`json\n`;
      try {
        const formatted = JSON.stringify(JSON.parse(req.mockResponse.body), null, 2);
        md += formatted;
      } catch (e) {
        md += req.mockResponse.body;
      }
      md += `\n\`\`\`\n\n`;
    }

    md += `---\n\n`;
  });

  return md;
}
