import { prisma } from '../db';

export class UserRepository {
  async findByUid(uid: string) {
    return prisma.user.findUnique({
      where: { uid }
    });
  }

  async upsert(uid: string, data: { email?: string | null; displayName?: string | null; photoURL?: string | null }) {
    return prisma.user.upsert({
      where: { uid },
      update: {
        ...(data.email !== undefined && { email: data.email }),
        ...(data.displayName !== undefined && { displayName: data.displayName }),
        ...(data.photoURL !== undefined && { photoURL: data.photoURL })
      },
      create: {
        uid,
        email: data.email || null,
        displayName: data.displayName || null,
        photoURL: data.photoURL || null
      }
    });
  }

  async create(uid: string, email: string, displayName: string) {
    return prisma.user.create({
      data: {
        uid,
        email,
        displayName
      }
    });
  }
}
