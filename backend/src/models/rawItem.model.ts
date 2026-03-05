import mongoose, { Schema, Document } from 'mongoose';

export interface IRawItem extends Document {
  sourceId: mongoose.Types.ObjectId;
  hash: string;
  title: string;
  content: string;
  url: string;
  publishedAt?: Date;
  metadata: Record<string, any>;
  processed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RawItemSchema = new Schema<IRawItem>(
  {
    sourceId: {
      type: Schema.Types.ObjectId,
      ref: 'Source',
      required: true,
      index: true,
    },
    hash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    publishedAt: {
      type: Date,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    processed: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const RawItem = mongoose.model<IRawItem>('RawItem', RawItemSchema);
