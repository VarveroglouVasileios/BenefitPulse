import { CriteriaRules } from "../../../shared/src/rulesTypes";
import { UserProfile, MatchResult } from "../../../shared/src/types";
import { IUserProfile } from "../models/profile.model";
import { IOpportunity } from "../models/opportunity.model";

export function evaluateMatch(
  profile: UserProfile,
  criteriaRules: CriteriaRules
): MatchResult;

export function evaluateMatch(
  profile: UserProfile | IUserProfile,
  criteriaRules: CriteriaRules,
  opportunity?: IOpportunity
): MatchResult {
  const reasons: string[] = [];
  const missingFields: string[] = [];
  let matchedCount = 0;
  let totalConditions = 0;

  // Age Range matching
  if (criteriaRules.ageRange) {
    totalConditions++;
    if (profile.ageRange) {
      const ageRange = profile.ageRange;
      const ageMatch = checkAgeRange(ageRange, criteriaRules.ageRange);
      if (ageMatch.matched) {
        matchedCount++;
        reasons.push(ageMatch.reason);
      } else {
        missingFields.push("ageRange");
      }
    } else {
      missingFields.push("ageRange");
    }
  }

  // Income Range matching
  if (criteriaRules.incomeRange) {
    totalConditions++;
    if (profile.incomeRange) {
      const incomeMatch = checkIncomeRange(
        profile.incomeRange,
        criteriaRules.incomeRange
      );
      if (incomeMatch.matched) {
        matchedCount++;
        reasons.push(incomeMatch.reason);
      } else {
        missingFields.push("incomeRange");
      }
    } else {
      missingFields.push("incomeRange");
    }
  }

  // Status Flags matching
  if (criteriaRules.statusFlags) {
    totalConditions++;

    const derivedStatusFlags: string[] = [];

    if (profile.employmentStatus === "unemployed") {
      derivedStatusFlags.push("unemployed");
    } else if (profile.employmentStatus === "employed") {
      derivedStatusFlags.push("employee");
    } else if (profile.employmentStatus === "selfEmployed") {
      derivedStatusFlags.push("self_employed");
    } else if (profile.employmentStatus === "pensioner") {
      derivedStatusFlags.push("retired");
    } else if (profile.employmentStatus === "other") {
      derivedStatusFlags.push("other");
    }

    if (profile.isStudent) {
      derivedStatusFlags.push("student");
    }

    if (derivedStatusFlags.length > 0) {
      const statusMatch = checkStatusFlags(
        derivedStatusFlags,
        criteriaRules.statusFlags
      );
      if (statusMatch.matched) {
        matchedCount++;
        reasons.push(statusMatch.reason);
      }
    } else {
      missingFields.push("employmentStatus");
    }
  }

  // Region matching
  if (criteriaRules.region) {
    totalConditions++;
    if (profile.region) {
      const regionMatch = checkRegion(profile.region, criteriaRules.region);
      if (regionMatch.matched) {
        matchedCount++;
        reasons.push(regionMatch.reason);
      }
    } else {
      missingFields.push("region");
    }
  }

  // Education Level matching
  if (criteriaRules.educationLevel) {
    totalConditions++;
    // Education level no longer exists on profile; treat as missing
    missingFields.push("educationLevel");
  }

  // ASEP-specific matching (if opportunity is ASEP)
  if (opportunity && (opportunity as any).type === "asep_competition") {
    const asepMatch = evaluateASEPMatch(profile as IUserProfile, opportunity);
    if (asepMatch.totalConditions > 0) {
      matchedCount += asepMatch.matchedCount;
      totalConditions += asepMatch.totalConditions;
      reasons.push(...asepMatch.reasons);
      missingFields.push(...asepMatch.missingFields);
    }
  }

  // Match if at least 50% of conditions are met
  const matched =
    totalConditions === 0 || matchedCount / totalConditions >= 0.5;
  const confidence = totalConditions > 0 ? matchedCount / totalConditions : 0;

  return {
    matched,
    reasons,
    missingFields,
    confidence,
  };
}

/**
 * ASEP-specific matching logic
 */
