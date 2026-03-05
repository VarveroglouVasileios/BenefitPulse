import mongoose, { Schema, Document } from "mongoose";

export type MatchStatus = "matched" | "not_matched" | "unknown";

export interface IUserOpportunity extends Document {
  userId: mongoose.Types.ObjectId;
  opportunityId: mongoose.Types.ObjectId;
  matched: boolean;
  matchStatus: MatchStatus;
  reasons: string[];
  missingFields: string[];
  confidence: number;
  viewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserOpportunitySchema = new Schema<IUserOpportunity>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    opportunityId: {
      type: Schema.Types.ObjectId,
      ref: "Opportunity",
      required: true,
      index: true,
    },
    matched: {
      type: Boolean,
      required: true,
      index: true,
    },
    matchStatus: {
      type: String,
      enum: ["matched", "not_matched", "unknown"],
      default: "not_matched",
      index: true,
    },
    reasons: {
      type: [String],
      default: [],
    },
    missingFields: {
      type: [String],
      default: [],
    },
    confidence: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
    viewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index
UserOpportunitySchema.index({ userId: 1, opportunityId: 1 }, { unique: true });

export const UserOpportunity = mongoose.model<IUserOpportunity>(
  "UserOpportunity",
  UserOpportunitySchema
);
