import { KeyValue } from '../types';
import { v4 as uuidv4 } from 'uuid';
import type { SandboxContext, SandboxResult, TestResult } from './sandbox';

/**
 * Isolated script runner (Web Worker).
 *
 * SECURITY: user-supplied Pre-request/Test scripts must NEVER run via
 * `new Function` in the app context (that gave them full access to
 * localStorage/auth tokens, IndexedDB, DOM and network). This runner
 * executes the script inside a dedicated Web Worker with NO DOM, NO
 * storage and NO network access — the worker only receives a JSON
 * snapshot (env vars, globals, response, request info) and returns a
 * JSON result. Execution is time-boxed (5s); infinite loops are killed
 * by terminating the worker.
 */

const WORKER_TIMEOUT_MS = 5000;

function buildWorkerSource(): string {
  // Self-contained worker: rebuilds the pm API from the snapshot.
  // No imports, no DOM, no fetch/XHR, no localStorage.
  return `
'use strict';
const snapshot = __SNAPSHOT__;

const currentVars = JSON.parse(JSON.stringify(snapshot.envVars || []));
let globals = Object.assign({}, snapshot.globals || {});
const modifiedHeaders = Object.assign({}, (snapshot.requestInfo && snapshot.requestInfo.headers) || {});
const testResults = [];
const logs = [];

function addLog(type, msg) {
  logs.push({ type, message: String(msg).slice(0, 2000) });
}

const pmEnvironment = {
  set: (key, value) => {
    const valToSet = (value !== null && typeof value === 'object') ? JSON.stringify(value) : String(value);
    const index = currentVars.findIndex(v => v.key === key);
    if (index !== -1) { currentVars[index] = Object.assign({}, currentVars[index], { value: valToSet }); }
    else { currentVars.push({ id: 'w-' + Math.random().toString(36).slice(2), key, value: valToSet, enabled: true }); }
    addLog('info', '[pm.environment] Set ' + key + ' = ' + valToSet);
  },
  get: (key) => {
    const v = currentVars.find(v => v.key === key && v.enabled !== false);
    return v ? v.value : undefined;
  },
  has: (key) => currentVars.some(v => v.key === key && v.enabled !== false),
  unset: (key) => {
    const idx = currentVars.findIndex(v => v.key === key);
    if (idx !== -1) { currentVars.splice(idx, 1); addLog('info', '[pm.environment] Unset ' + key); }
  },
  clear: () => { currentVars.length = 0; },
  toObject: () => {
    const obj = {};
    currentVars.forEach(v => { if (v.key && v.enabled !== false) obj[v.key] = v.value; });
    return obj;
  }
};

const pmGlobals = {
  set: (key, value) => {
    globals[key] = (value !== null && typeof value === 'object') ? JSON.stringify(value) : String(value);
  },
  get: (key) => globals[key],
  has: (key) => key in globals,
  unset: (key) => { delete globals[key]; },
  clear: () => { globals = {}; },
  toObject: () => Object.assign({}, globals)
};

const pmVariables = {
  set: (key, value) => pmEnvironment.set(key, value),
  get: (key) => {
    const envVal = pmEnvironment.get(key);
    return envVal !== undefined ? envVal : pmGlobals.get(key);
  }
};

const resData = snapshot.response || null;
const pmResponse = {
  json: () => {
    if (!resData) return null;
    if (typeof resData.data === 'object' && resData.data !== null) return resData.data;
    try { return JSON.parse(resData.data); } catch (e) { return resData.data; }
  },
  text: () => {
    if (!resData) return '';
    if (typeof resData.data === 'string') return resData.data;
    return JSON.stringify(resData.data);
  },
  code: (resData && resData.status) || 0,
  status: (resData && resData.statusText) || '',
  responseTime: (resData && resData.timeMs) || 0,
  time: (resData && resData.timeMs) || 0,
  responseSize: (resData && resData.size) || 0,
  headers: {
    get: (headerName) => {
      if (!resData || !resData.headers) return undefined;
      const key = Object.keys(resData.headers).find(k => k.toLowerCase() === String(headerName).toLowerCase());
      return key ? resData.headers[key] : undefined;
    },
    has: (headerName) => {
      if (!resData || !resData.headers) return false;
      return Object.keys(resData.headers).some(k => k.toLowerCase() === String(headerName).toLowerCase());
    }
  },
  to: {
    have: {
      status: (code) => {
        if (!resData || resData.status !== code) throw new Error('Expected response status to be ' + code + ', but got ' + (resData && resData.status));
      },
      header: (headerName, expectedVal) => {
        const val = pmResponse.headers.get(headerName);
        if (val === undefined) throw new Error("Expected response header '" + headerName + "' to exist");
        if (expectedVal !== undefined && val !== expectedVal) throw new Error("Expected response header '" + headerName + "' to equal '" + expectedVal + "', got '" + val + "'");
      }
    }
  }
};

function makeAssertion(val, isNot) {
  const check = (condition, failMsg) => {
    const pass = isNot ? !condition : condition;
    if (!pass) throw new Error(isNot ? ('Expected NOT (' + failMsg + ')') : failMsg);
  };
  const str = (v) => { try { return JSON.stringify(v); } catch (e) { return String(v); } };
  const target = {
    equal: (expected) => check(val === expected, 'Expected ' + str(val) + ' to equal ' + str(expected)),
    eql: (expected) => check(JSON.stringify(val) === JSON.stringify(expected), 'Expected ' + str(val) + ' to deep equal ' + str(expected)),
    a: (type) => {
      let actualType = typeof val;
      if (Array.isArray(val)) actualType = 'array';
      else if (val === null) actualType = 'null';
      check(actualType === String(type).toLowerCase(), 'Expected type to be ' + type + ', got ' + actualType);
    },
    oneOf: (arr) => check(Array.isArray(arr) && arr.includes(val), 'Expected ' + str(val) + ' to be one of ' + str(arr)),
    include: (item) => {
      if (typeof val === 'string' || Array.isArray(val)) check(val.includes(item), 'Expected ' + str(val) + ' to include ' + str(item));
      else if (typeof val === 'object' && val !== null) check(item in val, 'Expected object to include key ' + item);
      else check(false, 'Cannot use .include on type ' + typeof val);
    },
    below: (n) => check(typeof val === 'number' && val < n, 'Expected ' + val + ' to be below ' + n),
    above: (n) => check(typeof val === 'number' && val > n, 'Expected ' + val + ' to be above ' + n),
    property: (prop, expectedVal) => {
      const hasProp = typeof val === 'object' && val !== null && prop in val;
      check(hasProp, "Expected object to have property '" + prop + "'");
      if (expectedVal !== undefined && hasProp) check(val[prop] === expectedVal, "Expected property '" + prop + "' to equal " + str(expectedVal));
    },
    lengthOf: (len) => check(val && val.length === len, 'Expected length to be ' + len),
    true: check(val === true, 'Expected ' + str(val) + ' to be true'),
    false: check(val === false, 'Expected ' + str(val) + ' to be false'),
    null: check(val === null, 'Expected ' + str(val) + ' to be null'),
    undefined: check(val === undefined, 'Expected ' + str(val) + ' to be undefined'),
    ok: check(Boolean(val), 'Expected ' + str(val) + ' to be truthy'),
    empty: (() => {
      let isEmpty = false;
      if (!val) isEmpty = true;
      else if (Array.isArray(val) || typeof val === 'string') isEmpty = val.length === 0;
      else if (typeof val === 'object') isEmpty = Object.keys(val).length === 0;
      check(isEmpty, 'Expected ' + str(val) + ' to be empty');
    })
  };
  target.an = target.a;
  target.contain = target.include;
  target.at = {
    least: (n) => check(typeof val === 'number' && val >= n, 'Expected ' + val + ' to be at least ' + n),
    most: (n) => check(typeof val === 'number' && val <= n, 'Expected ' + val + ' to be at most ' + n)
  };
  return target;
}

const expectFunc = (val) => {
  const assertion = makeAssertion(val, false);
  const notAssertion = makeAssertion(val, true);
  return { to: Object.assign({}, assertion, { be: assertion, have: assertion, not: Object.assign({}, notAssertion, { be: notAssertion, have: notAssertion }) }) };
};

const pmObject = {
  environment: pmEnvironment,
  globals: pmGlobals,
  variables: pmVariables,
  collectionVariables: pmVariables,
  request: {
    url: (snapshot.requestInfo && snapshot.requestInfo.url) || '',
    method: (snapshot.requestInfo && snapshot.requestInfo.method) || 'GET',
    body: snapshot.requestInfo && snapshot.requestInfo.body,
    headers: {
      add: ({ key, value }) => { modifiedHeaders[key] = value; },
      get: (key) => modifiedHeaders[key],
      remove: (key) => { delete modifiedHeaders[key]; }
    }
  },
  response: pmResponse,
  test: (name, fn) => {
    try { fn(); testResults.push({ name, passed: true }); addLog('success', '[Test Passed] ' + name); }
    catch (e) { testResults.push({ name, passed: false, error: String((e && e.message) || e).slice(0, 500) }); addLog('error', '[Test Failed] ' + name + ': ' + String((e && e.message) || e).slice(0, 500)); }
  },
  expect: expectFunc
};

const customConsole = {
  log: (...args) => addLog('info', '[Sandbox Log] ' + args.map(a => { try { return typeof a === 'object' ? JSON.stringify(a) : String(a); } catch (e) { return String(a); } }).join(' ').slice(0, 2000)),
  info: (...args) => addLog('info', '[Sandbox Info] ' + args.map(String).join(' ').slice(0, 2000)),
  warn: (...args) => addLog('warn', '[Sandbox Warn] ' + args.map(String).join(' ').slice(0, 2000)),
  error: (...args) => addLog('error', '[Sandbox Error] ' + args.map(String).join(' ').slice(0, 2000))
};

try {
  const runner = new Function('pm', 'console', __SCRIPT__);
  runner(pmObject, customConsole);
  self.postMessage({ ok: true, envVars: currentVars, globals, testResults, logs, requestHeaders: modifiedHeaders });
} catch (e) {
  addLog('error', 'Script Execution Error: ' + String((e && e.message) || e).slice(0, 500));
  self.postMessage({ ok: false, envVars: currentVars, globals, testResults, logs, requestHeaders: modifiedHeaders });
}
`;
}

