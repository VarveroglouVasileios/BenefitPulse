import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
  type: 'pageview' | 'opportunity_view' | 'official_click' | 'bookmark_add' | 'bookmark_remove' | 'contact_form';
  path?: string;
  opportunityId?: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  sessionId?: string;
  data?: any; // For storing additional data (e.g., contact form data)
  createdAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    type: {
      type: String,
      enum: ['pageview', 'opportunity_view', 'official_click', 'bookmark_add', 'bookmark_remove', 'contact_form'],
      required: true,
      index: true,
    },
    data: {
      type: Schema.Types.Mixed,
    },
    path: {
      type: String,
      index: true,
    },
    opportunityId: {
      type: Schema.Types.ObjectId,
      ref: 'Opportunity',
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    sessionId: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound indexes
EventSchema.index({ type: 1, createdAt: -1 });
EventSchema.index({ opportunityId: 1, type: 1, createdAt: -1 });
EventSchema.index({ path: 1, createdAt: -1 });
EventSchema.index({ createdAt: -1 });

export const Event = mongoose.model<IEvent>('Event', EventSchema);
