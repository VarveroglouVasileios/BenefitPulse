import { Router } from 'express';
import { notificationsController } from '../controllers/notifications.controller';
import { optionalAuthMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Subscribe to push notifications
// Auth is optional - if user is authenticated, subscription will be linked to their account
// If not authenticated, subscription will be anonymous
router.post('/subscribe', optionalAuthMiddleware, notificationsController.subscribe);

// Unsubscribe
router.post('/unsubscribe', notificationsController.unsubscribe);

// Send test notification (Admin only ideally, protecting with simple check or auth if available)
router.post('/test', notificationsController.sendTest);

export const notificationsRoutes = router;