function readGlobalsSnapshot(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem('pm_globals') || '{}');
  } catch {
    return {};
  }
}

function writeGlobalsSnapshot(globals: Record<string, string>): void {
  try {
    localStorage.setItem('pm_globals', JSON.stringify(globals));
  } catch {
    // ignore quota errors
  }
}

export interface AsyncSandboxOptions {
  timeoutMs?: number;
}

/**
 * Run a user script in an isolated Web Worker. Drop-in async replacement
 * for runScriptSandbox (same SandboxContext in, same SandboxResult out).
 * Falls back to a hard error (never to in-context eval) when Workers are
 * unavailable.
 */
export function runScriptSandboxAsync(
  script: string,
  context: SandboxContext,
  opts?: AsyncSandboxOptions
): Promise<SandboxResult> {
  const empty: SandboxResult = {
    envVars: context.envVars,
    testResults: [],
    logs: [],
  };
  if (!script || !script.trim()) return Promise.resolve(empty);
  if (script.length > 100_000) {
    return Promise.resolve({
      ...empty,
      logs: [{ type: 'error', message: 'Script too large (max 100KB)' }],
    });
  }
  if (typeof Worker === 'undefined') {
    return Promise.resolve({
      ...empty,
      logs: [{ type: 'error', message: 'Web Workers unavailable — script execution refused for security.' }],
    });
  }

  const timeoutMs = opts?.timeoutMs ?? WORKER_TIMEOUT_MS;
  const snapshot = {
    envVars: context.envVars,
    globals: readGlobalsSnapshot(),
    response: context.response
      ? {
          data: context.response.data,
          status: context.response.status,
          statusText: context.response.statusText,
          timeMs: context.response.timeMs,
          size: context.response.size,
          headers: context.response.headers,
        }
      : null,
    requestInfo: context.requestInfo
      ? {
          url: context.requestInfo.url,
          method: context.requestInfo.method,
          headers: context.requestInfo.headers,
          body: context.requestInfo.body,
        }
      : null,
  };

  let source = buildWorkerSource();
  source = source.replace('__SNAPSHOT__', JSON.stringify(snapshot));
  source = source.replace('__SCRIPT__', JSON.stringify(script));

  return new Promise<SandboxResult>((resolve) => {
    let settled = false;
    const finish = (result: SandboxResult) => {
      if (settled) return;
      settled = true;
      try {
        worker.terminate();
      } catch {
        // ignore
      }
      clearTimeout(timer);
      // Persist globals on the main thread (worker has no storage access).
      if (result.logs) {
        for (const log of result.logs) {
          context.addConsoleLog?.(log.type === 'success' ? 'info' : log.type, log.message);
        }
      }
      resolve(result);
    };

    let worker: Worker;
    try {
      const blob = new Blob([source], { type: 'application/javascript' });
      worker = new Worker(URL.createObjectURL(blob));
    } catch {
      finish({
        ...empty,
        logs: [{ type: 'error', message: 'Failed to start isolated script worker.' }],
      });
      return;
    }

    const timer = setTimeout(() => {
      finish({
        ...empty,
        logs: [{ type: 'error', message: `Script execution timed out after ${timeoutMs}ms (terminated).` }],
      });
    }, timeoutMs);

    worker.onmessage = (ev: MessageEvent) => {
      const msg = ev.data || {};
      const envVars: KeyValue[] = Array.isArray(msg.envVars)
        ? msg.envVars
        : context.envVars;
      const testResults: TestResult[] = Array.isArray(msg.testResults)
        ? msg.testResults
        : [];
      const logs: SandboxResult['logs'] = Array.isArray(msg.logs) ? msg.logs : [];
      if (msg.globals && typeof msg.globals === 'object') {
        writeGlobalsSnapshot(msg.globals);
      }
      // Re-hydrate ids for newly created vars missing them.
      const hydrated = envVars.map((v) => (v.id ? v : { ...v, id: uuidv4() }));
      finish({
        envVars: hydrated,
        testResults,
        logs,
        requestHeaders: msg.requestHeaders,
      });
    };
    worker.onerror = () => {
      finish({
        ...empty,
        logs: [{ type: 'error', message: 'Isolated script worker failed to run the script.' }],
      });
    };
  });
}
