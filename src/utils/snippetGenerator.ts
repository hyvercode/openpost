
import { KeyValue } from '../types';

export interface RequestConfig {
  url: string;
  method: string;
  headers: KeyValue[];
  params: KeyValue[];
  bodyContent: string;
  bodyType?: string;
  bodyFormData?: KeyValue[];
}

export function generateCurl(config: RequestConfig): string {
  const { url, method, headers, params, bodyContent, bodyType, bodyFormData } = config;
  
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
  if (method !== 'GET') {
    if (bodyType === 'form-data' && bodyFormData) {
      bodyFormData.filter(f => f.enabled && f.key).forEach(f => {
        if (f.type === 'file') {
          curl += ` \\\n--form '${f.key}=@${f.fileName || 'file.bin'}'`;
        } else {
          curl += ` \\\n--form '${f.key}="${f.value.replace(/'/g, "'\\''")}"'`;
        }
      });
    } else if (bodyType === 'x-www-form-urlencoded' && bodyFormData) {
      bodyFormData.filter(f => f.enabled && f.key).forEach(f => {
        curl += ` \\\n--data-urlencode '${f.key}=${f.value.replace(/'/g, "'\\''")}'`;
      });
    } else if (bodyContent) {
      curl += ` \\\n--data-raw '${bodyContent.replace(/'/g, "'\\''")}'`;
    }
  }

  return curl;
}

export function generateFetch(config: RequestConfig): string {
  const { url, method, headers, params, bodyContent, bodyType, bodyFormData } = config;
  
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

  // If we have form-data, Fetch API automatically sets correct Content-Type with boundary, so remove manual Content-Type header if present
  if (bodyType === 'form-data' && fetchHeaders['Content-Type']) {
    delete fetchHeaders['Content-Type'];
  }

  let bodyCode = '';
  let bodyOption = '';

  if (method !== 'GET') {
    if (bodyType === 'form-data' && bodyFormData) {
      bodyCode = `const formdata = new FormData();\n` + 
        bodyFormData.filter(f => f.enabled && f.key).map(f => {
          if (f.type === 'file') {
            return `// formdata.append("${f.key}", fileInput.files[0], "${f.fileName || 'file.bin'}");`;
          } else {
            return `formdata.append("${f.key}", "${f.value.replace(/"/g, '\\"')}");`;
          }
        }).join('\n') + '\n\n';
      bodyOption = 'body: formdata,';
    } else if (bodyType === 'x-www-form-urlencoded' && bodyFormData) {
      bodyCode = `const urlencoded = new URLSearchParams();\n` +
        bodyFormData.filter(f => f.enabled && f.key).map(f => {
          return `urlencoded.append("${f.key}", "${f.value.replace(/"/g, '\\"')}");`;
        }).join('\n') + '\n\n';
      bodyOption = 'body: urlencoded,';
    } else if (bodyContent) {
      bodyCode = `const raw = JSON.stringify(${bodyContent});\n\n`;
      bodyOption = 'body: raw,';
    }
  }

  return `const myHeaders = new Headers();
${Object.entries(fetchHeaders).map(([k, v]) => `myHeaders.append("${k}", "${v}");`).join('\n')}

${bodyCode}const requestOptions = {
  method: "${method}",
  headers: myHeaders,
  ${bodyOption}
  redirect: "follow"
};

fetch("${finalUrl}", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.error(error));`;
}

export function generateAxios(config: RequestConfig): string {
  const { url, method, headers, params, bodyContent, bodyType, bodyFormData } = config;

  const axiosHeaders: Record<string, string> = {};
  headers.filter(h => h.enabled && h.key).forEach(h => {
    axiosHeaders[h.key] = h.value;
  });

  const axiosParams: Record<string, string> = {};
  params.filter(p => p.enabled && p.key).forEach(p => {
    axiosParams[p.key] = p.value;
  });

  // If we have form-data, Axios automatically configures headers, so remove manual Content-Type header if present
  if (bodyType === 'form-data' && axiosHeaders['Content-Type']) {
    delete axiosHeaders['Content-Type'];
  }

  let setupCode = "const axios = require('axios');\n";
  let dataVariable = '';
  let headersMerge = '';

  if (method !== 'GET') {
    if (bodyType === 'form-data' && bodyFormData) {
      setupCode += `const FormData = require('form-data');\n`;
      setupCode += `const fs = require('fs');\n`;
      setupCode += `const data = new FormData();\n`;
      bodyFormData.filter(f => f.enabled && f.key).forEach(f => {
        if (f.type === 'file') {
          setupCode += `data.append('${f.key}', fs.createReadStream('${f.fileName || 'file.bin'}'));\n`;
        } else {
          setupCode += `data.append('${f.key}', '${f.value.replace(/'/g, "\\'")}');\n`;
        }
      });
      dataVariable = 'data';
      headersMerge = '...data.getHeaders()';
    } else if (bodyType === 'x-www-form-urlencoded' && bodyFormData) {
      setupCode += `const qs = require('qs');\n`;
      const urlencodedObj: Record<string, string> = {};
      bodyFormData.filter(f => f.enabled && f.key).forEach(f => {
        urlencodedObj[f.key] = f.value;
      });
      setupCode += `const data = qs.stringify(${JSON.stringify(urlencodedObj, null, 2)});\n`;
      dataVariable = 'data';
    } else if (bodyContent) {
      setupCode += `const data = JSON.stringify(${bodyContent});\n`;
      dataVariable = 'data';
    }
  }

  const mergedHeaders = { ...axiosHeaders };

  return `${setupCode}
let config = {
  method: '${method.toLowerCase()}',
  maxBodyLength: Infinity,
  url: '${url}',
  headers: { 
    ${Object.entries(mergedHeaders).map(([k, v]) => `'${k}': '${v}'`).concat(headersMerge ? [headersMerge] : []).join(', \n    ')}
  },
  params: ${JSON.stringify(axiosParams, null, 2)},
  ${dataVariable ? `data: ${dataVariable}` : ''}
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
