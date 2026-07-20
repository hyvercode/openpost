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

  async createMember(workspaceId: string, userId: string, role: string = 'MEMBER') {
    return prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId,
        role,
        status: 'ACTIVE'
      }
    });
  }

  async getMembers(workspaceId: string) {
    return prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: true
      }
    });
  }

  async updateMember(workspaceId: string, userId: string, data: { role?: string; status?: string }) {
    return prisma.workspaceMember.update({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId
        }
      },
      data
    });
  }

  async removeMember(workspaceId: string, userId: string) {
    return prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId
        }
      }
    });
  }

  async createInvitation(workspaceId: string, email: string, role: string, token: string, expiresAt: Date) {
    return prisma.invitation.create({
      data: {
        workspaceId,
        email,
        role,
        token,
        expiresAt
      }
    });
  }

  async findInvitationByToken(token: string) {
    return prisma.invitation.findUnique({
      where: { token },
      include: {
        workspace: true
      }
    });
  }

  async deleteInvitation(id: string) {
    return prisma.invitation.delete({
      where: { id }
    });
  }

  async findMember(workspaceId: string, userId: string) {
    return prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId
        }
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
