import { ApiCollection, RequestItem } from '../types';

export function exportToPostman(collections: ApiCollection[]): any {
  return {
    info: {
      name: "OpenPost Export",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    item: collections.map(collection => ({
      name: collection.name,
      item: collection.requests.map(req => mapRequestToPostman(req))
    }))
  };
}

function mapRequestToPostman(req: RequestItem): any {
  const urlObj = {
    raw: req.url,
    host: req.url.split('/')[2] ? [req.url.split('/')[2]] : [],
    path: req.url.split('/').slice(3),
    query: req.params?.filter(p => p.enabled && p.key).map(p => ({
      key: p.key,
      value: p.value
    })) || []
  };

  const header = req.headers?.filter(h => h.enabled && h.key).map(h => ({
    key: h.key,
    value: h.value
  })) || [];

  let body = {};
  if (req.body?.type === 'raw') {
    body = {
      mode: 'raw',
      raw: req.body.content
    };
  } else if (req.body?.type === 'form-data') {
    body = {
      mode: 'formdata',
      formdata: req.body.formData?.filter(f => f.enabled && f.key).map(f => ({
        key: f.key,
        value: f.value,
        type: 'text'
      })) || []
    };
  } else if (req.body?.type === 'x-www-form-urlencoded') {
    body = {
      mode: 'urlencoded',
      urlencoded: req.body.formData?.filter(f => f.enabled && f.key).map(f => ({
        key: f.key,
        value: f.value,
        type: 'text'
      })) || []
    };
  } else if (req.body?.type === 'graphql') {
    body = {
      mode: 'graphql',
      graphql: {
        query: req.body.content,
        variables: req.body.variables
      }
    };
  }

  let auth = {};
  if (req.auth) {
    if (req.auth.type === 'bearer') {
      auth = {
        type: 'bearer',
        bearer: [
          { key: 'token', value: req.auth.bearer?.token || '', type: 'string' }
        ]
      };
    } else if (req.auth.type === 'basic') {
      auth = {
        type: 'basic',
        basic: [
          { key: 'username', value: req.auth.basic?.username || '', type: 'string' },
          { key: 'password', value: req.auth.basic?.password || '', type: 'string' }
        ]
      };
    } else if (req.auth.type === 'apikey') {
      auth = {
        type: 'apikey',
        apikey: [
          { key: 'key', value: req.auth.apikey?.key || '', type: 'string' },
          { key: 'value', value: req.auth.apikey?.value || '', type: 'string' },
          { key: 'in', value: req.auth.apikey?.addTo || 'header', type: 'string' }
        ]
      };
    }
  }

  return {
    name: req.name,
    request: {
      method: req.method,
      header,
      body: Object.keys(body).length > 0 ? body : undefined,
      url: urlObj,
      auth: Object.keys(auth).length > 0 ? auth : undefined
    }
  };
}
