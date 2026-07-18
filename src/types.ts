export type Theme = 'default' | 'light' | 'dark';

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  members: string[]; // array of user UIDs
}

export interface KeyValue {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface ApiFolder {
  id: string;
  name: string;
  parentId?: string | null;
  position?: number;
}

export interface RequestAuth {
  type: 'none' | 'bearer' | 'basic' | 'apikey' | 'oauth2';
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
}

export interface RequestItem {
  id: string;
  collectionId: string;
  workspaceId: string;
  name: string;
  method: string;
  url: string;
  headers: KeyValue[];
  params: KeyValue[];
  folderId?: string | null;
  body: {
    type: "none" | "raw" | "form-data" | "x-www-form-urlencoded" | "graphql";
    content: string; // for raw or graphql query
    variables?: string; // for graphql variables
    formData?: KeyValue[]; // for form-data or x-www-form-urlencoded
  };
  mockResponse?: {
    status: number;
    headers: KeyValue[];
    body: string;
  };
  preRequestScript?: string;
  postResponseScript?: string;
  auth?: RequestAuth;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export interface MockConfig {
  enabled: boolean;
  rateLimit: {
    enabled: boolean;
    requestsPerMinute: number;
  };
  apiKey?: {
    enabled: boolean;
    key: string;
  };
}

export interface ApiCollection {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  folders?: ApiFolder[];
  requests: RequestItem[];
  color?: string;
  icon?: string;
  mockConfig?: MockConfig;
  position?: number;
}

export interface Environment {
  id: string;
  workspaceId: string;
  name: string;
  variables: KeyValue[];
  position?: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'warn' | 'error' | 'success';
  message: string;
  method?: string;
  url?: string;
  status?: number;
  timeMs?: number;
  size?: number;
  timings?: {
    dns?: number;
    tcp?: number;
    request?: number;
    response?: number;
    total: number;
  };
  details?: {
    request?: {
      url: string;
      method: string;
      headers: any;
      body?: any;
    };
    response?: {
      status: number;
      statusText: string;
      headers: any;
      data: any;
    };
  };
}

export interface IssueItem {
  id: string;
  type: 'error' | 'warning';
  title: string;
  description: string;
  timestamp: string;
  url?: string;
  method?: string;
  suggestion?: string;
}

export interface Deployment {
  id: string;
  workspaceId: string;
  collectionId: string;
  collectionName: string;
  version: string;
  createdAt: string;
  requests: RequestItem[];
  mockConfig?: MockConfig;
}

export interface HistoryItem {
  id: string;
  workspaceId: string;
  name: string;
  method: string;
  url: string;
  headers: KeyValue[];
  params: KeyValue[];
  body: {
    type: "none" | "raw" | "form-data" | "x-www-form-urlencoded";
    content: string;
    formData?: KeyValue[];
  };
  auth?: RequestAuth;
  timestamp: string;
  responseStatus?: number;
  responseStatusText?: string;
  timeMs?: number;
}

export interface TestAssertion {
  id: string;
  type: 'status_code' | 'body_contains' | 'body_equals' | 'header_exists' | 'response_time_less_than';
  expectedValue: string;
}

export interface TestCase {
  id: string;
  requestId: string;
  name: string;
  assertions: TestAssertion[];
}

export interface TestSuite {
  id: string;
  workspaceId: string;
  name: string;
  testCases: TestCase[];
}



export interface ProxyConfig {
  enabled: boolean;
  url: string;
  protocol: 'http' | 'https' | 'socks5';
  useAuth: boolean;
  username?: string;
  password?: string;
}

export interface WsMessage {
  id: string;
  type: 'sent' | 'received' | 'info' | 'error';
  data: string;
  timestamp: number;
}
