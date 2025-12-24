export type AgeRange = '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+';
export type IncomeRange = '<10k' | '10-20k' | '20-30k' | '30-40k' | '40-50k' | '50k+';
export type StatusFlag =
  | 'student'
  | 'unemployed'
  | 'employee'
  | 'retired'
  | 'self_employed'
  | 'parent';
export type Region = 'attiki' | 'thessaloniki' | 'crete' | 'peloponnese' | 'macedonia' | 'thrace' | 'epirus' | 'thessaly' | 'central_greece' | 'western_greece' | 'aegean_islands' | 'ionian_islands' | 'other';
export type EducationLevel = 'primary' | 'secondary' | 'tertiary' | 'postgraduate' | 'none';

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

export interface UserProfile {
  userId: string;
  ageRange?: AgeRange;
  incomeRange?: IncomeRange;
  employmentStatus?: 'unemployed' | 'employed' | 'selfEmployed' | 'pensioner' | 'other';
  isStudent?: boolean;
  region?: Region;
  lastVisitAt?: Date;
  // ASEP Qualifications (NEW)
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
