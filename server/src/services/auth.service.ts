import { prisma } from '../db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { EmailService } from './email.service';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-for-dev';

export class AuthService {
  private emailService = new EmailService();

  async register(email: string, password: string) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = uuidv4();

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        displayName: email.split('@')[0],
        isEmailVerified: false,
        verificationToken,
      },
    });

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const verificationLink = `${appUrl}/?verificationToken=${verificationToken}`;

    try {
      await this.emailService.sendVerificationEmail(email, verificationLink);
    } catch (error) {
      console.error('Failed to send verification email:', error);
    }

    return {
      message: 'Registration successful! Please check your email inbox to confirm your account before logging in.',
      email: user.email,
      requiresVerification: true,
      verificationLink // Included for development/testing convenience
    };
  }

  async verifyEmail(token: string) {
    const user = await prisma.user.findUnique({
      where: { verificationToken: token },
    });

    if (!user) {
      throw new Error('Invalid or expired confirmation link');
    }

    await prisma.user.update({
      where: { uid: user.uid },
      data: {
        isEmailVerified: true,
        verificationToken: null,
      },
    });

    return { 
      success: true, 
      message: 'Your email has been confirmed successfully! You can now sign in.',
      email: user.email
    };
  }

  async resendVerificationEmail(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { success: true, message: 'If an account exists, a confirmation link has been sent.' };
    }

    if (user.isEmailVerified) {
      throw new Error('This email address is already confirmed. Please sign in.');
    }

    const verificationToken = uuidv4();
    await prisma.user.update({
      where: { uid: user.uid },
      data: { verificationToken },
    });

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const verificationLink = `${appUrl}/?verificationToken=${verificationToken}`;

    try {
      await this.emailService.sendVerificationEmail(email, verificationLink);
    } catch (error) {
      console.error('Failed to send verification email:', error);
    }

    return { 
      success: true, 
      message: 'A new confirmation email has been sent. Please check your inbox.',
      verificationLink 
    };
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

    if (!user.isEmailVerified) {
      throw new Error('Your email address has not been confirmed yet. Please check your inbox for the confirmation email before logging in.');
    }

    const token = jwt.sign({ userId: user.uid }, JWT_SECRET, { expiresIn: '7d' });
    return { user: { uid: user.uid, email: user.email, displayName: user.displayName }, token };
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({ where: { uid: userId } });
    if (!user) throw new Error('User not found');
    return { uid: user.uid, email: user.email, displayName: user.displayName };
  }

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't leak if user exists or not, just return success
      return { success: true };
    }

    const resetToken = uuidv4();
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { uid: user.uid },
      data: {
        resetToken,
        resetTokenExpires,
      },
    });

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const resetLink = `${appUrl}/?resetToken=${resetToken}`;
    
    try {
      await this.emailService.sendPasswordResetEmail(email, resetLink);
    } catch (error) {
      console.error('Failed to send reset email:', error);
      // Still return success to prevent enumeration
    }

    return { success: true };
  }

  async changePassword(userId: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { uid: userId } });
    if (!user) throw new Error('User not found');
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
      where: { uid: userId },
      data: {
        password: hashedPassword,
      },
    });
    
    return { success: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { resetToken: token },
    });

    if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
      throw new Error('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { uid: user.uid },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    return { success: true };
  }
}
