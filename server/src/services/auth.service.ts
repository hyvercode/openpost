import { prisma } from '../db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-for-dev';

export class AuthService {
  async register(email: string, password: string) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        displayName: email.split('@')[0],
      },
    });

    const token = jwt.sign({ userId: user.uid }, JWT_SECRET, { expiresIn: '7d' });
    return { user: { uid: user.uid, email: user.email, displayName: user.displayName }, token };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      throw new Error('Invalid email or password');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    const token = jwt.sign({ userId: user.uid }, JWT_SECRET, { expiresIn: '7d' });
    return { user: { uid: user.uid, email: user.email, displayName: user.displayName }, token };
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({ where: { uid: userId } });
    if (!user) throw new Error('User not found');
    return { uid: user.uid, email: user.email, displayName: user.displayName };
  }
}
