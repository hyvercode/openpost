import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { sendError } from '../utils/errors';

export class UserController {
  private userService = new UserService();

  getUser = async (req: Request, res: Response) => {
    try {
      const { uid } = req.params;
      const user = await this.userService.getUser(uid);
      if (!user) {
        return sendError(res, 404, 'User not found');
      }
      res.json(user);
    } catch (error: any) {
      sendError(res, 500, 'Failed to fetch user', error);
    }
  };

  upsertUser = async (req: Request, res: Response) => {
    try {
      const { uid, email, displayName, photoURL } = req.body;
      const authUserId = (req as any).user?.uid || (req as any).user?.userId;

      if (!uid) {
        return sendError(res, 400, 'UID is required');
      }

      if (authUserId !== uid) {
        return sendError(res, 403, 'Forbidden to update another user profile');
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
      sendError(res, 500, 'Failed to upsert user', error);
    }
  };

  updateAvatar = async (req: Request, res: Response) => {
    try {
      const authUserId = (req as any).user?.uid || (req as any).user?.userId;
      if (!authUserId) {
        return sendError(res, 401, 'Unauthorized');
      }
      const { image } = req.body || {};
      const err = validateAvatarDataUrl(image);
      if (err) return res.status(400).json({ error: err });

      const user = await this.userService.upsertUser(authUserId, { photoURL: image });
      res.json(user);
    } catch (error: any) {
      sendError(res, 500, 'Failed to update avatar', error);
    }
  };

  deleteAvatar = async (req: Request, res: Response) => {
    try {
      const authUserId = (req as any).user?.uid || (req as any).user?.userId;
      if (!authUserId) {
        return sendError(res, 401, 'Unauthorized');
      }
      const user = await this.userService.upsertUser(authUserId, { photoURL: null });
      res.json(user);
    } catch (error: any) {
      sendError(res, 500, 'Failed to remove avatar', error);
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
