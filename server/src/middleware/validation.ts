import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

/** Shared input validation (zod). Rejects oversized/malformed payloads early. */

export const emailSchema = z.string().trim().toLowerCase().email().max(254);

export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password must be at most 128 characters')
  .refine((p) => /[a-z]/.test(p) && /[A-Z]/.test(p), 'Password must contain upper and lowercase letters')
  .refine((p) => /\d/.test(p), 'Password must contain a number');

export const uuidOrIdSchema = z.string().trim().min(1).max(128);

export const workspaceCreateSchema = z.object({
  id: z.string().trim().min(1).max(128).optional(),
  name: z.string().trim().min(1).max(120),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  password: passwordSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1).max(256),
  password: passwordSchema,
});

export function validateBody<T>(schema: z.ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return res.status(400).json({
        error: 'Invalid request body',
        details: `${first.path.join('.') || 'body'}: ${first.message}`.slice(0, 300),
      });
    }
    req.body = parsed.data;
    next();
  };
}
