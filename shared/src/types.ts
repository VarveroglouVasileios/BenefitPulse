export type AgeRange = '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+';
export type IncomeRange = '<10k' | '10-20k' | '20-30k' | '30-40k' | '40-50k' | '50k+';
export type StatusFlag =
  | 'student'
  | 'unemployed'
  | 'employee'
  | 'retired'
  | 'self_employed'
  | 'parent';
export type Region = 'eastern_macedonia_thrace' | 'central_macedonia' | 'western_macedonia' | 'epirus' | 'thessaly' | 'central_greece' | 'ionian_islands' | 'western_greece' | 'peloponnese' | 'attiki' | 'north_aegean' | 'south_aegean' | 'crete';
export type EducationLevel = 'primary' | 'secondary' | 'tertiary' | 'postgraduate' | 'none';
export type GeneralEducationLevel = 'None' | 'YE' | 'DE' | 'TE' | 'PE' | 'Master' | 'PhD';

// ASEP Qualifications types
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

export interface UserProfile {
  userId: string;
  ageRange?: AgeRange;
  incomeRange?: IncomeRange;
  employmentStatus?: 'unemployed' | 'employed' | 'selfEmployed' | 'pensioner' | 'other';
  isStudent?: boolean;
  region?: Region;
  lastVisitAt?: Date;
  // Education & Work Experience (for Job Matching)
  educationLevel?: GeneralEducationLevel;
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
}

export type OpportunityType =
  | 'subsidy'
  | 'voucher'
  | 'program'
  | 'public_call'
  | 'asep_competition'
  | 'manual'
  | 'decision'; // Διαύγεια decisions

// Kind is a coarse content category used for filtering/ingestion gating
export type OpportunityKind =
  | 'benefit'
  | 'voucher_pass'
  | 'service_info'
  | 'decision' // Διαύγεια decisions
  | 'tender' // Tenders/procurements (excluded from Opportunities tabs)
  | 'news' // News/announcements (not active opportunities)
  // legacy kinds kept for backwards compatibility with existing data
  | 'program'
  | 'voucher'
  | 'service_page'
  | 'garbage';

export interface Opportunity {
  _id?: string;
  type: OpportunityType;
  kind?: OpportunityKind;
  title: string;
  summary: string;
  officialUrl: string;
  source: string;
  publishedAt: Date;
  deadlineAt?: Date;
  tags: string[];
  region?: Region;
  criteriaJson: Record<string, any>;
  criteriaRulesJson: Record<string, any>;
   criteriaUnknown?: boolean;
  confidence: number;
  status: 'draft' | 'published' | 'archived';
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MatchResult {
  matched: boolean;
  reasons: string[];
  missingFields: string[];
  confidence: number;
}

export interface EventData {
  type: 'pageview' | 'opportunity_view' | 'official_click' | 'bookmark_add' | 'bookmark_remove';
  path?: string;
  opportunityId?: string;
  userId?: string;
  sessionId?: string;
}
