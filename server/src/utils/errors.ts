import { Response } from 'express';

/** Standard API error body: stable `error` string plus optional debug `details`. */
export interface ApiErrorBody {
  error: string;
  details?: string;
  code?: string;
}

function causeMessage(cause: unknown): string | undefined {
  if (typeof cause === 'string') return cause || undefined;
  if (cause instanceof Error) return cause.message || undefined;
  if (cause && typeof cause === 'object' && 'message' in cause) {
    const m = String((cause as { message: unknown }).message || '');
    return m || undefined;
  }
  return undefined;
}

/**
 * Send a standard error response. The `error` field keeps the existing
 * stable message (clients match on it); the caught exception's message is
 * attached as `details` for debugging instead of being swallowed.
 */
export function sendError(
  res: Response,
  status: number,
  error: string,
  cause?: unknown,
  code?: string
): Response {
  const body: ApiErrorBody = { error };
  const details = causeMessage(cause);
  if (details) body.details = details;
  if (code) body.code = code;
  return res.status(status).json(body);
}