function evaluateASEPMatch(
  profile: IUserProfile,
  opportunity: IOpportunity
): {
  matchedCount: number;
  totalConditions: number;
  reasons: string[];
  missingFields: string[];
} {
  let matchedCount = 0;
  let totalConditions = 0;
  const reasons: string[] = [];
  const missingFields: string[] = [];

  const requirements = (opportunity.criteriaRulesJson as any)?.requirementsNormalized || {};

  // Education Level matching (ΠΕ/ΤΕ/ΔΕ/ΥΕ)
  if (requirements.educationLevels && Array.isArray(requirements.educationLevels)) {
    totalConditions++;
    if (profile.highestEducationLevel) {
      if (requirements.educationLevels.includes(profile.highestEducationLevel)) {
        matchedCount++;
        reasons.push(`Εκπαιδευτικό επίπεδο ${profile.highestEducationLevel} αντιστοιχεί`);
      } else {
        missingFields.push("educationLevel");
      }
    } else {
      missingFields.push("highestEducationLevel");
    }
  }

  // Degree Fields matching
  if (requirements.degreeFieldsKeywords && Array.isArray(requirements.degreeFieldsKeywords)) {
    totalConditions++;
    if (profile.degrees && profile.degrees.length > 0) {
      const userFields = profile.degrees
        .map((d) => [d.fieldCategory, d.degreeTitleFreeText].filter(Boolean))
        .flat()
        .map((f) => f?.toLowerCase() || "");
      
      const hasMatch = requirements.degreeFieldsKeywords.some((reqField: string) =>
        userFields.some((userField) => userField.includes(reqField.toLowerCase()))
      );
      
      if (hasMatch) {
        matchedCount++;
        reasons.push("Ειδικότητα/Πτυχίο αντιστοιχεί");
      } else {
        missingFields.push("degreeField");
      }
    } else {
      missingFields.push("degrees");
    }
  }

  // Languages matching
  if (requirements.languagesRequired && Array.isArray(requirements.languagesRequired)) {
    totalConditions++;
    if (profile.languages && profile.languages.length > 0) {
      const cefrOrder = ["A1", "A2", "B1", "B2", "C1", "C2"];
      
      const allMatch = requirements.languagesRequired.every((reqLang: any) => {
        const userLang = profile.languages!.find((l) => l.language === reqLang.language);
        if (!userLang) return false;
        
        if (reqLang.levelMin) {
          const reqIndex = cefrOrder.indexOf(reqLang.levelMin);
          const userIndex = cefrOrder.indexOf(userLang.cefrLevel);
          return userIndex >= reqIndex;
        }
        return true;
      });
      
      if (allMatch) {
        matchedCount++;
        reasons.push("Γλώσσες αντιστοιχούν");
      } else {
        missingFields.push("languages");
      }
    } else {
      missingFields.push("languages");
    }
  }

  // IT Skills matching
  if (requirements.itSkillsRequired === true) {
    totalConditions++;
    if (profile.itSkills?.hasBasicIT) {
      matchedCount++;
      reasons.push("Γνώσεις Η/Υ αντιστοιχούν");
    } else {
      missingFields.push("itSkills");
    }
  }

  // Licensing matching
  if (requirements.licensingRequiredKeywords && Array.isArray(requirements.licensingRequiredKeywords)) {
    totalConditions++;
    if (profile.licenses && profile.licenses.length > 0) {
      const hasMatch = requirements.licensingRequiredKeywords.some((reqLicense: string) =>
        profile.licenses!.some((userLicense) =>
          userLicense.toLowerCase().includes(reqLicense.toLowerCase())
        )
      );
      
      if (hasMatch) {
        matchedCount++;
        reasons.push("Άδειες/Πιστοποιήσεις αντιστοιχούν");
      } else {
        missingFields.push("licenses");
      }
    } else {
      missingFields.push("licenses");
    }
  }

  return {
    matchedCount,
    totalConditions,
    reasons,
    missingFields,
  };
}

