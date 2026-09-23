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
    return { user: { uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL }, token };
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({ where: { uid: userId } });
    if (!user) throw new Error('User not found');
    return { uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL };
  }

  async googleAuth(data: { credential?: string; email?: string; displayName?: string; photoURL?: string; googleId?: string }) {
    let email = data.email?.trim().toLowerCase();
    let displayName = data.displayName?.trim();
    let photoURL = data.photoURL?.trim();

    // If Google ID Token (credential) is passed, decode payload
    if (data.credential) {
      try {
        const decoded = jwt.decode(data.credential) as any;
        if (decoded && decoded.email) {
          email = decoded.email.toLowerCase();
          displayName = displayName || decoded.name || decoded.given_name;
          photoURL = photoURL || decoded.picture;
        }
      } catch (err) {
        console.warn('Failed to decode Google credential JWT:', err);
      }
    }

    if (!email) {
      throw new Error('Valid Google email address is required');
    }

    let user = await prisma.user.findUnique({ where: { email } });
    const isNewUser = !user;

    if (!user) {
      // Register with Google
      user = await prisma.user.create({
        data: {
          email,
          displayName: displayName || email.split('@')[0],
          photoURL: photoURL || null,
          isEmailVerified: true,
        },
      });

      // Automatically create a default workspace for the new user
      const workspace = await prisma.workspace.create({
        data: {
          name: `${user.displayName || 'My'}'s Workspace`,
          ownerId: user.uid,
        },
      });

      await prisma.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.uid,
          role: 'OWNER',
          status: 'ACTIVE',
        },
      });
    } else {
      // Login with Google: mark email verified and refresh profile info if available
      user = await prisma.user.update({
        where: { uid: user.uid },
        data: {
          isEmailVerified: true,
          displayName: user.displayName || displayName || email.split('@')[0],
          photoURL: photoURL || user.photoURL,
        },
      });

      // Ensure user has at least one workspace
      const userMemberships = await prisma.workspaceMember.count({
        where: { userId: user.uid },
      });

      if (userMemberships === 0) {
        const workspace = await prisma.workspace.create({
          data: {
            name: `${user.displayName || 'My'}'s Workspace`,
            ownerId: user.uid,
          },
        });

        await prisma.workspaceMember.create({
          data: {
            workspaceId: workspace.id,
            userId: user.uid,
            role: 'OWNER',
            status: 'ACTIVE',
          },
        });
      }
    }

    const token = jwt.sign({ userId: user.uid, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    return {
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      },
      token,
      isNewUser,
      message: isNewUser
        ? 'Account successfully registered and authenticated with Google!'
        : 'Successfully logged in with Google!',
    };
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
