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
 * Extract date from title (e.g. "7 Φεβρουαρίου")
 */
function extractDateFromTitle(title: string, now: Date): Date | null {
  const greekMonths: Record<string, number> = {
    "ιανουαρίου": 0, "ιανουαριου": 0, "ιαν": 0,
    "φεβρουαρίου": 1, "φεβρουαριου": 1, "φεβ": 1,
    "μαρτίου": 2, "μαρτιου": 2, "μαρ": 2,
    "απριλίου": 3, "απριλιου": 3, "απρ": 3,
    "μαΐου": 4, "μαιου": 4, "μαι": 4,
    "ιουνίου": 5, "ιουνιου": 5, "ιουν": 5,
    "ιουλίου": 6, "ιουλιου": 6, "ιουλ": 6,
    "αυγούστου": 7, "αυγουστου": 7, "αυγ": 7,
    "σεπτεμβρίου": 8, "σεπτεμβριου": 8, "σεπ": 8,
    "οκτωβρίου": 9, "οκτωβριου": 9, "οκτ": 9,
    "νοεμβρίου": 10, "νοεμβριου": 10, "νοε": 10,
    "δεκεμβρίου": 11, "δεκεμβριου": 11, "δεκ": 11
  };

  const lowerTitle = title.toLowerCase();
  // Pattern: [day] [month] (optionally year)
  const dateMatch = lowerTitle.match(/(\d{1,2})\s+([α-ωά-ώ]+)(?:\s+(\d{4}))?/);
  
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const monthName = dateMatch[2];
    const yearStr = dateMatch[3];
    
    const month = greekMonths[monthName];
    if (month !== undefined) {
      const year = yearStr ? parseInt(yearStr, 10) : now.getFullYear();
      const detectedDate = new Date(year, month, day, 23, 59, 59);
      return detectedDate;
    }
  }
  return null;
}

/**
 * Rule-based status computation
 * 
 * Rules (priority order):
 * 1) If applicationEndAt < now => closed + archived
 * 2) Extra guard for Title Dates: if title has a past date => archived
 * 3) If applicationStartAt <= now <= applicationEndAt => open + published
...
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

  // Rule 2: Title Date Guard (Past events detection)
  const titleDate = extractDateFromTitle(title, now);
  if (titleDate && isPast(titleDate, now)) {
    // Small buffer for today's events: if it's today, keep it open until end of day
    const isActuallyPast = compareDatesInAthens(titleDate, now) < 0;
    if (isActuallyPast) {
      return {
        applicationStatus: "closed",
        status: "archived",
        reason: `Title contains past date: ${titleDate.toISOString()}`,
      };
    }
  }

  // Rule 3: If applicationStartAt <= now <= applicationEndAt => open + published
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

  // Rule 4: If no dates: check if it's a real benefit or just a draft
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
    
    // NEW LOGIC: If it's a real kind but no dates, we still want it published as "unknown/permanent"
    // We'll trust the caller to pass signals or we'll assume it's published if it's a known benefit
    return {
      applicationStatus: "unknown",
      status: "published", // Show it as permanent info
      reason: "no dates available but treated as permanent information",
    };
  }

  // Edge cases:
  // - Only startAt exists and is in past => might be open if no end date
  if (effectiveStartAt && !effectiveEndAt && isPast(effectiveStartAt, now)) {
    // If title or signals suggest it started, mark as open
    const titleLower = title.toLowerCase();
    const hasOpenClues = hasOpenSignals(pageSignals) || 
                         titleLower.includes("ξεκίνησαν") || 
                         titleLower.includes("ξεκινησαν") ||
                         titleLower.includes("αιτήσεις") ||
                         titleLower.includes("αιτησεις");

    if (hasOpenClues) {
      return {
        applicationStatus: "open",
        status: "published",
        reason: `startAt (${effectiveStartAt.toISOString()}) is in past with open clues`,
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

