/**
 * Rule-based Status Engine
 * 
 * Computes applicationStatus and status based on dates and page signals
 */

import { compareDatesInAthens, isPast, isFuture } from "./date-parser";

export interface StatusInputs {
  applicationStartAt?: Date | null;
  applicationEndAt?: Date | null;
  startAt?: Date | null;
  endAt?: Date | null;
  publishedAt?: Date | null;
  pageSignals?: string[]; // Words/phrases from official site
  title?: string; // For Pass year detection
}

export interface StatusOutputs {
  applicationStatus: "upcoming" | "open" | "closed" | "unknown";
  status: "draft" | "published" | "archived" | "rejected";
  reason?: string;
}

/**
 * Extract year from title (for Pass detection)
 */
function extractYearFromTitle(title: string): number | null {
  const yearMatch = title.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    return parseInt(yearMatch[1], 10);
  }
  return null;
}

/**
 * Check if page signals indicate closed status
 */
function hasClosedSignals(pageSignals: string[] = []): boolean {
  const closedKeywords = [
    "η προθεσμία έληξε",
    "προθεσμία έληξε",
    "οι αιτήσεις ολοκληρώθηκαν",
    "ολοκληρώθηκαν",
    "έληξε",
    "έκλεισε",
    "κλείσιμο",
  ];
  
  const signalsText = pageSignals.join(" ").toLowerCase();
  return closedKeywords.some(keyword => signalsText.includes(keyword.toLowerCase()));
}

/**
 * Check if page signals indicate open status
 */
function hasOpenSignals(pageSignals: string[] = []): boolean {
  const openKeywords = [
    "υποβολή αιτήσεων",
    "αιτήσεις",
    "ανοικτό",
    "ανοιχτό",
    "από",
    "έως",
  ];
  
  const signalsText = pageSignals.join(" ").toLowerCase();
  return openKeywords.some(keyword => signalsText.includes(keyword.toLowerCase()));
}

/**
 * Rule-based status computation
 * 
 * Rules (priority order):
 * 1) If applicationEndAt < now => closed + archived
 * 2) If applicationStartAt <= now <= applicationEndAt => open + published
 * 3) If applicationStartAt > now => upcoming + published (or draft if insufficient evidence)
 * 4) If no dates: ONLY "draft", not published
 * 5) Extra guard for "Pass 2025": if title has year < current and no open signals => archived
 */
export function computeStatus(
  inputs: StatusInputs,
  now: Date = new Date()
): StatusOutputs {
  const {
    applicationStartAt,
    applicationEndAt,
    startAt,
    endAt,
    publishedAt,
    pageSignals = [],
    title = "",
  } = inputs;

  // Use application dates if available, otherwise fall back to startAt/endAt
  const effectiveStartAt = applicationStartAt || startAt;
  const effectiveEndAt = applicationEndAt || endAt;

  // Rule 1: If applicationEndAt < now => closed + archived
  if (effectiveEndAt && isPast(effectiveEndAt, now)) {
    return {
      applicationStatus: "closed",
      status: "archived",
      reason: `applicationEndAt (${effectiveEndAt.toISOString()}) is in past`,
    };
  }

  // Rule 2: If applicationStartAt <= now <= applicationEndAt => open + published
  if (effectiveStartAt && effectiveEndAt) {
    const startIsPastOrNow = compareDatesInAthens(effectiveStartAt, now) <= 0;
    const endIsFutureOrNow = compareDatesInAthens(effectiveEndAt, now) >= 0;
    
    if (startIsPastOrNow && endIsFutureOrNow) {
      return {
        applicationStatus: "open",
        status: "published",
        reason: `application window active: ${effectiveStartAt.toISOString()} - ${effectiveEndAt.toISOString()}`,
      };
    }
  }

  // Rule 3: If applicationStartAt > now => upcoming + published (or draft if insufficient evidence)
  if (effectiveStartAt && isFuture(effectiveStartAt, now)) {
    // Check if we have enough evidence (dates + signals or publishedAt)
    const hasEvidence = (effectiveEndAt && publishedAt) || hasOpenSignals(pageSignals);
    
    if (hasEvidence) {
      return {
        applicationStatus: "upcoming",
        status: "published",
        reason: `applicationStartAt (${effectiveStartAt.toISOString()}) is in future with evidence`,
      };
    } else {
      return {
        applicationStatus: "upcoming",
        status: "draft",
        reason: `applicationStartAt (${effectiveStartAt.toISOString()}) is in future but insufficient evidence`,
      };
    }
  }

  // Rule 4: If no dates: ONLY "draft", not published
  if (!effectiveStartAt && !effectiveEndAt) {
    // Rule 5: Extra guard for "Pass 2025"
    const titleYear = extractYearFromTitle(title);
    const currentYear = now.getFullYear();
    
    if (titleYear && titleYear < currentYear && !hasOpenSignals(pageSignals)) {
      // Pass with past year and no open signals => archived
      return {
        applicationStatus: "closed",
        status: "archived",
        reason: `Pass ${titleYear} in title (year < ${currentYear}) and no open signals`,
      };
    }
    
    // No dates and no evidence => draft
    return {
      applicationStatus: "unknown",
      status: "draft",
      reason: "no dates available",
    };
  }

  // Edge cases:
  // - Only startAt exists and is in past => might be open if no end date
  if (effectiveStartAt && !effectiveEndAt && isPast(effectiveStartAt, now)) {
    if (hasOpenSignals(pageSignals)) {
      return {
        applicationStatus: "open",
        status: "published",
        reason: `startAt (${effectiveStartAt.toISOString()}) is in past with open signals`,
      };
    } else {
      return {
        applicationStatus: "unknown",
        status: "draft",
        reason: `startAt (${effectiveStartAt.toISOString()}) is in past but no end date and no open signals`,
      };
    }
  }

  // - Only endAt exists
  if (!effectiveStartAt && effectiveEndAt) {
    if (isPast(effectiveEndAt, now)) {
      return {
        applicationStatus: "closed",
        status: "archived",
        reason: `endAt (${effectiveEndAt.toISOString()}) is in past`,
      };
    } else if (hasOpenSignals(pageSignals)) {
      return {
        applicationStatus: "open",
        status: "published",
        reason: `endAt (${effectiveEndAt.toISOString()}) is in future with open signals`,
      };
    } else {
      return {
        applicationStatus: "unknown",
        status: "draft",
        reason: `endAt (${effectiveEndAt.toISOString()}) exists but no start date and no open signals`,
      };
    }
  }

  // Check page signals for closed status
  if (hasClosedSignals(pageSignals)) {
    return {
      applicationStatus: "closed",
      status: "archived",
      reason: "page signals indicate closed",
    };
  }

  // Default: unknown + draft
  return {
    applicationStatus: "unknown",
    status: "draft",
    reason: "insufficient evidence",
  };
}

