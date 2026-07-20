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
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `http://${url}`);
      enabledParams.forEach(p => {
        urlObj.searchParams.append(p.key, p.value);
      });
      finalUrl = urlObj.toString();
    } catch (e) {
      // Fallback
      const qs = enabledParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
      finalUrl += (finalUrl.includes('?') ? '&' : '?') + qs;
    }
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
      const qs = enabledParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
      finalUrl += (finalUrl.includes('?') ? '&' : '?') + qs;
    }
  }

  const fetchHeaders: Record<string, string> = {};
  headers.filter(h => h.enabled && h.key).forEach(h => {
    fetchHeaders[h.key] = h.value;
  });

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
          setupCode += `data.append('${f.key}', '${f.value.replace(/'/g, "\\\'")}');\n`;
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
  const { url, method, headers, params, bodyContent, bodyType, bodyFormData } = config;

  const pyHeaders: Record<string, string> = {};
  headers.filter(h => h.enabled && h.key).forEach(h => {
    pyHeaders[h.key] = h.value;
  });

  const pyParams: Record<string, string> = {};
  params.filter(p => p.enabled && p.key).forEach(p => {
    pyParams[p.key] = p.value;
  });

  let payloadCode = '';
  let dataParam = 'data=payload';

  if (method !== 'GET') {
    if (bodyType === 'form-data' && bodyFormData) {
      const ctKey = Object.keys(pyHeaders).find(k => k.toLowerCase() === 'content-type');
      if (ctKey) delete pyHeaders[ctKey];

      const formDataList = bodyFormData.filter(f => f.enabled && f.key);
      const filesList = formDataList.filter(f => f.type === 'file');
      const dataList = formDataList.filter(f => f.type !== 'file');

      let payloadDict = '{\n';
      dataList.forEach(f => {
        payloadDict += `    '${f.key}': '${f.value.replace(/'/g, "\\'")}',\n`;
      });
      payloadDict += '}';

      if (filesList.length > 0) {
        let filesCode = 'files = [\n';
        filesList.forEach(f => {
          filesCode += `    ('${f.key}', ('${f.fileName || 'file.bin'}', open('${f.fileName || 'file.bin'}', 'rb'), 'application/octet-stream')),\n`;
        });
        filesCode += ']';
        payloadCode = `payload = ${payloadDict}\n${filesCode}`;
        dataParam = 'data=payload, files=files';
      } else {
        payloadCode = `payload = ${payloadDict}`;
      }
    } else if (bodyType === 'x-www-form-urlencoded' && bodyFormData) {
      const ctKey = Object.keys(pyHeaders).find(k => k.toLowerCase() === 'content-type');
      if (ctKey) delete pyHeaders[ctKey];

      let payloadDict = '{\n';
      bodyFormData.filter(f => f.enabled && f.key).forEach(f => {
        payloadDict += `    '${f.key}': '${f.value.replace(/'/g, "\\'")}',\n`;
      });
      payloadDict += '}';
      payloadCode = `payload = ${payloadDict}`;
    } else if (bodyType === 'graphql') {
      let queryStr = '';
      let variablesStr = '{}';
      try {
        const parsedGql = JSON.parse(bodyContent);
        queryStr = parsedGql.query || '';
        if (parsedGql.variables) {
          variablesStr = JSON.stringify(parsedGql.variables, null, 4);
        }
      } catch (e) {
        queryStr = bodyContent;
      }
      payloadCode = `payload = json.dumps({
    "query": """${queryStr.replace(/"/g, '\\"')}""",
    "variables": ${variablesStr}
})`;
      dataParam = 'data=payload';
    } else if (bodyContent) {
      const isJson = Object.keys(pyHeaders).some(k => k.toLowerCase() === 'content-type' && pyHeaders[k].includes('application/json'));
      if (isJson) {
        try {
          const parsed = JSON.parse(bodyContent);
          payloadCode = `payload = json.dumps(${JSON.stringify(parsed, null, 4)})`;
        } catch (e) {
          payloadCode = `payload = """${bodyContent}"""`;
        }
      } else {
        payloadCode = `payload = """${bodyContent}"""`;
      }
      dataParam = 'data=payload';
    } else {
      payloadCode = 'payload = {}';
    }
  } else {
    payloadCode = 'payload = {}';
  }

  return `import requests
import json

url = "${url}"

${payloadCode}
headers = ${JSON.stringify(pyHeaders, null, 4)}
params = ${JSON.stringify(pyParams, null, 4)}

response = requests.request("${method}", url, headers=headers, ${dataParam}, params=params)

print(response.text)`;
}

