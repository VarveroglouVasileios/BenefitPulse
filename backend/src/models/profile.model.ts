import mongoose, { Schema, Document } from "mongoose";
import { AgeRange, IncomeRange, Region } from "../shared/types";

// Education & Qualifications (for ASEP matching)
export interface UserDegree {
  level: "ΠΕ" | "ΤΕ" | "ΔΕ" | "ΥΕ";
  fieldCategory?: string; // e.g., "Πληροφορική", "Μηχανικοί", "Οικονομικά"
  degreeTitleFreeText?: string;
  institution?: string;
  graduationYear?: number;
  isForeignDegree?: boolean;
  doatapRecognized?: boolean;
}

export interface UserLanguage {
  language: string; // "EN", "FR", "DE", etc.
  cefrLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
}

export interface UserITSkills {
  hasBasicIT: boolean;
  certs?: string[]; // e.g., ["ECDL", "ACTA"]
}

export interface IUserProfile extends Document {
  userId: mongoose.Types.ObjectId;
  ageRange?: AgeRange;
  incomeRange?: IncomeRange;
  employmentStatus?:
    | "unemployed"
    | "employed"
    | "selfEmployed"
    | "pensioner"
    | "other";
  isStudent?: boolean;
  region?: Region;
  theme?: "light" | "dark";
  lastVisitAt?: Date;
  // ASEP Qualifications (NEW)
  highestEducationLevel?: "ΠΕ" | "ΤΕ" | "ΔΕ" | "ΥΕ";
  degrees?: UserDegree[];
  languages?: UserLanguage[];
  itSkills?: UserITSkills;
  licenses?: string[]; // Keywords for professional licenses
  createdAt: Date;
  updatedAt: Date;
}

const UserProfileSchema = new Schema<IUserProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    ageRange: {
      type: String,
      enum: ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"],
    },
    incomeRange: {
      type: String,
      enum: ["<10k", "10-20k", "20-30k", "30-40k", "40-50k", "50k+"],
    },
    employmentStatus: {
      type: String,
      enum: ["unemployed", "employed", "selfEmployed", "pensioner", "other"],
    },
    isStudent: {
      type: Boolean,
      default: false,
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
        "other",
      ],
    },
    theme: {
      type: String,
      enum: ["light", "dark"],
    },
    lastVisitAt: {
      type: Date,
    },
    // ASEP Qualifications (NEW)
    highestEducationLevel: {
      type: String,
      enum: ["ΠΕ", "ΤΕ", "ΔΕ", "ΥΕ"],
    },
    degrees: {
      type: [
        {
          level: { type: String, enum: ["ΠΕ", "ΤΕ", "ΔΕ", "ΥΕ"], required: true },
          fieldCategory: String,
          degreeTitleFreeText: String,
          institution: String,
          graduationYear: Number,
          isForeignDegree: Boolean,
          doatapRecognized: Boolean,
        },
      ],
      default: [],
    },
    languages: {
      type: [
        {
          language: { type: String, required: true },
          cefrLevel: {
            type: String,
            enum: ["A1", "A2", "B1", "B2", "C1", "C2"],
            required: true,
          },
        },
      ],
      default: [],
    },
    itSkills: {
      type: {
        hasBasicIT: { type: Boolean, default: false },
        certs: [String],
      },
    },
    licenses: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const UserProfile = mongoose.model<IUserProfile>(
  "UserProfile",
  UserProfileSchema
);
