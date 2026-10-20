import { prisma } from '../db';
import { encField, decField } from '../utils/secretCrypto';

export interface EnvironmentData {
  id: string;
  workspaceId: string;
  name: string;
  variables?: any;
  position?: number;
  /** Optimistic-locking fields (never persisted directly). */
  expectedUpdatedAt?: string;
  force?: boolean;
}

export class EnvironmentRepository {
  private parseEnv(e: any) {
    return {
      ...e,
      variables: e.variables ? JSON.parse(decField(e.variables)) : []
    };
  }

  async findByWorkspaceId(workspaceId: string) {
    const envs = await prisma.environment.findMany({
      where: { workspaceId, deletedAt: null } as any
    });
    return envs.map(this.parseEnv);
  }

  async findById(id: string) {
    const env = await prisma.environment.findUnique({ where: { id } });
    if (!env || (env as any).deletedAt) return null;
    return this.parseEnv(env);
  }

  async create(data: EnvironmentData) {
    const created = await prisma.environment.create({
      data: {
        id: data.id,
        workspaceId: data.workspaceId,
        name: data.name,
        variables: encField(data.variables ? JSON.stringify(data.variables) : "[]"),
        position: data.position || 0
      }
    });
    return this.parseEnv(created);
  }

  async update(id: string, data: Partial<EnvironmentData>) {
    // Optimistic locking (PRD #51) — see collection.repository.ts.
    if (data.expectedUpdatedAt && !data.force) {
      const current = await prisma.environment.findUnique({ where: { id } });
      const currentTs = current?.updatedAt ? new Date(current.updatedAt).getTime() : 0;
      const expectedTs = new Date(data.expectedUpdatedAt).getTime();
      if (current && !Number.isNaN(expectedTs) && currentTs !== expectedTs) {
        const err: any = new Error('Conflict: environment changed on server');
        err.code = 'CONFLICT';
        err.current = this.parseEnv(current);
        throw err;
      }
    }
    const { expectedUpdatedAt: _e, force: _f, ...rest } = data;
    const updated = await prisma.environment.update({
      where: { id },
      data: {
        ...(rest.name !== undefined && { name: rest.name }),
        ...(rest.variables !== undefined && { variables: encField(JSON.stringify(rest.variables)) }),
        ...(rest.position !== undefined && { position: rest.position })
      }
    });
    return this.parseEnv(updated);
  }

  /** Soft delete (PRD #50). */
  async delete(id: string) {
    const deleted = await prisma.environment.update({
      where: { id },
      data: { deletedAt: new Date() } as any
    });
    return this.parseEnv(deleted);
  }

  async restore(id: string) {
    const restored = await prisma.environment.update({
      where: { id },
      data: { deletedAt: null } as any
    });
    return this.parseEnv(restored);
  }
}
