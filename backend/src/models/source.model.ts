import mongoose, { Schema, Document } from "mongoose";

export interface ISource extends Document {
  name: string;
  url: string;
  type:
    | "rss"
    | "api"
    | "manual"
    | "html_catalog"
    | "html_listing"
    | "single_page";
  enabled: boolean;
  config: Record<string, any>;
  lastFetchedAt?: Date;
  // Source Health debugging fields
  lastHttpStatus?: number;
  lastFinalUrl?: string;
  lastContentType?: string;
  lastBytes?: number;
  lastError?: string;
  lastItemsExtracted?: number;
  lastItemsKept?: number;
  lastItemsPublished?: number;
  consecutiveFailures?: number; // Track consecutive failures for auto-disable
  lastSuccessAt?: Date; // Last successful fetch
  createdAt: Date;
  updatedAt: Date;
}

const SourceSchema = new Schema<ISource>(
  {
    name: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        "rss",
        "api",
        "manual",
        "html_catalog",
        "html_listing",
        "single_page",
      ],
      required: true,
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    config: {
      type: Schema.Types.Mixed,
      default: {},
    },
    lastFetchedAt: {
      type: Date,
    },
    // Source Health debugging fields
    lastHttpStatus: {
      type: Number,
    },
    lastFinalUrl: {
      type: String,
    },
    lastContentType: {
      type: String,
    },
    lastBytes: {
      type: Number,
    },
    lastError: {
      type: String,
    },
    lastItemsExtracted: {
      type: Number,
    },
    lastItemsKept: {
      type: Number,
    },
    lastItemsPublished: {
      type: Number,
    },
    consecutiveFailures: {
      type: Number,
      default: 0,
    },
    lastSuccessAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const Source = mongoose.model<ISource>("Source", SourceSchema);
