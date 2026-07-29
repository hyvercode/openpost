import { KeyValue, RequestAuth } from '../types';
import { replaceEnvironmentVariables } from '../utils';

export type LanguageId = 
  | 'curl' 
  | 'js-fetch' 
  | 'js-axios' 
  | 'python-requests' 
  | 'python-http' 
  | 'go' 
  | 'java-okhttp' 
  | 'csharp-httpclient' 
  | 'php-guzzle' 
  | 'ruby';

export interface CodeSnippetOptions {
  method: string;
  url: string;
  headers: KeyValue[];
  params: KeyValue[];
  bodyType: 'none' | 'raw' | 'form-data' | 'x-www-form-urlencoded' | 'graphql';
  bodyContent: string;
  bodyFormData: KeyValue[];
  gqlVariables?: string;
  authConfig?: RequestAuth;
  environmentVariables?: KeyValue[];
  expandVariables?: boolean;
}

export interface LanguageOption {
  id: LanguageId;
  name: string;
  category: string;
  syntax: string;
}

export const fontOptions: LanguageOption[] = [
  { id: 'curl', name: 'cURL', category: 'Shell', syntax: 'bash' },
  { id: 'js-fetch', name: 'JavaScript (Fetch)', category: 'JavaScript', syntax: 'javascript' },
  { id: 'js-axios', name: 'JavaScript (Axios)', category: 'JavaScript', syntax: 'javascript' },
  { id: 'python-requests', name: 'Python (Requests)', category: 'Python', syntax: 'python' },
  { id: 'python-http', name: 'Python (http.client)', category: 'Python', syntax: 'python' },
  { id: 'go', name: 'Go (net/http)', category: 'Go', syntax: 'go' },
  { id: 'java-okhttp', name: 'Java (OkHttp)', category: 'Java', syntax: 'java' },
  { id: 'csharp-httpclient', name: 'C# (HttpClient)', category: 'C#', syntax: 'csharp' },
  { id: 'php-guzzle', name: 'PHP (Guzzle)', category: 'PHP', syntax: 'php' },
  { id: 'ruby', name: 'Ruby (Net::HTTP)', category: 'Ruby', syntax: 'ruby' },
];

