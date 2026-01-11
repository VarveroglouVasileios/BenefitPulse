import { Request, Response } from 'express';
import { notificationService } from '../services/notification.service';

export class NotificationsController {
  
  // POST /api/notifications/subscribe
  async subscribe(req: Request, res: Response) {
    try {
      const subscription = req.body;
      const userId = (req as any).user?._id; // Assuming auth middleware populates user

      console.log('Received subscription request:', { 
        endpoint: subscription?.endpoint, 
        userId 
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
  async unsubscribe(req: Request, res: Response) {
    try {
      const { endpoint } = req.body;
      await notificationService.unsubscribe(endpoint);
      res.status(200).json({ message: 'Unsubscribed successfully' });
    } catch (error) {
      console.error('Unsubscribe error:', error);
      res.status(500).json({ message: 'Failed to unsubscribe' });
    }
  }

  // POST /api/notifications/test (Admin only ideally)
  async sendTest(req: Request, res: Response) {
    try {
      const { message, url } = req.body;
      
      await notificationService.broadcast({
        title: 'BenefitPulse Test',
        body: message || 'This is a test notification',
        url: url || '/opportunities',
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