export function generateGo(config: RequestConfig): string {
  const { url, method, headers, params, bodyContent, bodyType, bodyFormData } = config;
  
  let finalUrl = url;
  const enabledParams = params.filter(p => p.enabled && p.key);
  if (enabledParams.length > 0) {
     const qs = enabledParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
     finalUrl += (finalUrl.includes('?') ? '&' : '?') + qs;
  }

  let imports = `import (
  "fmt"
  "strings"
  "net/http"
  "io/ioutil"
)`;

  let payloadSetup = 'payload := nil';
  if (method !== 'GET') {
    if (bodyType === 'form-data' && bodyFormData) {
      imports = `import (
  "fmt"
  "bytes"
  "mime/multipart"
  "net/http"
  "io"
  "io/ioutil"
  "os"
)`;
      let formWriterCode = `  body := &bytes.Buffer{}
  writer := multipart.NewWriter(body)
`;
      bodyFormData.filter(f => f.enabled && f.key).forEach(f => {
        if (f.type === 'file') {
          formWriterCode += `  file, err := os.Open("${f.fileName || 'file.bin'}")
  if err == nil {
    defer file.Close()
    part, err := writer.CreateFormFile("${f.key}", "${f.fileName || 'file.bin'}")
    if err == nil {
      io.Copy(part, file)
    }
  }
`;
        } else {
          formWriterCode += `  _ = writer.WriteField("${f.key}", "${f.value.replace(/"/g, '\\"')}")\n`;
        }
      });
      formWriterCode += `  err = writer.Close()
  if err != nil {
    fmt.Println(err)
    return
  }
`;
      payloadSetup = formWriterCode + `  payload := body`;
    } else if (bodyType === 'x-www-form-urlencoded' && bodyFormData) {
      imports = `import (
  "fmt"
  "strings"
  "net/url"
  "net/http"
  "io/ioutil"
)`;
      let urlValues = `  data := url.Values{}
`;
      bodyFormData.filter(f => f.enabled && f.key).forEach(f => {
        urlValues += `  data.Set("${f.key}", "${f.value.replace(/"/g, '\\"')}")\n`;
      });
      payloadSetup = urlValues + `  payload := strings.NewReader(data.Encode())`;
    } else if (bodyContent) {
      payloadSetup = `payload := strings.NewReader(\`${bodyContent.replace(/`/g, "\\`")}\`)`;
    }
  }

  const headerAdding = headers.filter(h => h.enabled && h.key).map(h => {
    if (bodyType === 'form-data' && h.key.toLowerCase() === 'content-type') {
      return `req.Header.Add("Content-Type", writer.FormDataContentType())`;
    }
    return `req.Header.Add("${h.key}", "${h.value}")`;
  });

  if (bodyType === 'form-data' && !headers.some(h => h.enabled && h.key.toLowerCase() === 'content-type')) {
    headerAdding.push(`req.Header.Add("Content-Type", writer.FormDataContentType())`);
  }

  return `package main

${imports}

func main() {

  url := "${finalUrl}"
  method := "${method}"

${payloadSetup ? '  ' + payloadSetup : ''}

  client := &http.Client {
  }
  req, err := http.NewRequest(method, url, payload)

  if err != nil {
    fmt.Println(err)
    return
  }
  ${headerAdding.join('\n  ')}

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

export function generateJavaOkHttp(config: RequestConfig): string {
  const { url, method, headers, params, bodyContent, bodyType, bodyFormData } = config;
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
      const qs = enabledParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
      finalUrl += (finalUrl.includes('?') ? '&' : '?') + qs;
    }
  }

  let bodyCode = 'RequestBody body = null;';
  if (method !== 'GET') {
    if (bodyType === 'form-data' && bodyFormData) {
      bodyCode = `MultipartBody.Builder builder = new MultipartBody.Builder().setType(MultipartBody.FORM);\n`;
      bodyFormData.filter(f => f.enabled && f.key).forEach(f => {
        if (f.type === 'file') {
          bodyCode += `builder.addFormDataPart("${f.key}", "${f.fileName || 'file.bin'}",\n`;
          bodyCode += `  RequestBody.create(MediaType.parse("application/octet-stream"),\n`;
          bodyCode += `  new File("${f.fileName || 'file.bin'}")));\n`;
        } else {
          bodyCode += `builder.addFormDataPart("${f.key}", "${f.value.replace(/"/g, '\\"')}");\n`;
        }
      });
      bodyCode += `RequestBody body = builder.build();`;
    } else if (bodyType === 'x-www-form-urlencoded' && bodyFormData) {
      bodyCode = `FormBody.Builder builder = new FormBody.Builder();\n`;
      bodyFormData.filter(f => f.enabled && f.key).forEach(f => {
        bodyCode += `builder.add("${f.key}", "${f.value.replace(/"/g, '\\"')}");\n`;
      });
      bodyCode += `RequestBody body = builder.build();`;
    } else if (bodyContent) {
      const isJson = headers.some(h => h.enabled && h.key.toLowerCase() === 'content-type' && h.value.includes('application/json'));
      const ct = isJson ? 'application/json' : 'text/plain';
      bodyCode = `MediaType mediaType = MediaType.parse("${ct}");\n`;
      bodyCode += `RequestBody body = RequestBody.create(mediaType, "${bodyContent.replace(/"/g, '\\"').replace(/\n/g, '\\n')}");`;
    } else {
      bodyCode = `RequestBody body = RequestBody.create(null, new byte[0]);`;
    }
  }

  let headerAdding = '';
  headers.filter(h => h.enabled && h.key).forEach(h => {
    headerAdding += `.addHeader("${h.key}", "${h.value}")\n`;
  });

  return `OkHttpClient client = new OkHttpClient().newBuilder().build();
${bodyCode}
Request request = new Request.Builder()
  .url("${finalUrl}")
  .method("${method}", body)
  ${headerAdding}  .build();
Response response = client.newCall(request).execute();`;
}

