
import { KeyValue } from '../types';

export interface RequestConfig {
  url: string;
  method: string;
  headers: KeyValue[];
  params: KeyValue[];
  bodyContent: string;
}

export function generateCurl(config: RequestConfig): string {
  const { url, method, headers, params, bodyContent } = config;
  
  // Build URL with query params
  let finalUrl = url;
  const enabledParams = params.filter(p => p.enabled && p.key);
  if (enabledParams.length > 0) {
    const urlObj = new URL(url.startsWith('http') ? url : `http://${url}`);
    enabledParams.forEach(p => {
      urlObj.searchParams.append(p.key, p.value);
    });
    finalUrl = urlObj.toString();
  }

  let curl = `curl --location --request ${method} '${finalUrl}'`;

  // Headers
  headers.filter(h => h.enabled && h.key).forEach(h => {
    curl += ` \\\n--header '${h.key}: ${h.value}'`;
  });

  // Body
  if (bodyContent && method !== 'GET') {
    curl += ` \\\n--data-raw '${bodyContent.replace(/'/g, "'\\''")}'`;
  }

  return curl;
}

export function generateFetch(config: RequestConfig): string {
  const { url, method, headers, params, bodyContent } = config;
  
  // Build URL with query params
  let finalUrl = url;
  const enabledParams = params.filter(p => p.enabled && p.key);
  if (enabledParams.length > 0) {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `http://${url}`);
      enabledParams.forEach(p => {
        urlObj.searchParams.append(p.key, p.value);
      });
      finalUrl = urlObj.toString();
    } catch (e) {
      // Fallback if URL is invalid
    }
  }

  const fetchHeaders: Record<string, string> = {};
  headers.filter(h => h.enabled && h.key).forEach(h => {
    fetchHeaders[h.key] = h.value;
  });

  const options: any = {
    method,
    headers: fetchHeaders,
  };

  if (bodyContent && method !== 'GET') {
    options.body = bodyContent;
  }

  return `const myHeaders = new Headers();
${Object.entries(fetchHeaders).map(([k, v]) => `myHeaders.append("${k}", "${v}");`).join('\n')}

const requestOptions = {
  method: "${method}",
  headers: myHeaders,
  ${bodyContent && method !== 'GET' ? `body: JSON.stringify(${bodyContent}),` : ''}
  redirect: "follow"
};

fetch("${finalUrl}", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.error(error));`;
}

export function generateAxios(config: RequestConfig): string {
  const { url, method, headers, params, bodyContent } = config;

  const axiosHeaders: Record<string, string> = {};
  headers.filter(h => h.enabled && h.key).forEach(h => {
    axiosHeaders[h.key] = h.value;
  });

  const axiosParams: Record<string, string> = {};
  params.filter(p => p.enabled && p.key).forEach(p => {
    axiosParams[p.key] = p.value;
  });

  return `const axios = require('axios');
${bodyContent && method !== 'GET' ? `let data = JSON.stringify(${bodyContent});` : ''}

let config = {
  method: '${method.toLowerCase()}',
  maxBodyLength: Infinity,
  url: '${url}',
  headers: { 
    ${Object.entries(axiosHeaders).map(([k, v]) => `'${k}': '${v}'`).join(', \n    ')}
  },
  params: ${JSON.stringify(axiosParams, null, 2)},
  ${bodyContent && method !== 'GET' ? 'data : data' : ''}
};

axios.request(config)
.then((response) => {
  console.log(JSON.stringify(response.data));
})
.catch((error) => {
  console.log(error);
});`;
}

export function generatePythonRequests(config: RequestConfig): string {
  const { url, method, headers, params, bodyContent } = config;

  const pyHeaders: Record<string, string> = {};
  headers.filter(h => h.enabled && h.key).forEach(h => {
    pyHeaders[h.key] = h.value;
  });

  const pyParams: Record<string, string> = {};
  params.filter(p => p.enabled && p.key).forEach(p => {
    pyParams[p.key] = p.value;
  });

  return `import requests
import json

url = "${url}"

${bodyContent && method !== 'GET' ? `payload = json.dumps(${bodyContent})` : 'payload = {}'}
headers = ${JSON.stringify(pyHeaders, null, 4)}
params = ${JSON.stringify(pyParams, null, 4)}

response = requests.request("${method}", url, headers=headers, data=payload, params=params)

print(response.text)`;
}

export function generateGo(config: RequestConfig): string {
  const { url, method, headers, params, bodyContent } = config;
  
  let finalUrl = url;
  const enabledParams = params.filter(p => p.enabled && p.key);
  if (enabledParams.length > 0) {
     // Simplistic param building for Go example
     const qs = enabledParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
     finalUrl += (finalUrl.includes('?') ? '&' : '?') + qs;
  }

  return `package main

import (
  "fmt"
  "strings"
  "net/http"
  "io/ioutil"
)

func main() {

  url := "${finalUrl}"
  method := "${method}"

  ${bodyContent && method !== 'GET' ? `payload := strings.NewReader(\`${bodyContent}\`)` : 'payload := nil'}

  client := &http.Client {
  }
  req, err := http.NewRequest(method, url, payload)

  if err != nil {
    fmt.Println(err)
    return
  }
  ${headers.filter(h => h.enabled && h.key).map(h => `req.Header.Add("${h.key}", "${h.value}")`).join('\n  ')}

  res, err := client.Do(req)
  if err != nil {
    fmt.Println(err)
    return
  }
  defer res.Body.Close()

  body, err := ioutil.ReadAll(res.Body)
  if err != nil {
    fmt.Println(err)
    return
  }
  fmt.Println(string(body))
}`;
}
