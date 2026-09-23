const fs = require('fs');
let content = fs.readFileSync('src/components/RequestPanel.tsx', 'utf8');

const authPillRegex = /\{authConfig\.type === 'none' \? 'No Auth Active' : \n                     authConfig\.type === 'bearer' \? 'Bearer Token' :\n                     authConfig\.type === 'basic' \? 'Basic Credentials' :\n                     authConfig\.type === 'apikey' \? 'API Key Integration' : 'OAuth 2\.0 \(Flow\)'\}/;

const authPillReplacement = `{authConfig.type === 'none' ? 'No Auth Active' : 
                     authConfig.type === 'bearer' ? 'Bearer Token' :
                     authConfig.type === 'basic' ? 'Basic Credentials' :
                     authConfig.type === 'apikey' ? 'API Key Integration' :
                     authConfig.type === 'awsv4' ? 'AWS Signature V4' :
                     authConfig.type === 'digest' ? 'Digest Auth' :
                     authConfig.type === 'hawk' ? 'Hawk Authentication' :
                     'OAuth 2.0 (Flow)'}`;

content = content.replace(authPillRegex, authPillReplacement);

const authDescRegex = /\{authConfig\.type === 'oauth2' && \`OAuth 2\.0 token flow active\. Active token: \$\{authConfig\.oauth2\?\.accessToken \? authConfig\.oauth2\.accessToken\.slice\(0, 15\) \+ '\.\.\.' : 'None'\}\`\}/;
const authDescReplacement = `{authConfig.type === 'oauth2' && \`OAuth 2.0 token flow active. Active token: \${authConfig.oauth2?.accessToken ? authConfig.oauth2.accessToken.slice(0, 15) + '...' : 'None'}\`}
                  {authConfig.type === 'awsv4' && \`AWS Signature active for service "\${authConfig.awsv4?.service}" in region "\${authConfig.awsv4?.region}".\`}
                  {authConfig.type === 'digest' && \`Digest Auth active for user "\${authConfig.digest?.username}". Algorithm: \${authConfig.digest?.algorithm}.\`}
                  {authConfig.type === 'hawk' && \`Hawk Authentication active. Auth ID: \${authConfig.hawk?.authId}.\`}`;

content = content.replace(authDescRegex, authDescReplacement);

fs.writeFileSync('src/components/RequestPanel.tsx', content);
console.log('done requestpanel');