export function generatePhpCurl(config: RequestConfig): string {
  const { url, method, headers, params, bodyContent, bodyType, bodyFormData } = config;
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
      const qs = enabledParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
      finalUrl += (finalUrl.includes('?') ? '&' : '?') + qs;
    }
  }

  let phpHeaders = '[\n';
  headers.filter(h => h.enabled && h.key).forEach(h => {
    phpHeaders += `  '${h.key}: ${h.value}',\n`;
  });
  phpHeaders += ']';

  let bodySetup = '';
  if (method !== 'GET') {
    if (bodyType === 'form-data' && bodyFormData) {
      bodySetup = `$postFields = [\n`;
      bodyFormData.filter(f => f.enabled && f.key).forEach(f => {
        if (f.type === 'file') {
          bodySetup += `  '${f.key}' => new CURLFile('${f.fileName || 'file.bin'}'),\n`;
        } else {
          bodySetup += `  '${f.key}' => '${f.value.replace(/'/g, "\\'")}',\n`;
        }
      });
      bodySetup += '];';
    } else if (bodyType === 'x-www-form-urlencoded' && bodyFormData) {
      bodySetup = `$postFields = http_build_query([\n`;
      bodyFormData.filter(f => f.enabled && f.key).forEach(f => {
        bodySetup += `  '${f.key}' => '${f.value.replace(/'/g, "\\'")}',\n`;
      });
      bodySetup += ']);';
    } else if (bodyContent) {
      bodySetup = `$postFields = '${bodyContent.replace(/'/g, "\\'")}';`;
    }
  }

  return `<?php

$curl = curl_init();

curl_setopt_array($curl, [
  CURLOPT_URL => '${finalUrl}',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => '',
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 0,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => '${method}',
  ${bodySetup ? `CURLOPT_POSTFIELDS => $postFields,\n  ` : ''}CURLOPT_HTTPHEADER => ${phpHeaders.replace(/\n/g, '\n  ')},
]);

$response = curl_exec($curl);

curl_close($curl);
echo $response;`;
}

