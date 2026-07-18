import { UserRepository } from '../repositories/user.repository';

export class UserService {
  private userRepository = new UserRepository();

  async getUser(uid: string) {
    return this.userRepository.findByUid(uid);
  }

  async upsertUser(uid: string, data: { email?: string | null; displayName?: string | null; photoURL?: string | null }) {
    if (!uid) {
      throw new Error('UID is required');
    }
    return this.userRepository.upsert(uid, data);
  }
}
