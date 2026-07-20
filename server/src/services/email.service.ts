import nodemailer from 'nodemailer';

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      const host = process.env.SMTP_HOST;
      const port = parseInt(process.env.SMTP_PORT || '587');
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;

      if (!host || !user || !pass) {
        console.warn('Email configuration is missing. Emails will not be sent.');
        // Return a mock transporter for development if config is missing
        return nodemailer.createTransport({
          jsonTransport: true
        });
      }

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });
    }
    return this.transporter;
  }

  async sendInvitationEmail(to: string, workspaceName: string, inviteLink: string) {
    const from = process.env.SMTP_FROM || 'no-reply@example.com';
    const transporter = this.getTransporter();

    const mailOptions = {
      from,
      to,
      subject: `Invitation to join workspace: ${workspaceName}`,
      html: `
        <h1>You've been invited!</h1>
        <p>You have been invited to join the <strong>${workspaceName}</strong> workspace on OpenPost API.</p>
        <p>Click the link below to accept the invitation:</p>
        <p><a href="${inviteLink}">${inviteLink}</a></p>
        <p>If you didn't expect this invitation, you can safely ignore this email.</p>
      `,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent: %s', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send invitation email');
    }
  }

  async sendPasswordResetEmail(to: string, resetLink: string) {
    const from = process.env.SMTP_FROM || 'no-reply@example.com';
    const transporter = this.getTransporter();

    const mailOptions = {
      from,
      to,
      subject: 'Password Reset Request',
      html: `
        <h1>Reset Your Password</h1>
        <p>You requested to reset your password for OpenPost API.</p>
        <p>Click the link below to set a new password:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>If you didn't request this, you can safely ignore this email. The link will expire in 1 hour.</p>
      `,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Password reset email sent: %s', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }
}
