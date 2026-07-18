import { prisma } from '../db';

export class WorkspaceRepository {
  async findMany(userId?: string) {
    if (userId) {
      return prisma.workspace.findMany({
        where: {
          OR: [
            { ownerId: String(userId) },
            {
              members: {
                some: { userId: String(userId) }
              }
            }
          ]
        }
      });
    }
    return prisma.workspace.findMany();
  }

  async create(id: string, name: string, ownerId: string) {
    return prisma.workspace.create({
      data: {
        id,
        name,
        ownerId,
      }
    });
  }

  async createMember(workspaceId: string, userId: string) {
    return prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId,
      }
    });
  }

  async update(id: string, name: string) {
    return prisma.workspace.update({
      where: { id },
      data: { name }
    });
  }

  async delete(id: string) {
    return prisma.workspace.delete({
      where: { id }
    });
  }
}
