import mongoose, { Schema, Document } from 'mongoose';

export interface IAdminAudit extends Document {
  adminId: mongoose.Types.ObjectId;
  action: string;
  resourceType: string;
  resourceId: mongoose.Types.ObjectId;
  before?: Record<string, any>;
  after?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const AdminAuditSchema = new Schema<IAdminAudit>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
    },
    resourceType: {
      type: String,
      required: true,
    },
    resourceId: {
      type: Schema.Types.ObjectId,
      required: false, // Optional for system-level actions (trigger_ingestion, archive_expired, reset_bad_data)
    },
    before: {
      type: Schema.Types.Mixed,
    },
    after: {
      type: Schema.Types.Mixed,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

AdminAuditSchema.index({ createdAt: -1 });
AdminAuditSchema.index({ adminId: 1, createdAt: -1 });
AdminAuditSchema.index({ resourceType: 1, resourceId: 1 });

export const AdminAudit = mongoose.model<IAdminAudit>('AdminAudit', AdminAuditSchema);
