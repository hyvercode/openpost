import { ApiCollection, RequestItem } from "../types";

export function exportToOpenAPI(collection: ApiCollection): string {
  const paths: any = {};

  collection.requests.forEach((req: RequestItem) => {
    let path = "/";
    try {
      // Replace environment variables syntax like {{var}} with something safe or try parsing URL
      const cleanUrl = req.url.replace(/\{\{.*?\}\}/g, 'placeholder');
      const url = new URL(cleanUrl.startsWith('http') ? cleanUrl : `http://localhost${cleanUrl.startsWith('/') ? '' : '/'}${cleanUrl}`);
      path = url.pathname;
    } catch (e) {
      path = req.url || "/";
    }

    if (!paths[path]) {
      paths[path] = {};
    }

    const method = req.method.toLowerCase();
    const parameters: any[] = [];

    req.params?.forEach(param => {
      if (param.enabled && param.key) {
        parameters.push({
          name: param.key,
          in: "query",
          required: false,
          schema: { type: "string" },
          example: param.value
        });
      }
    });

    req.headers?.forEach(header => {
      if (header.enabled && header.key) {
        parameters.push({
          name: header.key,
          in: "header",
          required: false,
          schema: { type: "string" },
          example: header.value
        });
      }
    });

    let requestBody: any = undefined;
    if (req.body && req.body.type !== 'none' && req.body.content) {
      let contentType = "application/json";
      if (req.body.type === 'graphql') contentType = "application/graphql";
      if (req.body.type === 'form-data') contentType = "multipart/form-data";
      if (req.body.type === 'x-www-form-urlencoded') contentType = "application/x-www-form-urlencoded";

      requestBody = {
        content: {
          [contentType]: {
            schema: {
              type: "object"
            },
            example: req.body.type === 'raw' || req.body.type === 'graphql' ? parseJsonSafely(req.body.content) : req.body.content
          }
        }
      };
    }

    paths[path][method] = {
      summary: req.name,
      operationId: req.id,
      parameters: parameters.length > 0 ? parameters : undefined,
      requestBody,
      responses: {
        "200": {
          description: "Successful response"
        }
      }
    };
  });

  const openapi = {
    openapi: "3.0.0",
    info: {
      title: collection.name,
      version: "1.0.0",
      description: "Exported from OpenPost API Tester"
    },
    paths
  };

  return JSON.stringify(openapi, null, 2);
}

function parseJsonSafely(str: string): any {
  try {
    return JSON.parse(str);
  } catch (e) {
    return str;
  }
}