export function generateCodeSnippet(lang: LanguageId, opts: CodeSnippetOptions): string {
  const envVars = opts.environmentVariables || [];
  const expand = opts.expandVariables ?? true;

  const processStr = (str: string) => {
    if (!str) return '';
    return expand ? replaceEnvironmentVariables(str, envVars) : str;
  };

  let rawUrl = processStr(opts.url || 'https://api.example.com/endpoint');
  
  // Format Query Params
  const activeParams = (opts.params || []).filter(p => p.enabled && p.key);
  if (activeParams.length > 0) {
    try {
      const urlObj = new URL(rawUrl.startsWith('http') ? rawUrl : 'http://' + rawUrl);
      activeParams.forEach(p => {
        urlObj.searchParams.append(processStr(p.key), processStr(p.value));
      });
      rawUrl = urlObj.toString();
    } catch {
      const queryStr = activeParams.map(p => `${encodeURIComponent(processStr(p.key))}=${encodeURIComponent(processStr(p.value))}`).join('&');
      rawUrl += (rawUrl.includes('?') ? '&' : '?') + queryStr;
    }
  }

  // Construct Final Headers
  const activeHeaders: Record<string, string> = {};
  (opts.headers || []).filter(h => h.enabled && h.key).forEach(h => {
    activeHeaders[processStr(h.key)] = processStr(h.value);
  });

  // Auth Headers
  if (opts.authConfig && opts.authConfig.type !== 'none') {
    const auth = opts.authConfig;
    if (auth.type === 'bearer' && auth.bearer?.token) {
      activeHeaders['Authorization'] = `Bearer ${processStr(auth.bearer.token)}`;
    } else if (auth.type === 'basic' && (auth.basic?.username || auth.basic?.password)) {
      const u = processStr(auth.basic?.username || '');
      const p = processStr(auth.basic?.password || '');
      activeHeaders['Authorization'] = `Basic ${btoa(`${u}:${p}`)}`;
    } else if (auth.type === 'apikey' && auth.apikey?.key && auth.apikey?.value) {
      if (auth.apikey.addTo === 'header') {
        activeHeaders[processStr(auth.apikey.key)] = processStr(auth.apikey.value);
      }
    } else if (auth.type === 'oauth2' && auth.oauth2?.accessToken) {
      activeHeaders['Authorization'] = `Bearer ${processStr(auth.oauth2.accessToken)}`;
    }
  }

  // Body content
  let bodyStr = '';
  let contentType = activeHeaders['Content-Type'] || activeHeaders['content-type'];

  if (opts.bodyType === 'graphql' || opts.method === 'GQL') {
    contentType = 'application/json';
    activeHeaders['Content-Type'] = 'application/json';
    const gqlBody: any = { query: opts.bodyContent || '' };
    if (opts.gqlVariables) {
      try {
        gqlBody.variables = JSON.parse(opts.gqlVariables);
      } catch {
        gqlBody.variables = opts.gqlVariables;
      }
    }
    bodyStr = JSON.stringify(gqlBody, null, 2);
  } else if (opts.bodyType === 'raw' && opts.bodyContent) {
    bodyStr = processStr(opts.bodyContent);
  } else if (opts.bodyType === 'x-www-form-urlencoded') {
    contentType = 'application/x-www-form-urlencoded';
    activeHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
    const activeForm = (opts.bodyFormData || []).filter(f => f.enabled && f.key);
    bodyStr = activeForm.map(f => `${encodeURIComponent(processStr(f.key))}=${encodeURIComponent(processStr(f.value))}`).join('&');
  }

  const httpMethod = (opts.method === 'GQL' ? 'POST' : opts.method).toUpperCase();

  switch (lang) {
    case 'curl':
      return generateCurl(httpMethod, rawUrl, activeHeaders, bodyStr);
    case 'js-fetch':
      return generateJsFetch(httpMethod, rawUrl, activeHeaders, bodyStr);
    case 'js-axios':
      return generateJsAxios(httpMethod, rawUrl, activeHeaders, bodyStr);
    case 'python-requests':
      return generatePythonRequests(httpMethod, rawUrl, activeHeaders, bodyStr);
    case 'python-http':
      return generatePythonHttp(httpMethod, rawUrl, activeHeaders, bodyStr);
    case 'go':
      return generateGo(httpMethod, rawUrl, activeHeaders, bodyStr);
    case 'java-okhttp':
      return generateJavaOkHttp(httpMethod, rawUrl, activeHeaders, bodyStr);
    case 'csharp-httpclient':
      return generateCSharpHttpClient(httpMethod, rawUrl, activeHeaders, bodyStr);
    case 'php-guzzle':
      return generatePhpGuzzle(httpMethod, rawUrl, activeHeaders, bodyStr);
    case 'ruby':
      return generateRuby(httpMethod, rawUrl, activeHeaders, bodyStr);
    default:
      return generateCurl(httpMethod, rawUrl, activeHeaders, bodyStr);
  }
}

function generateCurl(method: string, url: string, headers: Record<string, string>, body: string): string {
  let cmd = `curl -X ${method} "${url}"`;
  Object.entries(headers).forEach(([k, v]) => {
    cmd += ` \\\n  -H "${k}: ${v.replace(/"/g, '\\"')}"`;
  });
  if (body) {
    cmd += ` \\\n  -d '${body.replace(/'/g, "'\\''")}'`;
  }
  return cmd;
}

function generateJsFetch(method: string, url: string, headers: Record<string, string>, body: string): string {
  const options: any = { method };
  if (Object.keys(headers).length > 0) {
    options.headers = headers;
  }
  if (body && method !== 'GET' && method !== 'HEAD') {
    options.body = body;
  }

  return `fetch("${url}", ${JSON.stringify(options, null, 2)})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error("Error:", error));`;
}

function generateJsAxios(method: string, url: string, headers: Record<string, string>, body: string): string {
  let dataVal = 'null';
  if (body) {
    try {
      dataVal = JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      dataVal = JSON.stringify(body);
    }
  }

  return `import axios from 'axios';

const config = {
  method: '${method.toLowerCase()}',
  url: '${url}',
  headers: ${JSON.stringify(headers, null, 2)}${body && method !== 'GET' ? `,\n  data: ${dataVal}` : ''}
};

axios(config)
  .then(response => {
    console.log(JSON.stringify(response.data));
  })
  .catch(error => {
    console.error(error);
  });`;
}

function generatePythonRequests(method: string, url: string, headers: Record<string, string>, body: string): string {
  let pyBody = '';
  if (body) {
    try {
      const parsed = JSON.parse(body);
      pyBody = `, json=${JSON.stringify(parsed, null, 2).replace(/true/g, 'True').replace(/false/g, 'False').replace(/null/g, 'None')}`;
    } catch {
      pyBody = `, data=${JSON.stringify(body)}`;
    }
  }

  return `import requests

url = "${url}"
headers = ${JSON.stringify(headers, null, 2)}

response = requests.${method.toLowerCase()}(url, headers=headers${pyBody})

print(response.status_code)
print(response.text)`;
}

