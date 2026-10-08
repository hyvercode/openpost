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
      const authUserId = (req as any).user?.uid || (req as any).user?.userId;

      if (!uid) {
        return res.status(400).json({ error: 'UID is required' });
      }

      if (authUserId !== uid) {
        return res.status(403).json({ error: 'Forbidden to update another user profile' });
      }

      // Guard: photoURL may carry a base64 avatar — enforce the same
      // 2 MB limit here so oversized payloads can't sneak in via upsert.
      // Empty string = "no avatar", normalize to null.
      let avatarValue = photoURL;
      if (avatarValue === '') avatarValue = null;
      if (avatarValue !== undefined && avatarValue !== null) {
        const err = validateAvatarDataUrl(avatarValue);
        if (err) return res.status(400).json({ error: err });
      }

      const user = await this.userService.upsertUser(uid, { email, displayName, photoURL: avatarValue });
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to upsert user', details: error.message });
    }
  };

  updateAvatar = async (req: Request, res: Response) => {
    try {
      const authUserId = (req as any).user?.uid || (req as any).user?.userId;
      if (!authUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const { image } = req.body || {};
      const err = validateAvatarDataUrl(image);
      if (err) return res.status(400).json({ error: err });

      const user = await this.userService.upsertUser(authUserId, { photoURL: image });
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update avatar', details: error.message });
    }
  };

  deleteAvatar = async (req: Request, res: Response) => {
    try {
      const authUserId = (req as any).user?.uid || (req as any).user?.userId;
      if (!authUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const user = await this.userService.upsertUser(authUserId, { photoURL: null });
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to remove avatar', details: error.message });
    }
  };
}

/**
 * Avatar rules: must be an image data-URL (png/jpeg/gif/webp) whose
 * decoded binary size is at most 2 MB. Plain https:// URLs are also
 * accepted (they carry no binary payload). Returns an error message or null.
 */
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const AVATAR_DATA_URL_RE = /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export function validateAvatarDataUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) {
    return 'Avatar image is required';
  }
  // Allow external URL avatars (e.g. OAuth photoURL) — cap length sanely.
  if (value.startsWith('http://') || value.startsWith('https://')) {
    if (value.length > 2048) return 'Avatar URL is too long';
    return null;
  }
  if (!AVATAR_DATA_URL_RE.test(value)) {
    return 'Avatar must be a PNG, JPEG, GIF or WebP image';
  }
  const base64 = value.slice(value.indexOf(',') + 1);
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  const byteSize = Math.floor((base64.length * 3) / 4) - padding;
  if (byteSize > MAX_AVATAR_BYTES) {
    return 'Avatar image must not exceed 2 MB';
  }
  return null;
}