export function generateRubyNetHttp(config: RequestConfig): string {
  const { url, method, headers, params, bodyContent, bodyType, bodyFormData } = config;
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
      const qs = enabledParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
      finalUrl += (finalUrl.includes('?') ? '&' : '?') + qs;
    }
  }

  let bodySetup = '';
  if (method !== 'GET') {
    if (bodyType === 'form-data' && bodyFormData) {
      bodySetup = `request.set_form([\n`;
      bodyFormData.filter(f => f.enabled && f.key).forEach(f => {
        if (f.type === 'file') {
          bodySetup += `  ['${f.key}', File.open('${f.fileName || 'file.bin'}')],\n`;
        } else {
          bodySetup += `  ['${f.key}', '${f.value.replace(/'/g, "\\'")}'],\n`;
        }
      });
      bodySetup += '], \'multipart/form-data\')';
    } else if (bodyType === 'x-www-form-urlencoded' && bodyFormData) {
      bodySetup = `request.set_form_data({\n`;
      bodyFormData.filter(f => f.enabled && f.key).forEach(f => {
        bodySetup += `  '${f.key}' => '${f.value.replace(/'/g, "\\'")}',\n`;
      });
      bodySetup += '})';
    } else if (bodyContent) {
      bodySetup = `request.body = '${bodyContent.replace(/'/g, "\\'")}'`;
    }
  }

  let headerLines = '';
  headers.filter(h => h.enabled && h.key).forEach(h => {
    headerLines += `request["${h.key}"] = "${h.value}"\n`;
  });

  const uriSec = finalUrl.startsWith('https');

  return `require "uri"
require "net/http"

url = URI("${finalUrl}")

https = Net::HTTP.new(url.host, url.port)
${uriSec ? 'https.use_ssl = true' : ''}

request = Net::HTTP::${method.charAt(0).toUpperCase() + method.slice(1).toLowerCase()}.new(url)
${headerLines}${bodySetup}

response = https.request(request)
puts response.read_body`;
}

export function generateCsharpHttpClient(config: RequestConfig): string {
  const { url, method, headers, params, bodyContent, bodyType, bodyFormData } = config;
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
      const qs = enabledParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
      finalUrl += (finalUrl.includes('?') ? '&' : '?') + qs;
    }
  }

  let bodySetup = 'var content = new StringContent("", Encoding.UTF8, "text/plain");';
  if (method !== 'GET') {
    if (bodyType === 'form-data' && bodyFormData) {
      bodySetup = `var content = new MultipartFormDataContent();\n`;
      bodyFormData.filter(f => f.enabled && f.key).forEach(f => {
        if (f.type === 'file') {
          bodySetup += `content.Add(new StreamContent(File.OpenRead("${f.fileName || 'file.bin'}")), "${f.key}", "${f.fileName || 'file.bin'}");\n`;
        } else {
          bodySetup += `content.Add(new StringContent("${f.value.replace(/"/g, '\\"')}"), "${f.key}");\n`;
        }
      });
    } else if (bodyType === 'x-www-form-urlencoded' && bodyFormData) {
      bodySetup = `var content = new FormUrlEncodedContent(new[]\n{\n`;
      bodyFormData.filter(f => f.enabled && f.key).forEach(f => {
        bodySetup += `    new KeyValuePair<string, string>("${f.key}", "${f.value.replace(/"/g, '\\"')}"),\n`;
      });
      bodySetup += '});';
    } else if (bodyContent) {
      const isJson = headers.some(h => h.enabled && h.key.toLowerCase() === 'content-type' && h.value.includes('application/json'));
      const ct = isJson ? 'application/json' : 'text/plain';
      bodySetup = `var content = new StringContent("${bodyContent.replace(/"/g, '\\"').replace(/\n/g, '\\n')}", Encoding.UTF8, "${ct}");`;
    }
  }

  let clientHeaders = '';
  headers.filter(h => h.enabled && h.key).forEach(h => {
    if (h.key.toLowerCase() !== 'content-type') {
      clientHeaders += `request.Headers.Add("${h.key}", "${h.value}");\n`;
    }
  });

  return `var client = new HttpClient();
var request = new HttpRequestMessage(HttpMethod.${method.charAt(0).toUpperCase() + method.slice(1).toLowerCase()}, "${finalUrl}");
${clientHeaders}${method !== 'GET' ? `${bodySetup}\nrequest.Content = content;\n` : ''}var response = await client.SendAsync(request);
response.EnsureSuccessStatusCode();
Console.WriteLine(await response.Content.ReadAsStringAsync());`;
}

