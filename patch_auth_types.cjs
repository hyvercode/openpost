const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf8');

const replacement = `
export interface RequestAuth {
  type: 'none' | 'bearer' | 'basic' | 'apikey' | 'oauth2' | 'awsv4' | 'digest' | 'hawk';
  bearer?: {
    token: string;
  };
  basic?: {
    username: string;
    password?: string;
  };
  apikey?: {
    key: string;
    value: string;
    addTo: 'header' | 'query';
  };
  oauth2?: {
    grantType: 'authorization_code' | 'client_credentials';
    authUrl: string;
    accessTokenUrl: string;
    clientId: string;
    clientSecret: string;
    scope: string;
    accessToken: string;
    refreshToken?: string;
  };
  awsv4?: {
    accessKey: string;
    secretKey: string;
    region: string;
    service: string;
    sessionToken?: string;
  };
  digest?: {
    username: string;
    password?: string;
    algorithm?: string;
  };
  hawk?: {
    authId: string;
    authKey: string;
    algorithm: 'sha256' | 'sha1';
    ext?: string;
  };
}
`;

content = content.replace(/export interface RequestAuth \{[\s\S]*?\}\n/, replacement.trim() + '\n');
fs.writeFileSync('src/types.ts', content);
