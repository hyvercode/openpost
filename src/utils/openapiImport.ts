import * as yaml from 'js-yaml';
import { v4 as uuidv4 } from 'uuid';
import { ApiCollection, ApiFolder, RequestItem, KeyValue } from '../types';

export interface OpenAPIImportResult {
  collection: ApiCollection;
  requestsCount: number;
  foldersCount: number;
}

export function parseOpenAPISpec(
  inputContent: string,
  workspaceId: string
): OpenAPIImportResult {
  let doc: any = null;

  // Try parsing JSON first, then YAML
  try {
    doc = JSON.parse(inputContent);
  } catch {
    try {
      doc = yaml.load(inputContent);
    } catch (err: any) {
      throw new Error(`Failed to parse file as JSON or YAML: ${err.message}`);
    }
  }

  if (!doc || typeof doc !== 'object') {
    throw new Error('Invalid document structure.');
  }

  const isSwaggerV2 = typeof doc.swagger === 'string' && doc.swagger.startsWith('2.');
  const isOpenAPIV3 = typeof doc.openapi === 'string' && (doc.openapi.startsWith('3.') || doc.openapi.startsWith('3.1'));

  if (!isSwaggerV2 && !isOpenAPIV3 && !doc.paths) {
    throw new Error('Document does not appear to be a valid OpenAPI (v3) or Swagger (v2) specification.');
  }

  const collectionId = uuidv4();
  const collectionName = doc.info?.title || 'Imported OpenAPI Spec';
  const collectionDescription = doc.info?.description || '';

  // Determine base URL
  let baseUrl = '';
  if (isOpenAPIV3 && Array.isArray(doc.servers) && doc.servers.length > 0) {
    baseUrl = doc.servers[0].url || '';
    // Replace server variables if present like {scheme}://{host}
    if (doc.servers[0].variables) {
      Object.entries(doc.servers[0].variables).forEach(([key, varObj]: [string, any]) => {
        const defaultVal = varObj?.default || '';
        baseUrl = baseUrl.replace(`{${key}}`, defaultVal);
      });
    }
  } else if (isSwaggerV2) {
    const host = doc.host || '';
    const basePath = doc.basePath || '';
    const scheme = Array.isArray(doc.schemes) && doc.schemes.length > 0 ? doc.schemes[0] : 'https';
    if (host) {
      baseUrl = `${scheme}://${host}${basePath}`;
    } else if (basePath) {
      baseUrl = basePath;
    }
  }

  // Clean trailing slash from baseUrl
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }

  const tagToFolderMap = new Map<string, string>(); // Tag Name -> Folder UUID
  const folders: ApiFolder[] = [];
  const requests: RequestItem[] = [];

  // Create folders for explicit tags defined in top-level `tags`
  if (Array.isArray(doc.tags)) {
    doc.tags.forEach((tagObj: any) => {
      if (tagObj && tagObj.name && !tagToFolderMap.has(tagObj.name)) {
        const folderId = uuidv4();
        tagToFolderMap.set(tagObj.name, folderId);
        folders.push({
          id: folderId,
          name: tagObj.name,
          parentId: null
        });
      }
    });
  }

  // Helper function to extract sample string from schema
  const generateSampleFromSchema = (schema: any): any => {
    if (!schema) return '';
    if (schema.example !== undefined) return schema.example;
    if (schema.default !== undefined) return schema.default;

    if (schema.type === 'object' || schema.properties) {
      const obj: Record<string, any> = {};
      if (schema.properties) {
        Object.entries(schema.properties).forEach(([propName, propSchema]: [string, any]) => {
          obj[propName] = generateSampleFromSchema(propSchema);
        });
      }
      return obj;
    }

    if (schema.type === 'array') {
      return [generateSampleFromSchema(schema.items || {})];
    }

    if (schema.type === 'integer' || schema.type === 'number') return 0;
    if (schema.type === 'boolean') return true;
    if (schema.type === 'string') {
      if (schema.format === 'date') return '2026-01-01';
      if (schema.format === 'date-time') return new Date().toISOString();
      if (schema.format === 'email') return 'user@example.com';
      if (schema.format === 'uuid') return uuidv4();
      return 'string';
    }

    return '';
  };

  const validMethods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace'];

  if (doc.paths && typeof doc.paths === 'object') {
    Object.entries(doc.paths).forEach(([pathKey, pathObj]: [string, any]) => {
      if (!pathObj || typeof pathObj !== 'object') return;

      const pathLevelParams = Array.isArray(pathObj.parameters) ? pathObj.parameters : [];

      Object.entries(pathObj).forEach(([methodKey, opObj]: [string, any]) => {
        const lowerMethod = methodKey.toLowerCase();
        if (!validMethods.includes(lowerMethod)) return;

        const op = opObj || {};
        const method = lowerMethod.toUpperCase();

        // Target Folder
        let folderId: string | null = null;
        if (Array.isArray(op.tags) && op.tags.length > 0) {
          const firstTag = op.tags[0];
          if (!tagToFolderMap.has(firstTag)) {
            const newFolderId = uuidv4();
            tagToFolderMap.set(firstTag, newFolderId);
            folders.push({
              id: newFolderId,
              name: firstTag,
              parentId: null
            });
          }
          folderId = tagToFolderMap.get(firstTag) || null;
        }

        // Request Name
        const name = op.summary || op.operationId || `${method} ${pathKey}`;

        // Build URL
        let requestUrl = pathKey;
        if (baseUrl) {
          requestUrl = `${baseUrl}${pathKey.startsWith('/') ? '' : '/'}${pathKey}`;
        }

        // Parameters
        const combinedParams = [...pathLevelParams, ...(Array.isArray(op.parameters) ? op.parameters : [])];
        const headersList: KeyValue[] = [];
        const queryParamsList: KeyValue[] = [];

        combinedParams.forEach((param: any) => {
          if (!param || typeof param !== 'object') return;

          const paramKey = param.name || '';
          if (!paramKey) return;

          const sampleValue = param.example !== undefined
            ? String(param.example)
            : param.default !== undefined
            ? String(param.default)
            : param.schema
            ? String(generateSampleFromSchema(param.schema))
            : '';

          if (param.in === 'query') {
            queryParamsList.push({
              id: uuidv4(),
              key: paramKey,
              value: sampleValue,
              enabled: true
            });
          } else if (param.in === 'header') {
            headersList.push({
              id: uuidv4(),
              key: paramKey,
              value: sampleValue,
              enabled: true
            });
          } else if (param.in === 'path') {
            // Replaces {id} in url if needed or keeps path param syntax
          }
        });

        // Request Body
        let bodyType: 'none' | 'raw' | 'form-data' | 'x-www-form-urlencoded' | 'graphql' = 'none';
        let bodyContent = '';

        if (op.requestBody && op.requestBody.content) {
          const contentObj = op.requestBody.content;
          if (contentObj['application/json']) {
            bodyType = 'raw';
            const schema = contentObj['application/json'].schema;
            const example = contentObj['application/json'].example || contentObj['application/json'].examples;
            if (example) {
              bodyContent = typeof example === 'object' ? JSON.stringify(example, null, 2) : String(example);
            } else if (schema) {
              const sample = generateSampleFromSchema(schema);
              bodyContent = typeof sample === 'object' ? JSON.stringify(sample, null, 2) : String(sample);
            }
          } else if (contentObj['application/x-www-form-urlencoded']) {
            bodyType = 'x-www-form-urlencoded';
          } else if (contentObj['multipart/form-data']) {
            bodyType = 'form-data';
          } else {
            const firstType = Object.keys(contentObj)[0];
            if (firstType) {
              bodyType = 'raw';
              bodyContent = JSON.stringify(contentObj[firstType]?.example || {}, null, 2);
            }
          }
        } else {
          // Swagger v2 body / formData
          const bodyParam = combinedParams.find((p: any) => p.in === 'body');
          if (bodyParam) {
            bodyType = 'raw';
            if (bodyParam.schema) {
              const sample = generateSampleFromSchema(bodyParam.schema);
              bodyContent = typeof sample === 'object' ? JSON.stringify(sample, null, 2) : String(sample);
            }
          } else {
            const formDataParams = combinedParams.filter((p: any) => p.in === 'formData');
            if (formDataParams.length > 0) {
              bodyType = 'form-data';
            }
          }
        }

        requests.push({
          id: uuidv4(),
          collectionId,
          workspaceId,
          name,
          method,
          url: requestUrl,
          headers: headersList,
          params: queryParamsList,
          folderId,
          body: {
            type: bodyType,
            content: bodyContent
          }
        });
      });
    });
  }

  const collection: ApiCollection = {
    id: collectionId,
    workspaceId,
    name: collectionName,
    description: collectionDescription,
    folders,
    requests
  };

  return {
    collection,
    requestsCount: requests.length,
    foldersCount: folders.length
  };
}
