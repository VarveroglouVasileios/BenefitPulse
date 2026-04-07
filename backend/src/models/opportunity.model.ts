import mongoose, { Schema, Document } from "mongoose";
import { OpportunityType, OpportunityKind, Region } from "../shared/types";

export interface IOpportunity extends Document {
  type: OpportunityType;
  kind?: OpportunityKind;
  title: string;
  summary: string;
  officialUrl: string;
  source: string;
  sourceType?: "api" | "rss" | "html_listing" | "manual" | "single_page" | "html_catalog"; // 'api', 'rss', 'html_listing', 'manual', 'single_page', 'html_catalog'
  sourcePriority?: number; // 1 (API), 2 (RSS), 3 (HTML)
  publishedAt: Date;
  startAt?: Date;
  deadlineAt?: Date;
  // New date fields for better status computation
  announcedAt?: Date; // When the opportunity was announced/published
  applicationStartAt?: Date; // When applications open
  applicationEndAt?: Date; // When applications close
  tags: string[];
  region?: Region;
  criteriaJson: Record<string, any>;
  criteriaRulesJson: Record<string, any>;
  criteriaUnknown?: boolean;
  confidence: number;
  embedding?: number[];
  applicationStatus?: "upcoming" | "open" | "closed" | "expired" | "unknown" | "results" | "news"; // Application status (computed)
  status: "draft" | "published" | "archived" | "rejected";
  // Live verification fields
  verifiedAt?: Date;
  verificationResult?: "open" | "upcoming" | "closed" | "unknown" | "dead_link";
  evidenceSnippet?: string; // Max 200 chars
  rejectionReason?: string; // Reason if rejected (e.g., "dead_link")
  brokenLink?: boolean; // True if URL is 404/redirect to unrelated domain
  isLocked?: boolean; // If true, automated jobs (archive, cleanup) will not modify this
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OpportunitySchema = new Schema<IOpportunity>(
  {
    type: {
      type: String,
      enum: [
        "subsidy",
        "voucher",
        "program",
        "public_call",
        "asep_competition",
        "manual",
        "decision", // Διαύγεια decisions
      ],
      required: true,
      index: true,
    },
    kind: {
      type: String,
      enum: [
        "benefit",
        "voucher_pass",
        "service_info",
        "decision", // Διαύγεια decisions
        "tender", // Tenders/procurements
        "news", // News/announcements
        // legacy kinds
        "program",
        "voucher",
        "service_page",
        "garbage",
      ],
      default: "benefit",
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
      required: true,
    },
    officialUrl: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      required: true,
    },
    sourceType: {
      type: String,
      enum: ["api", "rss", "html_listing", "manual", "single_page", "html_catalog"],
    },
    sourcePriority: {
      type: Number,
      default: 3, // 1 = API, 2 = RSS, 3 = HTML (lower is better)
    },
    publishedAt: {
      type: Date,
      required: true,
      index: true,
    },
    startAt: {
      type: Date,
    },
    deadlineAt: {
      type: Date,
    },
    announcedAt: {
      type: Date,
      index: true,
    },
    applicationStartAt: {
      type: Date,
      index: true,
    },
    applicationEndAt: {
      type: Date,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    region: {
      type: String,
      enum: [
        "attiki",
        "thessaloniki",
        "crete",
        "peloponnese",
        "macedonia",
        "thrace",
        "epirus",
        "thessaly",
        "central_greece",
        "western_greece",
        "aegean_islands",
        "ionian_islands",
        "nationwide",
        "other",
      ],
    },
    criteriaJson: {
      type: Schema.Types.Mixed,
      default: {},
    },
    criteriaRulesJson: {
      type: Schema.Types.Mixed,
      default: {},
    },
    criteriaUnknown: {
      type: Boolean,
      default: false,
      index: true,
    },
    confidence: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
    embedding: {
      type: [Number],
      default: undefined,
    },
    applicationStatus: {
      type: String,
      enum: ["upcoming", "open", "closed", "expired", "unknown", "results", "news"],
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived", "rejected"],
      default: "draft",
      index: true,
    },
    verifiedAt: {
      type: Date,
      index: true,
    },
    verificationResult: {
      type: String,
      enum: ["open", "upcoming", "closed", "unknown", "dead_link"],
    },
    evidenceSnippet: {
      type: String,
      maxlength: 200,
    },
    rejectionReason: {
      type: String,
    },
    brokenLink: {
      type: Boolean,
      default: false,
      index: true,
    },
    isLocked: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);


// Compound indexes
OpportunitySchema.index({ status: 1, publishedAt: -1 });
OpportunitySchema.index({ deadlineAt: 1 });
// Text index includes title, summary, tags AND source
OpportunitySchema.index({ title: "text", summary: "text", tags: "text", source: "text" });

export const Opportunity = mongoose.model<IOpportunity>(
  "Opportunity",
  OpportunitySchema
);
