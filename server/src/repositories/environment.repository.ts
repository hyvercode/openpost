import { prisma } from '../db';

export interface EnvironmentData {
  id: string;
  workspaceId: string;
  name: string;
  variables?: any;
  position?: number;
}

export class EnvironmentRepository {
  async findByWorkspaceId(workspaceId: string) {
    return prisma.environment.findMany({
      where: { workspaceId }
    });
  }

  async create(data: EnvironmentData) {
    return prisma.environment.create({
      data: {
        id: data.id,
        workspaceId: data.workspaceId,
        name: data.name,
        variables: data.variables ? JSON.parse(JSON.stringify(data.variables)) : [],
        position: data.position || 0
      }
    });
  }

  async update(id: string, data: Partial<EnvironmentData>) {
    return prisma.environment.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.variables !== undefined && { variables: JSON.parse(JSON.stringify(data.variables)) }),
        ...(data.position !== undefined && { position: data.position })
      }
    });
  }

  async delete(id: string) {
    return prisma.environment.delete({
      where: { id }
    });
  }
}
