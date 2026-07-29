const fs = require('fs');
let content = fs.readFileSync('src/components/RequestPanel.tsx', 'utf8');

const authHeaderLogic = `
      } else if (authConfig.type === 'awsv4' && authConfig.awsv4?.accessKey) {
        // Advanced auth: Add mock signature for preview
        const accessKey = replaceEnvironmentVariables(authConfig.awsv4.accessKey, processedEnvVars);
        const region = replaceEnvironmentVariables(authConfig.awsv4.region || 'us-east-1', processedEnvVars);
        const service = replaceEnvironmentVariables(authConfig.awsv4.service || 'execute-api', processedEnvVars);
        const date = new Date().toISOString().replace(/[:-]|\\.\\d{3}/g, '');
        const shortDate = date.substring(0, 8);
        finalHeaders['Authorization'] = \`AWS4-HMAC-SHA256 Credential=\${accessKey}/\${shortDate}/\${region}/\${service}/aws4_request, SignedHeaders=host;x-amz-date, Signature=mock_signature_for_preview\`;
        finalHeaders['X-Amz-Date'] = date;
        if (authConfig.awsv4.sessionToken) {
          finalHeaders['X-Amz-Security-Token'] = replaceEnvironmentVariables(authConfig.awsv4.sessionToken, processedEnvVars);
        }
      } else if (authConfig.type === 'digest' && authConfig.digest?.username) {
        const username = replaceEnvironmentVariables(authConfig.digest.username, processedEnvVars);
        const algorithm = authConfig.digest.algorithm || 'MD5';
        finalHeaders['Authorization'] = \`Digest username="\${username}", realm="mock_realm", nonce="mock_nonce", uri="\${new URL(finalUrl).pathname}", response="mock_response", opaque="mock_opaque", qop=auth, nc=00000001, cnonce="mock_cnonce", algorithm=\${algorithm}\`;
      } else if (authConfig.type === 'hawk' && authConfig.hawk?.authId) {
        const authId = replaceEnvironmentVariables(authConfig.hawk.authId, processedEnvVars);
        const ts = Math.floor(Date.now() / 1000);
        const nonce = Math.random().toString(36).substring(2, 8);
        const ext = authConfig.hawk.ext ? \`, ext="\${replaceEnvironmentVariables(authConfig.hawk.ext, processedEnvVars)}"\` : '';
        finalHeaders['Authorization'] = \`Hawk id="\${authId}", ts="\${ts}", nonce="\${nonce}", mac="mock_mac"\${ext}\`;
      }
`;

content = content.replace(
  /      \} else if \(authConfig\.type === 'oauth2' && authConfig\.oauth2\?\.accessToken\) \{\n        const token = replaceEnvironmentVariables\(authConfig\.oauth2\.accessToken, processedEnvVars\);\n        finalHeaders\['Authorization'\] = \`Bearer \$\{token\}\`;\n      \}/,
  match => match + authHeaderLogic
);

fs.writeFileSync('src/components/RequestPanel.tsx', content);
console.log('done headers patch');
