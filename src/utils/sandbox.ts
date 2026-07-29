import { KeyValue } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface SandboxContext {
  envVars: KeyValue[];
  response?: {
    data: any;
    status: number;
    statusText: string;
    timeMs?: number;
    size?: number;
    headers?: Record<string, string>;
  };
  requestInfo?: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: any;
  };
  addConsoleLog?: (type: 'info' | 'success' | 'warn' | 'error', msg: string) => void;
}

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export interface SandboxResult {
  envVars: KeyValue[];
  testResults: TestResult[];
  logs: Array<{ type: 'info' | 'success' | 'warn' | 'error'; message: string }>;
  requestHeaders?: Record<string, string>;
}

export function runScriptSandbox(script: string, context: SandboxContext): SandboxResult {
  if (!script || !script.trim()) {
    return {
      envVars: context.envVars,
      testResults: [],
      logs: []
    };
  }

  const currentVars = [...context.envVars];
  const testResults: TestResult[] = [];
  const logs: Array<{ type: 'info' | 'success' | 'warn' | 'error'; message: string }> = [];
  const modifiedHeaders: Record<string, string> = { ...(context.requestInfo?.headers || {}) };

  const addLog = (type: 'info' | 'success' | 'warn' | 'error', msg: string) => {
    logs.push({ type, message: msg });
    if (context.addConsoleLog) {
      context.addConsoleLog(type, msg);
    }
  };

  // Build pm.environment
  const pmEnvironment = {
    set: (key: string, value: any) => {
      const valToSet = (value !== null && typeof value === 'object') ? JSON.stringify(value) : String(value);
      const index = currentVars.findIndex(v => v.key === key);
      if (index !== -1) {
        currentVars[index] = { ...currentVars[index], value: valToSet };
      } else {
        currentVars.push({ id: uuidv4(), key, value: valToSet, enabled: true });
      }
      addLog('info', `[pm.environment] Set ${key} = ${valToSet}`);
    },
    get: (key: string) => {
      const v = currentVars.find(v => v.key === key && v.enabled !== false);
      return v ? v.value : undefined;
    },
    has: (key: string) => {
      return currentVars.some(v => v.key === key && v.enabled !== false);
    },
    unset: (key: string) => {
      const idx = currentVars.findIndex(v => v.key === key);
      if (idx !== -1) {
        currentVars.splice(idx, 1);
        addLog('info', `[pm.environment] Unset ${key}`);
      }
    },
    clear: () => {
      currentVars.length = 0;
      addLog('info', `[pm.environment] Cleared variables`);
    },
    toObject: () => {
      const obj: Record<string, string> = {};
      currentVars.forEach(v => {
        if (v.key && v.enabled !== false) obj[v.key] = v.value;
      });
      return obj;
    }
  };

  // Build pm.globals
  const getGlobalsStorage = (): Record<string, string> => {
    try {
      return JSON.parse(localStorage.getItem('pm_globals') || '{}');
    } catch {
      return {};
    }
  };
  const setGlobalsStorage = (obj: Record<string, string>) => {
    try {
      localStorage.setItem('pm_globals', JSON.stringify(obj));
    } catch {}
  };

  const pmGlobals = {
    set: (key: string, value: any) => {
      const globals = getGlobalsStorage();
      const valToSet = (value !== null && typeof value === 'object') ? JSON.stringify(value) : String(value);
      globals[key] = valToSet;
      setGlobalsStorage(globals);
      addLog('info', `[pm.globals] Set ${key} = ${valToSet}`);
    },
    get: (key: string) => {
      const globals = getGlobalsStorage();
      return globals[key];
    },
    has: (key: string) => {
      const globals = getGlobalsStorage();
      return key in globals;
    },
    unset: (key: string) => {
      const globals = getGlobalsStorage();
      delete globals[key];
      setGlobalsStorage(globals);
      addLog('info', `[pm.globals] Unset ${key}`);
    },
    clear: () => {
      setGlobalsStorage({});
      addLog('info', `[pm.globals] Cleared globals`);
    },
    toObject: () => getGlobalsStorage()
  };

  // Build pm.variables
  const pmVariables = {
    set: (key: string, value: any) => pmEnvironment.set(key, value),
    get: (key: string) => {
      const envVal = pmEnvironment.get(key);
      if (envVal !== undefined) return envVal;
      return pmGlobals.get(key);
    }
  };

  // Response object helper
  const resData = context.response;
  const pmResponse = {
    json: () => {
      if (!resData) return null;
      if (typeof resData.data === 'object' && resData.data !== null) return resData.data;
      try {
        return JSON.parse(resData.data);
      } catch {
        return resData.data;
      }
    },
    text: () => {
      if (!resData) return '';
      if (typeof resData.data === 'string') return resData.data;
      return JSON.stringify(resData.data);
    },
    code: resData?.status || 0,
    status: resData?.statusText || (resData?.status === 200 ? 'OK' : String(resData?.status || 0)),
    statusText: resData?.statusText || '',
    responseTime: resData?.timeMs || 0,
    time: resData?.timeMs || 0,
    responseSize: resData?.size || 0,
    headers: {
      get: (headerName: string) => {
        if (!resData?.headers) return undefined;
        const key = Object.keys(resData.headers).find(k => k.toLowerCase() === headerName.toLowerCase());
        return key ? resData.headers[key] : undefined;
      },
      has: (headerName: string) => {
        if (!resData?.headers) return false;
        return Object.keys(resData.headers).some(k => k.toLowerCase() === headerName.toLowerCase());
      }
    },
    to: {
      have: {
        status: (code: number) => {
          if (resData?.status !== code) {
            throw new Error(`Expected response status to be ${code}, but got ${resData?.status}`);
          }
        },
        header: (headerName: string, expectedVal?: string) => {
          const val = pmResponse.headers.get(headerName);
          if (val === undefined) {
            throw new Error(`Expected response header '${headerName}' to exist`);
          }
          if (expectedVal !== undefined && val !== expectedVal) {
            throw new Error(`Expected response header '${headerName}' to equal '${expectedVal}', got '${val}'`);
          }
        }
      }
    }
  };

  // Expect BDD syntax engine
  const createAssertion = (val: any, isNot = false) => {
    const check = (condition: boolean, failMsg: string) => {
      const pass = isNot ? !condition : condition;
      if (!pass) {
        throw new Error(isNot ? `Expected NOT (${failMsg})` : failMsg);
      }
    };

    const target = {
      equal: (expected: any) => check(val === expected, `Expected ${JSON.stringify(val)} to equal ${JSON.stringify(expected)}`),
      eql: (expected: any) => check(JSON.stringify(val) === JSON.stringify(expected), `Expected ${JSON.stringify(val)} to deep equal ${JSON.stringify(expected)}`),
      a: (type: string) => {
        let actualType: string = typeof val;
        if (Array.isArray(val)) actualType = 'array';
        else if (val === null) actualType = 'null';
        check(actualType === type.toLowerCase(), `Expected type to be ${type}, got ${actualType}`);
      },
      an: (type: string) => target.a(type),
      oneOf: (arr: any[]) => check(Array.isArray(arr) && arr.includes(val), `Expected ${JSON.stringify(val)} to be one of ${JSON.stringify(arr)}`),
      include: (item: any) => {
        if (typeof val === 'string' || Array.isArray(val)) {
          check(val.includes(item), `Expected ${JSON.stringify(val)} to include ${JSON.stringify(item)}`);
        } else if (typeof val === 'object' && val !== null) {
          check(item in val, `Expected object to include key ${item}`);
        } else {
          check(false, `Cannot use .include on type ${typeof val}`);
        }
      },
      contain: (item: any) => target.include(item),
      below: (n: number) => check(typeof val === 'number' && val < n, `Expected ${val} to be below ${n}`),
      above: (n: number) => check(typeof val === 'number' && val > n, `Expected ${val} to be above ${n}`),
      at: {
        least: (n: number) => check(typeof val === 'number' && val >= n, `Expected ${val} to be at least ${n}`),
        most: (n: number) => check(typeof val === 'number' && val <= n, `Expected ${val} to be at most ${n}`)
      },
      property: (prop: string, expectedVal?: any) => {
        const hasProp = typeof val === 'object' && val !== null && prop in val;
        check(hasProp, `Expected object to have property '${prop}'`);
        if (expectedVal !== undefined && hasProp) {
          check(val[prop] === expectedVal, `Expected property '${prop}' to equal ${JSON.stringify(expectedVal)}, got ${JSON.stringify(val[prop])}`);
        }
      },
      lengthOf: (len: number) => {
        const actualLen = val?.length;
        check(actualLen === len, `Expected length to be ${len}, got ${actualLen}`);
      },
      true: check(val === true, `Expected ${val} to be true`),
      false: check(val === false, `Expected ${val} to be false`),
      null: check(val === null, `Expected ${val} to be null`),
      undefined: check(val === undefined, `Expected ${val} to be undefined`),
      ok: check(Boolean(val), `Expected ${val} to be truthy`),
      empty: (() => {
        let isEmpty = false;
        if (!val) isEmpty = true;
        else if (Array.isArray(val) || typeof val === 'string') isEmpty = val.length === 0;
        else if (typeof val === 'object') isEmpty = Object.keys(val).length === 0;
        check(isEmpty, `Expected ${JSON.stringify(val)} to be empty`);
      })
    };

    return target;
  };

  const expectFunc = (val: any) => {
    const assertion = createAssertion(val, false);
    const notAssertion = createAssertion(val, true);
    return {
      to: {
        ...assertion,
        be: assertion,
        have: assertion,
        not: {
          ...notAssertion,
          be: notAssertion,
          have: notAssertion
        }
      }
    };
  };

  const pmObject = {
    environment: pmEnvironment,
    globals: pmGlobals,
    variables: pmVariables,
    collectionVariables: pmVariables,
    request: {
      url: context.requestInfo?.url || '',
      method: context.requestInfo?.method || 'GET',
      body: context.requestInfo?.body,
      headers: {
        add: ({ key, value }: { key: string; value: string }) => {
          modifiedHeaders[key] = value;
          addLog('info', `[pm.request.headers] Added ${key} = ${value}`);
        },
        get: (key: string) => modifiedHeaders[key],
        remove: (key: string) => {
          delete modifiedHeaders[key];
        }
      }
    },
    response: pmResponse,
    test: (name: string, fn: () => void) => {
      try {
        fn();
        testResults.push({ name, passed: true });
        addLog('success', `✓ [Test Passed] ${name}`);
      } catch (e: any) {
        testResults.push({ name, passed: false, error: e.message });
        addLog('error', `✗ [Test Failed] ${name}: ${e.message}`);
      }
    },
    expect: expectFunc
  };

  try {
    const customConsole = {
      log: (...args: any[]) => addLog('info', `[Sandbox Log] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`),
      info: (...args: any[]) => addLog('info', `[Sandbox Info] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`),
      warn: (...args: any[]) => addLog('warn', `[Sandbox Warn] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`),
      error: (...args: any[]) => addLog('error', `[Sandbox Error] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`)
    };

    const sandboxFunc = new Function('pm', 'console', script);
    sandboxFunc(pmObject, customConsole);
  } catch (e: any) {
    addLog('error', `Script Execution Error: ${e.message}`);
  }

  return {
    envVars: currentVars,
    testResults,
    logs,
    requestHeaders: modifiedHeaders
  };
}
