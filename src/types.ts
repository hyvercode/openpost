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
    type: "none" | "raw" | "form-data" | "x-www-form-urlencoded";
    content: string; // for raw
    formData?: KeyValue[]; // for form-data or x-www-form-urlencoded
  };
  mockResponse?: {
    status: number;
    headers: KeyValue[];
    body: string;
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
}

export interface Environment {
  id: string;
  workspaceId: string;
  name: string;
  variables: KeyValue[];
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
}