function generatePythonHttp(method: string, url: string, headers: Record<string, string>, body: string): string {
  let host = 'api.example.com';
  let path = '/';
  try {
    const u = new URL(url.startsWith('http') ? url : 'http://' + url);
    host = u.host;
    path = u.pathname + u.search;
  } catch {}

  return `import http.client

conn = http.client.HTTPSConnection("${host}")
payload = ${JSON.stringify(body)}
headers = ${JSON.stringify(headers, null, 2)}

conn.request("${method}", "${path}", payload, headers)
res = conn.getresponse()
data = res.read()

print(data.decode("utf-8"))`;
}

function generateGo(method: string, url: string, headers: Record<string, string>, body: string): string {
  const bodyInit = body 
    ? `var payload = strings.NewReader(\`${body}\`)\n  req, err := http.NewRequest("${method}", "${url}", payload)`
    : `req, err := http.NewRequest("${method}", "${url}", nil)`;

  let headerLines = '';
  Object.entries(headers).forEach(([k, v]) => {
    headerLines += `  req.Header.Add("${k}", "${v}")\n`;
  });

  return `package main

import (
  "fmt"
  "io"
  "net/http"
  "strings"
)

func main() {
  url := "${url}"
  ${bodyInit}
  if err != nil {
    fmt.Println(err)
    return
  }

${headerLines}
  res, err := http.DefaultClient.Do(req)
  if err != nil {
    fmt.Println(err)
    return
  }
  defer res.Body.Close()

  body, err := io.ReadAll(res.Body)
  if err != nil {
    fmt.Println(err)
    return
  }

  fmt.Println(string(body))
}`;
}

function generateJavaOkHttp(method: string, url: string, headers: Record<string, string>, body: string): string {
  const mediaType = headers['Content-Type'] || 'application/json';
  const bodyLine = body 
    ? `RequestBody body = RequestBody.create(mediaType, "${body.replace(/"/g, '\\"').replace(/\n/g, '\\n')}");`
    : `RequestBody body = null;`;

  let headerLines = '';
  Object.entries(headers).forEach(([k, v]) => {
    headerLines += `  .addHeader("${k}", "${v}")\n`;
  });

  return `OkHttpClient client = new OkHttpClient().newBuilder().build();
MediaType mediaType = MediaType.parse("${mediaType}");
${bodyLine}
Request request = new Request.Builder()
  .url("${url}")
  .method("${method}", ${body ? 'body' : 'null'})
${headerLines}  .build();

Response response = client.newCall(request).execute();
System.out.println(response.body().string());`;
}

function generateCSharpHttpClient(method: string, url: string, headers: Record<string, string>, body: string): string {
  let headerLines = '';
  Object.entries(headers).forEach(([k, v]) => {
    if (k.toLowerCase() !== 'content-type') {
      headerLines += `request.Headers.Add("${k}", "${v}");\n`;
    }
  });

  const contentType = headers['Content-Type'] || 'application/json';
  const bodyLine = body 
    ? `var content = new StringContent("${body.replace(/"/g, '\\"').replace(/\n/g, '\\n')}", null, "${contentType}");\nrequest.Content = content;`
    : '';

  return `var client = new HttpClient();
var request = new HttpRequestMessage(HttpMethod.${method.charAt(0) + method.slice(1).toLowerCase()}, "${url}");
${headerLines}${bodyLine}
var response = await client.SendAsync(request);
response.EnsureSuccessStatusCode();
Console.WriteLine(await response.Content.ReadAsStringAsync());`;
}

function generatePhpGuzzle(method: string, url: string, headers: Record<string, string>, body: string): string {
  return `<?php
$client = new \\GuzzleHttp\\Client();

$response = $client->request('${method}', '${url}', [
  'headers' => ${JSON.stringify(headers, null, 2).replace(/\{/g, '[').replace(/\}/g, ']')},
  ${body ? `'body' => '${body.replace(/'/g, "\\'")}'` : ''}
]);

echo $response->getBody();`;
}

function generateRuby(method: string, url: string, headers: Record<string, string>, body: string): string {
  let headerLines = '';
  Object.entries(headers).forEach(([k, v]) => {
    headerLines += `request["${k}"] = "${v}"\n`;
  });

  return `require 'uri'
require 'net/http'

url = URI("${url}")
http = Net::HTTP.new(url.host, url.port)
http.use_ssl = (url.scheme == "https")

request = Net::HTTP::${method.charAt(0) + method.slice(1).toLowerCase()}.new(url)
${headerLines}${body ? `request.body = ${JSON.stringify(body)}\n` : ''}
response = http.request(request)
puts response.read_body`;
}
