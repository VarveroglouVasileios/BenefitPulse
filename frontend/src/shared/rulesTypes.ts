export interface RuleCondition {
  field: string;
  operator: 'equals' | 'in' | 'range' | 'exists' | 'not_exists';
  value: any;
}

export interface Rule {
  id: string;
  name: string;
  conditions: RuleCondition[];
  reason: string;
  weight: number;
}

export interface CriteriaRules {
  ageRange?: {
    min?: number;
    max?: number;
    includes?: string[];
  };
  incomeRange?: {
    max?: string;
    includes?: string[];
  };
  statusFlags?: {
    required?: string[];
    excludes?: string[];
  };
  region?: {
    includes?: string[];
    excludes?: string[];
  };
  educationLevel?: {
    includes?: string[];
    excludes?: string[];
  };
  // Matching hints from cleaner
  requirementsNormalized?: {
    hasChildren?: boolean;
    student?: boolean;
    isUnemployed?: boolean;
    isEmployedPrivate?: boolean;
    isEmployer?: boolean;
    disability?: boolean;
    residency?: boolean;
    incomeBand?: string;
    ageMin?: number;
    ageMax?: number;
    sector?: string;
    targetGroup?: string;
    audience?: "unemployed" | "employee" | "employer" | "youth" | "other";
    // ASEP specific
    educationLevels?: ("ΠΕ" | "ΤΕ" | "ΔΕ" | "ΥΕ")[];
    contestCode?: string;
    fekRef?: string;
    degreeFieldsKeywords?: string[];
    languagesRequired?: Array<{ language: string; levelMin?: string }>;
    itSkillsRequired?: boolean;
    licensingRequiredKeywords?: string[];
  };
  requirementsSummaryBullets?: string[];
}
