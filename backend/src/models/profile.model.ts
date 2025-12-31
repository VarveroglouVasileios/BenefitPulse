import mongoose, { Schema, Document } from "mongoose";
import { AgeRange, IncomeRange, Region } from "../../../shared/src/types";

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

// Hard Skills for Job Matching
export interface HardSkill {
  name: string; // e.g., "JavaScript", "Microsoft Office", "Project Management"
  category: 
    | "technical"      // Programming, IT tools
    | "software"       // MS Office, Adobe, etc.
    | "language"       // Foreign languages (separate from UserLanguage)
    | "certification"  // Professional certifications
    | "professional"   // Project management, accounting, etc.
    | "other";
  level?: "beginner" | "intermediate" | "advanced" | "expert";
  yearsOfExperience?: number; // Optional: years of experience with this skill
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
  // Education & Work Experience (for Job Matching)
  educationLevel?: "None" | "YE" | "DE" | "TE" | "PE" | "Master" | "PhD";
  degreeCategories?: string[]; // e.g., ["Computer Science", "Economics"]
  workExperienceYears?: number; // Years of work experience
  driverLicense?: boolean;
  // Hard Skills (for Job Matching)
  hardSkills?: HardSkill[];
  // ASEP Qualifications (for ASEP-specific matching)
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
        "eastern_macedonia_thrace", // Ανατολική Μακεδονία και Θράκη
        "central_macedonia", // Κεντρική Μακεδονία
        "western_macedonia", // Δυτική Μακεδονία
        "epirus", // Ήπειρος
        "thessaly", // Θεσσαλία
        "central_greece", // Στερεά Ελλάδα
        "ionian_islands", // Ιόνια Νησιά
        "western_greece", // Δυτική Ελλάδα
        "peloponnese", // Πελοπόννησος
        "attiki", // Αττική
        "north_aegean", // Βόρειο Αιγαίο
        "south_aegean", // Νότιο Αιγαίο
        "crete", // Κρήτη
      ],
    },
    theme: {
      type: String,
      enum: ["light", "dark"],
    },
    lastVisitAt: {
      type: Date,
    },
    // Education & Work Experience (for Job Matching)
    educationLevel: {
      type: String,
      enum: ["None", "YE", "DE", "TE", "PE", "Master", "PhD"],
    },
    degreeCategories: {
      type: [String],
      default: [],
    },
    workExperienceYears: {
      type: Number,
      min: 0,
      max: 50,
    },
    driverLicense: {
      type: Boolean,
      default: false,
    },
    // Hard Skills (for Job Matching)
    hardSkills: {
      type: [
        {
          name: { type: String, required: true },
          category: {
            type: String,
            enum: ["technical", "software", "language", "certification", "professional", "other"],
            required: true,
          },
          level: {
            type: String,
            enum: ["beginner", "intermediate", "advanced", "expert"],
          },
          yearsOfExperience: {
            type: Number,
            min: 0,
            max: 50,
          },
        },
      ],
      default: [],
    },
    // ASEP Qualifications (for ASEP-specific matching)
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
