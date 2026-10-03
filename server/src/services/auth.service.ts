import { prisma } from '../db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { EmailService } from './email.service';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config';

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
      // NOTE: verificationLink is deliberately NOT returned — it is a
      // single-use credential sent only via email. Returning it here would
      // leak it to logs/devtools/history.
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

    const token = jwt.sign({ userId: user.uid }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return { user: { uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL }, token };
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({ where: { uid: userId } });
    if (!user) throw new Error('User not found');
    return { uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL };
  }

  async googleAuth(data: { credential?: string; email?: string; displayName?: string; photoURL?: string; googleId?: string }) {
    // SECURITY: email/displayName/photoURL from the request body are NEVER
    // trusted. The Google ID token (credential) MUST be present and its
    // signature verified server-side. Previously the code fell back to
    // unverified `jwt.decode()` / raw body email, allowing account takeover
    // with a self-made token.
    if (!data.credential) {
      throw new Error('Google credential is required');
    }

    let email: string | undefined;
    let displayName: string | undefined;
    let photoURL: string | undefined;

    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error('Google login is not configured (GOOGLE_CLIENT_ID missing)');
    }

    try {
      const { OAuth2Client } = await import('google-auth-library');
      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({
        idToken: data.credential,
        audience: clientId,
      });
      const payload = ticket.getPayload();
      if (!payload?.email) {
        throw new Error('Google token has no email');
      }
      email = payload.email.toLowerCase();
      displayName = payload.name || payload.given_name;
      photoURL = payload.picture;
    } catch (err: any) {
      throw new Error('Invalid Google credential: ' + (err?.message || 'verification failed'));
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

    const token = jwt.sign({ userId: user.uid, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

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

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { uid: userId } });
    if (!user || !user.password) throw new Error('User not found');

    // Require the current password — a stolen token alone must not be
    // enough to permanently take over the account.
    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) throw new Error('Current password is incorrect');

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
