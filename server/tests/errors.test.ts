import { describe, it, expect, vi } from 'vitest';
import { sendError } from '../src/utils/errors';

function mockRes() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  return { res: { status } as any, status, json };
}

describe('sendError', () => {
  it('emits error without details when no cause', () => {
    const { res, status, json } = mockRes();
    sendError(res, 404, 'Not found');
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ error: 'Not found' });
  });

  it('attaches Error message as details', () => {
    const { res, json } = mockRes();
    sendError(res, 500, 'Failed to fetch monitors', new Error('db down'));
    expect(json).toHaveBeenCalledWith({ error: 'Failed to fetch monitors', details: 'db down' });
  });

  it('omits empty details', () => {
    const { res, json } = mockRes();
    sendError(res, 500, 'Failed', new Error(''));
    expect(json).toHaveBeenCalledWith({ error: 'Failed' });
  });

  it('supports code', () => {
    const { res, json } = mockRes();
    sendError(res, 400, 'Bad', undefined, 'VALIDATION');
    expect(json).toHaveBeenCalledWith({ error: 'Bad', code: 'VALIDATION' });
  });
});
