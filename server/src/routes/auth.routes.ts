import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import {
  validateBody,
  registerSchema,
  loginSchema,
  changePasswordSchema,
  resetPasswordSchema,
  emailSchema,
} from '../middleware/validation';
import { z } from 'zod';

const router = Router();
const authController = new AuthController();

// Brute-force protection on credential endpoints (stricter than the proxy's 60/min).
const authLimiter = rateLimiter(10);

router.post('/register', authLimiter, validateBody(registerSchema), authController.register);
router.get('/verify-email', authController.verifyEmail);
router.post('/verify-email', authController.verifyEmail);
router.post(
  '/resend-verification',
  authLimiter,
  validateBody(z.object({ email: emailSchema })),
  authController.resendVerification
);
router.post('/login', authLimiter, validateBody(loginSchema), authController.login);
router.post('/google', authLimiter, authController.googleAuth);
router.get('/me', requireAuth, authController.me);
router.post(
  '/forgot-password',
  authLimiter,
  validateBody(z.object({ email: emailSchema })),
  authController.forgotPassword
);
router.post('/reset-password', authLimiter, validateBody(resetPasswordSchema), authController.resetPassword);
router.post('/change-password', requireAuth, validateBody(changePasswordSchema), authController.changePassword);
router.post('/logout', requireAuth, authController.logout);
router.delete('/account', requireAuth, authController.deleteAccount);

export default router;
