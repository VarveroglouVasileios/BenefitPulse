import { Router } from 'express';
import { notificationsController } from '../controllers/notifications.controller';
// import { authMiddleware } from '../middleware/auth.middleware.js'; // Assuming you want auth

const router = Router();

// Subscribe to push notifications
// We make auth optional or required depending on logic. 
// Ideally required to link to user, but could be anonymous.
// For now, let's assume public subscription is allowed but we try to attach user if token present?
// Or simply rely on the controller logic which checks for user in request.
// Unsubscribe
router.post('/unsubscribe', notificationsController.unsubscribe);

router.post('/subscribe', notificationsController.subscribe);

// Send test notification (Admin only ideally, protecting with simple check or auth if available)
router.post('/test', notificationsController.sendTest);

export const notificationsRoutes = router;
