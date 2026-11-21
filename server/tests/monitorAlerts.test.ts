import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  axiosGet: vi.fn(),
  findMonitor: vi.fn(),
  findCollection: vi.fn(),
  updateMonitor: vi.fn(),
  createRun: vi.fn(),
  findRuns: vi.fn(),
  deleteRuns: vi.fn(),
  auditCreate: vi.fn(),
  sendMonitorAlert: vi.fn(),
}));

vi.mock('axios', () => ({
  default: { get: mocks.axiosGet, post: vi.fn() },
}));

vi.mock('../src/services/ssrf', () => ({
  assertUrlSafe: vi.fn(async (url: string) => ({
    urlObj: new URL(url),
    targetIp: '127.0.0.1',
  })),
  createPinnedLookup: vi.fn(() => undefined),
}));

vi.mock('../src/services/email.service', () => ({
  EmailService: class {
    sendMonitorAlert = mocks.sendMonitorAlert;
  },
}));

vi.mock('../src/db', () => ({
  prisma: {
    monitor: {
      findUnique: mocks.findMonitor,
      update: mocks.updateMonitor,
    },
    collection: { findUnique: mocks.findCollection },
    monitorRun: {
      create: mocks.createRun,
      findMany: mocks.findRuns,
      deleteMany: mocks.deleteRuns,
    },
    auditLog: { create: mocks.auditCreate },
  },
}));

import { MonitorService } from '../src/services/monitor.service';

const baseMonitor = {
  id: 'm1',
  workspaceId: 'ws1',
  collectionId: 'c1',
  name: 'Site',
  enabled: true,
  failThreshold: 2,
  consecutiveFailures: 0,
  lastStatus: 'up',
  alertEmail: 'ops@example.com',
  slackWebhookUrl: null,
};

function collectionWith(url = 'https://example.com') {
  return {
    id: 'c1',
    workspaceId: 'ws1',
    deletedAt: null,
    requests: JSON.stringify([{ method: 'GET', url, headers: [] }]),
  };
}

describe('MonitorService runMonitor resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findRuns.mockResolvedValue([]);
    mocks.auditCreate.mockResolvedValue({});
    mocks.sendMonitorAlert.mockResolvedValue({});
  });

  it('retries transient network errors and succeeds', async () => {
    mocks.findMonitor.mockResolvedValue({ ...baseMonitor });
    mocks.findCollection.mockResolvedValue(collectionWith());
    mocks.axiosGet
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce({ status: 200, data: 'ok' });
    const svc = new MonitorService();
    const res = await svc.runMonitor('m1');
    expect(res.status).toBe('up');
    expect(res.failed).toBe(0);
    expect(mocks.axiosGet).toHaveBeenCalledTimes(2);
  });

  it('fails after exhausting retries', async () => {
    mocks.findMonitor.mockResolvedValue({ ...baseMonitor });
    mocks.findCollection.mockResolvedValue(collectionWith());
    mocks.axiosGet.mockRejectedValue(new Error('down'));
    const svc = new MonitorService();
    const res = await svc.runMonitor('m1');
    expect(res.status).toBe('down');
    expect(res.failed).toBe(1);
    expect(mocks.axiosGet).toHaveBeenCalledTimes(3);
  });

  it('does not retry HTTP 500 statuses', async () => {
    mocks.findMonitor.mockResolvedValue({ ...baseMonitor });
    mocks.findCollection.mockResolvedValue(collectionWith());
    mocks.axiosGet.mockResolvedValue({ status: 500, data: 'err' });
    const svc = new MonitorService();
    await svc.runMonitor('m1');
    expect(mocks.axiosGet).toHaveBeenCalledTimes(1);
  });

  it('sends DOWN alert on threshold transition', async () => {
    mocks.findMonitor.mockResolvedValue({ ...baseMonitor, consecutiveFailures: 1 });
    mocks.findCollection.mockResolvedValue(collectionWith());
    mocks.axiosGet.mockResolvedValue({ status: 500, data: 'err' });
    const svc = new MonitorService();
    await svc.runMonitor('m1');
    expect(mocks.sendMonitorAlert).toHaveBeenCalledTimes(1);
    expect(mocks.sendMonitorAlert.mock.calls[0][1]).toMatch(/DOWN/);
  });

  it('sends RECOVERY alert when back up after alerted outage', async () => {
    mocks.findMonitor.mockResolvedValue({ ...baseMonitor, consecutiveFailures: 3, lastStatus: 'down' });
    mocks.findCollection.mockResolvedValue(collectionWith());
    mocks.axiosGet.mockResolvedValue({ status: 200, data: 'ok' });
    const svc = new MonitorService();
    const res = await svc.runMonitor('m1');
    expect(res.status).toBe('up');
    expect(mocks.sendMonitorAlert).toHaveBeenCalledTimes(1);
    expect(mocks.sendMonitorAlert.mock.calls[0][1]).toMatch(/RECOVERED/);
  });

  it('sends no alert on plain success', async () => {
    mocks.findMonitor.mockResolvedValue({ ...baseMonitor });
    mocks.findCollection.mockResolvedValue(collectionWith());
    mocks.axiosGet.mockResolvedValue({ status: 200, data: 'ok' });
    const svc = new MonitorService();
    await svc.runMonitor('m1');
    expect(mocks.sendMonitorAlert).not.toHaveBeenCalled();
  });
});
