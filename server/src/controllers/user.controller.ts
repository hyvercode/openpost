import { Request, Response } from 'express';
import { UserService } from '../services/user.service';

export class UserController {
  private userService = new UserService();

  getUser = async (req: Request, res: Response) => {
    try {
      const { uid } = req.params;
      const user = await this.userService.getUser(uid);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch user', details: error.message });
    }
  };

  upsertUser = async (req: Request, res: Response) => {
    try {
      const { uid, email, displayName, photoURL } = req.body;
      if (!uid) {
        return res.status(400).json({ error: 'UID is required' });
      }
      const user = await this.userService.upsertUser(uid, { email, displayName, photoURL });
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to upsert user', details: error.message });
    }
  };
}