function checkAgeRange(
  ageRange: string,
  criteria: { min?: number; max?: number; includes?: string[] }
): { matched: boolean; reason: string } {
  if (criteria.includes && criteria.includes.includes(ageRange)) {
    return {
      matched: true,
      reason: `Ηλικιακή ομάδα ${ageRange} αντιστοιχεί στα κριτήρια`,
    };
  }

  // Parse age range to numbers
  const [min, max] = ageRange
    .split("-")
    .map((s) => s.replace("+", ""))
    .map(Number);
  const userMin = min;
  const userMax = max || 100;

  if (criteria.min !== undefined && userMax < criteria.min) {
    return { matched: false, reason: "" };
  }
  if (criteria.max !== undefined && userMin > criteria.max) {
    return { matched: false, reason: "" };
  }

  return {
    matched: true,
    reason: `Ηλικιακή ομάδα ${ageRange} αντιστοιχεί στα κριτήρια`,
  };
}

function checkIncomeRange(
  incomeRange: string,
  criteria: { max?: string; includes?: string[] }
): { matched: boolean; reason: string } {
  if (criteria.includes && criteria.includes.includes(incomeRange)) {
    return {
      matched: true,
      reason: `Εισοδηματική κατηγορία ${incomeRange} αντιστοιχεί στα κριτήρια`,
    };
  }

  if (criteria.max) {
    const incomeOrder = [
      "<10k",
      "10-20k",
      "20-30k",
      "30-40k",
      "40-50k",
      "50k+",
    ];
    const userIndex = incomeOrder.indexOf(incomeRange);
    const maxIndex = incomeOrder.indexOf(criteria.max);
    if (userIndex !== -1 && maxIndex !== -1 && userIndex <= maxIndex) {
      return {
        matched: true,
        reason: `Εισοδηματική κατηγορία ${incomeRange} αντιστοιχεί στα κριτήρια`,
      };
    }
  }

  return { matched: false, reason: "" };
}

function checkStatusFlags(
  statusFlags: string[],
  criteria: { required?: string[]; excludes?: string[] }
): { matched: boolean; reason: string } {
  if (criteria.excludes) {
    const hasExcluded = criteria.excludes.some((flag) =>
      statusFlags.includes(flag)
    );
    if (hasExcluded) {
      return { matched: false, reason: "" };
    }
  }

  if (criteria.required) {
    const hasAllRequired = criteria.required.every((flag) =>
      statusFlags.includes(flag)
    );
    if (hasAllRequired) {
      return {
        matched: true,
        reason: `Κατάσταση ${criteria.required.join(
          ", "
        )} αντιστοιχεί στα κριτήρια`,
      };
    }
    return { matched: false, reason: "" };
  }

  return { matched: true, reason: "Κατάσταση αντιστοιχεί στα κριτήρια" };
}

function checkRegion(
  region: string,
  criteria: { includes?: string[]; excludes?: string[] }
): { matched: boolean; reason: string } {
  if (criteria.excludes && criteria.excludes.includes(region)) {
    return { matched: false, reason: "" };
  }

  if (criteria.includes) {
    if (criteria.includes.includes(region)) {
      return {
        matched: true,
        reason: `Περιοχή ${region} αντιστοιχεί στα κριτήρια`,
      };
    }
    return { matched: false, reason: "" };
  }

  return {
    matched: true,
    reason: `Περιοχή ${region} αντιστοιχεί στα κριτήρια`,
  };
}

function checkEducationLevel(
  educationLevel: string,
  criteria: { includes?: string[]; excludes?: string[] }
): { matched: boolean; reason: string } {
  if (criteria.excludes && criteria.excludes.includes(educationLevel)) {
    return { matched: false, reason: "" };
  }

  if (criteria.includes) {
    if (criteria.includes.includes(educationLevel)) {
      return {
        matched: true,
        reason: `Εκπαιδευτικό επίπεδο ${educationLevel} αντιστοιχεί στα κριτήρια`,
      };
    }
    return { matched: false, reason: "" };
  }

  return {
    matched: true,
    reason: `Εκπαιδευτικό επίπεδο ${educationLevel} αντιστοιχεί στα κριτήρια`,
  };
}
