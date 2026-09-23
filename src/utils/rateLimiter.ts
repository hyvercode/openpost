export interface RateLimiterConfig {
  enabled: boolean;
  maxRequests: number;
  windowSeconds: number;
  mode: 'block' | 'simulate_429';
  preset?: 'strict' | 'standard' | 'burst' | 'relaxed' | 'custom';
}

export type RateLimiterPresetKey = 'strict' | 'standard' | 'burst' | 'relaxed';

export interface RateLimiterPreset {
  id: RateLimiterPresetKey;
  name: string;
  description: string;
  maxRequests: number;
  windowSeconds: number;
}

export const RATE_LIMITER_PRESETS: Record<RateLimiterPresetKey, RateLimiterPreset> = {
  strict: {
    id: 'strict',
    name: 'Strict API',
    description: '3 requests / 10s — Mimics tight third-party APIs (e.g. OpenAI tier 1, financial services)',
    maxRequests: 3,
    windowSeconds: 10
  },
  standard: {
    id: 'standard',
    name: 'Standard REST',
    description: '5 requests / 10s — Standard microservice & public API rate limit ceiling',
    maxRequests: 5,
    windowSeconds: 10
  },
  burst: {
    id: 'burst',
    name: 'Burst Guard',
    description: '2 requests / 3s — Prevents accidental double-clicks and rapid spamming',
    maxRequests: 2,
    windowSeconds: 3
  },
  relaxed: {
    id: 'relaxed',
    name: 'High Capacity',
    description: '20 requests / 30s — Allows burst workloads with periodic window resets',
    maxRequests: 20,
    windowSeconds: 30
  }
};

export const DEFAULT_RATE_LIMITER_CONFIG: RateLimiterConfig = {
  enabled: false,
  maxRequests: 5,
  windowSeconds: 10,
  mode: 'block',
  preset: 'standard'
};

const STORAGE_KEY = 'openpost_rate_limiter_config';

export function loadRateLimiterConfig(): RateLimiterConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_RATE_LIMITER_CONFIG, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Failed to load rate limiter config', e);
  }
  return DEFAULT_RATE_LIMITER_CONFIG;
}

export function saveRateLimiterConfig(config: RateLimiterConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save rate limiter config', e);
  }
}

export interface RateLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  maxRequests: number;
  remaining: number;
  resetInSeconds: number;
  msUntilReset: number;
  oldestTimestampInWindow: number | null;
}

export function checkRateLimit(
  requestTimestamps: number[],
  config: RateLimiterConfig,
  now = Date.now()
): RateLimitCheckResult {
  if (!config.enabled) {
    return {
      allowed: true,
      currentCount: 0,
      maxRequests: config.maxRequests,
      remaining: config.maxRequests,
      resetInSeconds: 0,
      msUntilReset: 0,
      oldestTimestampInWindow: null
    };
  }

  const windowMs = config.windowSeconds * 1000;
  const windowStart = now - windowMs;

  // Filter timestamps within current sliding window
  const activeTimestamps = requestTimestamps.filter(t => t > windowStart);
  const currentCount = activeTimestamps.length;
  const allowed = currentCount < config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - currentCount);

  let msUntilReset = 0;
  let oldestTimestampInWindow: number | null = null;
  if (activeTimestamps.length > 0) {
    const sorted = [...activeTimestamps].sort((a, b) => a - b);
    oldestTimestampInWindow = sorted[0];
    msUntilReset = Math.max(0, (sorted[0] + windowMs) - now);
  }

  const resetInSeconds = Math.ceil(msUntilReset / 1000);

  return {
    allowed,
    currentCount,
    maxRequests: config.maxRequests,
    remaining,
    resetInSeconds,
    msUntilReset,
    oldestTimestampInWindow
  };
}

export function generate429Response(
  config: RateLimiterConfig,
  resetInSeconds: number,
  _url?: string,
  _method?: string
) {
  const retryAfter = Math.max(1, resetInSeconds);
  const resetEpoch = Math.floor((Date.now() + retryAfter * 1000) / 1000);

  return {
    status: 429,
    statusText: 'Too Many Requests',
    timeMs: 8,
    size: '286 B',
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'retry-after': String(retryAfter),
      'x-ratelimit-limit': String(config.maxRequests),
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': String(resetEpoch),
      'x-ratelimit-window-seconds': String(config.windowSeconds),
      'x-rate-limiter': 'OpenPost Client Simulation'
    },
    data: {
      error: 'Too Many Requests',
      statusCode: 429,
      message: `Rate limit exceeded: You have sent too many requests in a short duration. Limit is ${config.maxRequests} requests per ${config.windowSeconds} seconds.`,
      rateLimitInfo: {
        limit: config.maxRequests,
        windowSeconds: config.windowSeconds,
        remaining: 0,
        retryAfterSeconds: retryAfter,
        resetAt: new Date(resetEpoch * 1000).toISOString()
      },
      simulated: true
    }
  };
}
