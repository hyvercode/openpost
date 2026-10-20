/**
 * One-shot in-place encryption of secret-bearing columns.
 *
 * Encrypts, where still plaintext, the stored JSON of:
 *   Environment.variables, Workflow.variables,
 *   Collection.requests, CollectionVersion.requests, Deployment.requests,
 *   WorkflowRun.logs / detail, MonitorRun.detail
 *
 * IDEMPOTENT — values already in `enc:v1:` form are skipped, so it is safe
 * to run repeatedly (and alongside normal traffic; a row written after this
 * script starts is already encrypted by the server and simply skipped).
 *
 * Usage:
 *   # dev (reads .env, dev key fallback)
 *   npx tsx scripts/encrypt-secrets-in-place.ts
 *   # production (reads .env.production when NODE_ENV=production; requires ENCRYPTION_KEY)
 *   NODE_ENV=production npx tsx scripts/encrypt-secrets-in-place.ts
 */
import '../server/src/env';
import { prisma } from '../server/src/db';
import { encField, isEncrypted } from '../server/src/utils/secretCrypto';

interface Job {
  label: string;
  all: () => Promise<Array<{ id: string; value: any }>>;
  write: (id: string, value: any) => Promise<void>;
}

const jobs: Job[] = [
  {
    label: 'Environment.variables',
    all: async () => prisma.environment.findMany({ select: { id: true, variables: true } }).then((rows) => rows.map((r) => ({ id: r.id, value: r.variables }))),
    write: (id, variables) => prisma.environment.update({ where: { id }, data: { variables } as any }),
  },
  {
    label: 'Workflow.variables',
    all: async () => (prisma as any).workflow.findMany({ select: { id: true, variables: true } }).then((rows: any[]) => rows.map((r) => ({ id: r.id, value: r.variables }))),
    write: (id, variables) => (prisma as any).workflow.update({ where: { id }, data: { variables } }),
  },
  {
    label: 'Collection.requests',
    all: async () => prisma.collection.findMany({ select: { id: true, requests: true } }).then((rows) => rows.map((r) => ({ id: r.id, value: r.requests }))),
    write: (id, requests) => prisma.collection.update({ where: { id }, data: { requests } as any }),
  },
  {
    label: 'CollectionVersion.requests',
    all: async () => (prisma as any).collectionVersion.findMany({ select: { id: true, requests: true } }).then((rows: any[]) => rows.map((r) => ({ id: r.id, value: r.requests }))),
    write: (id, requests) => (prisma as any).collectionVersion.update({ where: { id }, data: { requests } }),
  },
  {
    label: 'Deployment.requests',
    all: async () => prisma.deployment.findMany({ select: { id: true, requests: true } }).then((rows) => rows.map((r) => ({ id: r.id, value: r.requests }))),
    write: (id, requests) => prisma.deployment.update({ where: { id }, data: { requests } as any }),
  },
  {
    label: 'WorkflowRun.logs',
    all: async () => (prisma as any).workflowRun.findMany({ where: { logs: { not: null } }, select: { id: true, logs: true } }).then((rows: any[]) => rows.map((r) => ({ id: r.id, value: r.logs }))),
    write: (id, logs) => (prisma as any).workflowRun.update({ where: { id }, data: { logs } }),
  },
  {
    label: 'WorkflowRun.detail',
    all: async () => (prisma as any).workflowRun.findMany({ where: { detail: { not: null } }, select: { id: true, detail: true } }).then((rows: any[]) => rows.map((r) => ({ id: r.id, value: r.detail }))),
    write: (id, detail) => (prisma as any).workflowRun.update({ where: { id }, data: { detail } }),
  },
  {
    label: 'MonitorRun.detail',
    all: async () => (prisma as any).monitorRun.findMany({ where: { detail: { not: null } }, select: { id: true, detail: true } }).then((rows: any[]) => rows.map((r) => ({ id: r.id, value: r.detail }))),
    write: (id, detail) => (prisma as any).monitorRun.update({ where: { id }, data: { detail } }),
  },
];

async function main(): Promise<void> {
  let totalEncrypted = 0;
  let totalSkipped = 0;

  for (const job of jobs) {
    let rows: Array<{ id: string; value: any }> = [];
    try {
      rows = await job.all();
    } catch (err: any) {
      console.error(`[enc] ${job.label}: read failed — ${err?.message || err}`);
      continue;
    }
    let encrypted = 0;
    let skipped = 0;
    for (const row of rows) {
      const value = row.value;
      if (value == null || value === '' || isEncrypted(value)) {
        skipped++;
        continue;
      }
      const next = encField(value);
      try {
        await job.write(row.id, next);
        encrypted++;
      } catch (err: any) {
        console.error(`[enc] ${job.label}: update failed for id=${row.id} — ${err?.message || err}`);
      }
    }
    totalEncrypted += encrypted;
    totalSkipped += skipped;
    console.log(`[enc] ${job.label}: ${encrypted} encrypted, ${skipped} already-encrypted/empty (${rows.length} rows)`);
  }

  console.log(`[enc] done: ${totalEncrypted} values encrypted, ${totalSkipped} skipped.`);
}

main()
  .catch((err) => {
    console.error('[enc] failed:', err);
    process.exitCode = 1;
  })
  .finally(() => {
    // prisma pg pool keeps the process alive otherwise.
    process.exit(process.exitCode || 0);
  });
