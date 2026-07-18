import { ApiCollection, RequestItem } from "../types";

export type GatewayType = 'krakend' | 'kong' | 'spring_cloud_gateway';

export function exportToGateway(collection: ApiCollection, type: GatewayType): string {
  switch (type) {
    case 'krakend':
      return generateKrakenDConfig(collection);
    case 'kong':
      return generateKongConfig(collection);
    case 'spring_cloud_gateway':
      return generateSpringCloudGatewayConfig(collection);
    default:
      return '';
  }
}

function generateKrakenDConfig(collection: ApiCollection): string {
  const config = {
    version: 3,
    name: collection.name,
    port: 8080,
    endpoints: collection.requests.map(req => {
      // Basic heuristic for backend host: use the URL or a placeholder
      let host = "http://localhost:8081";
      let path = "/";
      try {
        const url = new URL(req.url.startsWith('http') ? req.url : `http://${req.url}`);
        host = `${url.protocol}//${url.host}`;
        path = url.pathname;
      } catch (e) {
        path = req.url;
      }

      return {
        endpoint: path,
        method: req.method,
        output_encoding: "json",
        backend: [
          {
            url_pattern: path,
            method: req.method,
            host: [host],
            encoding: "json"
          }
        ]
      };
    })
  };

  return JSON.stringify(config, null, 2);
}

function generateKongConfig(collection: ApiCollection): string {
  const config: any = {
    _format_version: "3.0",
    services: []
  };

  const servicesMap = new Map<string, any>();

  collection.requests.forEach(req => {
    let host = "localhost";
    let port = 80;
    let protocol = "http";
    let path = "/";

    try {
      const url = new URL(req.url.startsWith('http') ? req.url : `http://${req.url}`);
      host = url.hostname;
      port = parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80);
      protocol = url.protocol.replace(':', '');
      path = url.pathname;
    } catch (e) {
      path = req.url;
    }

    const serviceName = `${collection.name.replace(/\s+/g, '_').toLowerCase()}_service`;
    
    if (!servicesMap.has(serviceName)) {
      servicesMap.set(serviceName, {
        name: serviceName,
        url: `${protocol}://${host}:${port}`,
        routes: []
      });
    }

    const service = servicesMap.get(serviceName);
    service.routes.push({
      name: req.name.replace(/\s+/g, '_').toLowerCase(),
      paths: [path],
      methods: [req.method]
    });
  });

  config.services = Array.from(servicesMap.values());
  
  // Note: For a real app we might want a proper YAML library, 
  // but for a simple "Export" feature, we can just return the JSON string or use a simple YAML-ish formatting if needed.
  // Since we don't have a YAML library installed, I'll return it as JSON which Kong supports too, or a very simple YAML converter.
  return JSON.stringify(config, null, 2);
}

function generateSpringCloudGatewayConfig(collection: ApiCollection): string {
  let yaml = "spring:\n  cloud:\n    gateway:\n      routes:\n";
  
  collection.requests.forEach((req, index) => {
    let uri = "http://localhost:8080";
    let path = "/";
    try {
      const url = new URL(req.url.startsWith('http') ? req.url : `http://${req.url}`);
      uri = `${url.protocol}//${url.host}`;
      path = url.pathname;
    } catch (e) {
      path = req.url;
    }

    yaml += `        - id: ${req.name.replace(/\s+/g, '_').toLowerCase()}_${index}\n`;
    yaml += `          uri: ${uri}\n`;
    yaml += `          predicates:\n`;
    yaml += `            - Path=${path}\n`;
    yaml += `            - Method=${req.method}\n`;
  });

  return yaml;
}
