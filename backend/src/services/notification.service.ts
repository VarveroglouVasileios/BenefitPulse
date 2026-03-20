import webpush from 'web-push';
import { config } from '../config/env';
import { PushSubscription, IPushSubscription } from '../models/pushSubscription.model';

export class NotificationService {
  private vapidConfigured = false;
  private vapidWarned = false;

  constructor() {
    if (config.vapid.publicKey && config.vapid.privateKey) {
      webpush.setVapidDetails(
        config.vapid.mailto,
        config.vapid.publicKey,
        config.vapid.privateKey
      );
      this.vapidConfigured = true;
    }
  }

  private ensureVapid(): void {
    if (!this.vapidConfigured && !this.vapidWarned) {
      this.vapidWarned = true;
      console.warn('VAPID keys not configured. Add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to .env (run: npx web-push generate-vapid-keys)');
    }
  }

  async sendNotification(subscription: IPushSubscription, payload: any): Promise<void> {
    this.ensureVapid();
    if (!this.vapidConfigured) return;
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: subscription.keys,
        },
        JSON.stringify(payload)
      );
    } catch (error: any) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        // Subscription is no longer valid
        console.log(`Deleting invalid subscription: ${subscription.endpoint}`);
        await PushSubscription.deleteOne({ _id: subscription._id });
      } else {
        console.error('Error sending push notification:', error);
        throw error;
      }
    }
  }

  async broadcast(payload: any, userId?: string): Promise<void> {
    // If userId provided, send only to that user's subscriptions
    const query = userId ? { userId } : {};
    const subscriptions = await PushSubscription.find(query);

    console.log(`Broadcasting notification to ${subscriptions.length} subscriptions`);

    const promises = subscriptions.map(sub => this.sendNotification(sub, payload));
    await Promise.allSettled(promises);
  }

  async subscribe(subscriptionData: any, userId?: string): Promise<IPushSubscription> {
    if (!subscriptionData.endpoint || !subscriptionData.keys) {
      throw new Error('Invalid subscription data');
    }

    // Check if exists
    let subscription = await PushSubscription.findOne({ endpoint: subscriptionData.endpoint });

    if (subscription) {
      // Update userId if provided and different
      if (userId && subscription.userId?.toString() !== userId) {
        subscription.userId = userId as any;
        await subscription.save();
      }
      return subscription;
    }

    // Create new
    subscription = await PushSubscription.create({
      endpoint: subscriptionData.endpoint,
      keys: subscriptionData.keys,
      userId: userId
    });

    return subscription;
  }

  async unsubscribe(endpoint: string, userId?: string): Promise<void> {
    if (!endpoint) return;
    const query = userId ? { endpoint, userId } : { endpoint };
    await PushSubscription.deleteOne(query);
  }

  async sendToAdmins(payload: any): Promise<void> {
    this.ensureVapid();
    if (!this.vapidConfigured) return;
    try {
      const { User } = require('../models/user.model');
      // Find all admins
      const admins = await User.find({ role: 'admin' }).select('_id');
      const adminIds = admins.map((u: any) => u._id.toString());
      
      if (adminIds.length === 0) return;

      // Find subscriptions for admins
      const subscriptions = await PushSubscription.find({ userId: { $in: adminIds } });
      console.log(`Sending notification to ${subscriptions.length} admin subscriptions`);
      
      const promises = subscriptions.map((sub: any) => this.sendNotification(sub, payload));
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Failed to send notifications to admins:', error);
    }
  }
}

export const notificationService = new NotificationService();
