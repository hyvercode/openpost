import { prisma } from '../db';

export interface EnvironmentData {
  id: string;
  workspaceId: string;
  name: string;
  variables?: any;
  position?: number;
}

export class EnvironmentRepository {
  private parseEnv(e: any) {
    return {
      ...e,
      variables: e.variables ? JSON.parse(e.variables) : []
    };
  }

  async findByWorkspaceId(workspaceId: string) {
    const envs = await prisma.environment.findMany({
      where: { workspaceId }
    });
    return envs.map(this.parseEnv);
  }

  async create(data: EnvironmentData) {
    const created = await prisma.environment.create({
      data: {
        id: data.id,
        workspaceId: data.workspaceId,
        name: data.name,
        variables: data.variables ? JSON.stringify(data.variables) : "[]",
        position: data.position || 0
      }
    });
    return this.parseEnv(created);
  }

  async update(id: string, data: Partial<EnvironmentData>) {
    const updated = await prisma.environment.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.variables !== undefined && { variables: JSON.stringify(data.variables) }),
        ...(data.position !== undefined && { position: data.position })
      }
    });
    return this.parseEnv(updated);
  }

  async delete(id: string) {
    const deleted = await prisma.environment.delete({
      where: { id }
    });
    return this.parseEnv(deleted);
  }
}
