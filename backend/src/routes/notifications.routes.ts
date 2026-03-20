import { Router } from 'express';
import { notificationsRateLimiter } from '../config/security';
import { notificationsController } from '../controllers/notifications.controller';
import { adminMiddleware, authMiddleware, optionalAuthMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Subscribe to push notifications
// Auth is optional - if user is authenticated, subscription will be linked to their account
// If not authenticated, subscription will be anonymous
router.post('/subscribe', notificationsRateLimiter, optionalAuthMiddleware, notificationsController.subscribe);

// Unsubscribe
router.post('/unsubscribe', notificationsRateLimiter, authMiddleware, notificationsController.unsubscribe);

// Test notifications are admin-only.
router.post('/test', notificationsRateLimiter, authMiddleware, adminMiddleware, notificationsController.sendTest);

export const notificationsRoutes = router;
