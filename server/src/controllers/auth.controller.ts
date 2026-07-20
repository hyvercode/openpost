import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

export class AuthController {
  private authService = new AuthService();

  register = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      const data = await this.authService.register(email, password);
      res.status(201).json(data);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  login = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      const data = await this.authService.login(email, password);
      res.json(data);
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  };

  me = async (req: Request, res: Response) => {
    try {
      // The auth middleware will set req.user
      const userId = (req as any).user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const user = await this.authService.getMe(userId);
      res.json(user);
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  };

  forgotPassword = async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }
      const data = await this.authService.forgotPassword(email);
      res.json(data);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  resetPassword = async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ error: 'Token and password are required' });
      }
      const data = await this.authService.resetPassword(token, password);
      res.json(data);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };
}
