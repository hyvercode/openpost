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
}

export interface ApiCollection {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  folders?: ApiFolder[];
  requests: RequestItem[];
}

export interface Environment {
  id: string;
  workspaceId: string;
  name: string;
  variables: KeyValue[];
}
