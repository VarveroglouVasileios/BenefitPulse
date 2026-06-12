import { Response } from 'express';
import { notificationService } from '../services/notification.service';
import { AuthRequest } from '../middleware/auth.middleware';

export class NotificationsController {
  
  // POST /api/notifications/subscribe
  async subscribe(req: AuthRequest, res: Response) {
    try {
      const subscription = req.body;
      const userId = req.userId;

      console.log('Received subscription request', {
        hasEndpoint: !!subscription?.endpoint,
        userId,
      });

      const savedSubscription = await notificationService.subscribe(subscription, userId);
      
      console.log('Subscription saved/updated:', savedSubscription._id);

      res.status(201).json({ 
        message: 'Subscribed successfully',
        id: savedSubscription._id
      });
    } catch (error) {
      console.error('Subscription error:', error);
      res.status(500).json({ message: 'Failed to subscribe' });
    }
  }

  // POST /api/notifications/unsubscribe
  async unsubscribe(req: AuthRequest, res: Response) {
    try {
      const { endpoint } = req.body;
      if (!endpoint || typeof endpoint !== 'string') {
        res.status(400).json({ message: 'Endpoint is required' });
        return;
      }

      if (!req.userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      await notificationService.unsubscribe(endpoint, req.userId);
      res.status(200).json({ message: 'Unsubscribed successfully' });
    } catch (error) {
      console.error('Unsubscribe error:', error);
      res.status(500).json({ message: 'Failed to unsubscribe' });
    }
  }

  // POST /api/notifications/test (Admin only)
  async sendTest(req: AuthRequest, res: Response) {
    try {
      const { message, url } = req.body;
      const body =
        typeof message === 'string' && message.trim()
          ? message.trim().substring(0, 200)
          : 'This is a test notification';
      const targetUrl =
        typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')
          ? url
          : '/opportunities';
      
      // Test notifications go only to admin subscriptions, never to all users
      await notificationService.sendToAdmins({
        title: 'BenefitPulse Test',
        body,
        url: targetUrl,
        icon: '/pwa-192x192.png'
      });

      res.status(200).json({ message: 'Test notification sent' });
    } catch (error) {
      console.error('Test notification error:', error);
      res.status(500).json({ message: 'Failed to send test notification' });
    }
  }
}

export const notificationsController = new NotificationsController();