export function generateSwiftUrlSession(config: RequestConfig): string {
  const { url, method, headers, params, bodyContent, bodyType, bodyFormData } = config;
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
      const qs = enabledParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
      finalUrl += (finalUrl.includes('?') ? '&' : '?') + qs;
    }
  }

  let bodySetup = '';
  if (method !== 'GET') {
    if (bodyType === 'form-data' && bodyFormData) {
      bodySetup = `let boundary = "Boundary-\\(UUID().uuidString)"\n`;
      bodySetup += `request.setValue("multipart/form-data; boundary=\\(boundary)", forHTTPHeaderField: "Content-Type")\n`;
      bodySetup += `var body = Data()\n`;
      bodyFormData.filter(f => f.enabled && f.key).forEach(f => {
        bodySetup += `body.append("--\\(boundary)\\r\\n".data(using: .utf8)!)\n`;
        if (f.type === 'file') {
          bodySetup += `body.append("Content-Disposition: form-data; name=\\"${f.key}\\"; filename=\\"${f.fileName || 'file.bin'}\\"\\r\\n".data(using: .utf8)!)\n`;
          bodySetup += `body.append("Content-Type: application/octet-stream\\r\\n\\r\\n".data(using: .utf8)!)\n`;
          bodySetup += `body.append(try! Data(contentsOf: URL(fileURLWithPath: "${f.fileName || 'file.bin'}")))\n`;
        } else {
          bodySetup += `body.append("Content-Disposition: form-data; name=\\"${f.key}\\"\\r\\n\\r\\n".data(using: .utf8)!)\n`;
          bodySetup += `body.append("${f.value.replace(/"/g, '\\"')}\\r\\n".data(using: .utf8)!)\n`;
        }
      });
      bodySetup += `body.append("--\\(boundary)--\\r\\n".data(using: .utf8)!)\n`;
      bodySetup += `request.httpBody = body`;
    } else if (bodyType === 'x-www-form-urlencoded' && bodyFormData) {
      const parts = bodyFormData.filter(f => f.enabled && f.key).map(f => {
        return `"${f.key}=\\("${f.value.replace(/"/g, '\\"')}".addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")"`;
      });
      bodySetup += `let postData = [${parts.join(', ')}].joined(separator: "&").data(using: .utf8)\n`;
      bodySetup += `request.httpBody = postData`;
    } else if (bodyContent) {
      bodySetup = `let postData = "${bodyContent.replace(/"/g, '\\"').replace(/\n/g, '\\n')}".data(using: .utf8)\n`;
      bodySetup += `request.httpBody = postData`;
    }
  }

  let headerLines = '';
  headers.filter(h => h.enabled && h.key).forEach(h => {
    headerLines += `request.addValue("${h.value}", forHTTPHeaderField: "${h.key}")\n`;
  });

  return `import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

var request = URLRequest(url: URL(string: "${finalUrl}")!,timeoutInterval: Double.infinity)
request.httpMethod = "${method}"
${headerLines}${bodySetup}

let task = URLSession.shared.dataTask(with: request) { data, response, error in
  guard let data = data else {
    print(String(describing: error))
    return
  }
  print(String(data: data, encoding: .utf8)!)
}

task.resume()`;
}
