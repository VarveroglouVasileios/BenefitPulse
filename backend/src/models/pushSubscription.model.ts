import mongoose, { Schema, Document } from 'mongoose';

export interface IPushSubscription extends Document {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const PushSubscriptionSchema: Schema = new Schema({
  endpoint: { type: String, required: true, unique: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  createdAt: { type: Date, default: Date.now, expires: '90d' }, // Auto-expire unused subs after 90 days? Optional.
});

export const PushSubscription = mongoose.model<IPushSubscription>('PushSubscription', PushSubscriptionSchema);
