const fs = require('fs');

let types = fs.readFileSync('src/types.ts', 'utf8');

const runnerTypes = `
export interface ExecutedTestStep {
  id: string;
  iteration: number;
  requestId: string;
  requestName: string;
  method: string;
  url: string;
  statusCode: number;
  statusText: string;
  durationMs: number;
  sizeBytes: number;
  passed: boolean;
  tests: Array<{ name: string; passed: boolean; error?: string }>;
  requestInfo: { headers: Record<string, string>; body?: string };
  responseInfo: { headers: Record<string, string>; body?: string };
  logs: Array<{ type: string; message: string }>;
}

export interface CollectionRunReport {
  collectionId: string;
  collectionName: string;
  folderName?: string;
  startTime: string;
  totalExecutions: number;
  passedCount: number;
  failedCount: number;
  totalDurationMs: number;
  avgLatencyMs: number;
  passRate: number;
  steps: ExecutedTestStep[];
}
`;

if (!types.includes('ExecutedTestStep')) {
    types = types + '\n' + runnerTypes;
    fs.writeFileSync('src/types.ts', types, 'utf8');
    console.log("types.ts patched with runner types.");
} else {
    console.log("types.ts already has runner types.");
}
