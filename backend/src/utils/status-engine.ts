/**
 * Rule-based Status Engine
 * 
 * Computes applicationStatus and status based on dates and page signals
 */

import { compareDatesInAthens, isPast, isFuture } from "./date-parser";
import { hasClosedLifecycleSignal } from "./lifecycle-signals";

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
  return hasClosedLifecycleSignal(pageSignals.join(" "));
}

/**
 * Check if page signals indicate open status
 */
function hasOpenSignals(pageSignals: string[] = []): boolean {
  // NOTE: "από" and "έως" were intentionally removed — they are too generic
  // (appear in almost any Greek sentence) and caused false "open" readings.
  const openKeywords = [
    "υποβολή αιτήσεων",
    "αιτήσεις",
    "ανοικτό",
    "ανοιχτό",
  ];

  const signalsText = pageSignals.join(" ").toLowerCase();
  return openKeywords.some(keyword => signalsText.includes(keyword.toLowerCase()));
}

/**
 * Compute Greek Orthodox Easter (Meeus Julian algorithm) for a given year.
 * Returns a Date in the Athens timezone (UTC+2/+3).
 */
function getGreekOrthodoxEaster(year: number): Date {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31); // 3 = March, 4 = April
  const day = ((d + e + 114) % 31) + 1;
  // Julian to Gregorian: add 13 days (valid for 1900–2099)
  const julian = new Date(year, month - 1, day + 13, 23, 59, 59);
  return julian;
}

/**
 * Resolve Greek religious holiday aliases to calendar dates.
 * Returns null if the alias is not recognised.
 */
function resolveGreekHolidayAlias(alias: string, year: number): Date | null {
  const easter = getGreekOrthodoxEaster(year);
  const easterMs = easter.getTime();
  const day = 24 * 60 * 60 * 1000;

  const map: Record<string, Date> = {
    // Holy Week
    "μ. δευτέρα":   new Date(easterMs - 6 * day),
    "μ. τρίτη":     new Date(easterMs - 5 * day),
    "μ. τεταρτη":   new Date(easterMs - 4 * day),
    "μ. πεμπτη":    new Date(easterMs - 3 * day),
    "μεγαλη παρασκευη": new Date(easterMs - 2 * day),
    "μ. παρασκευη": new Date(easterMs - 2 * day),
    "μεγαλο σαββατο": new Date(easterMs - 1 * day),
    "μ. σαββατο":   new Date(easterMs - 1 * day),
    // Easter & close feasts
    "πασχα":        easter,
    "πάσχα":        easter,
    "κυριακη πασχα": easter,
    "δευτερα πασχα": new Date(easterMs + 1 * day),
    "αναληψη":      new Date(easterMs + 39 * day),
    "πεντηκοστη":   new Date(easterMs + 49 * day),
    "αγιο πνευμα":  new Date(easterMs + 50 * day),
    // Fixed feasts (month/day, year provided by caller)
    "χριστουγεννα": new Date(year, 11, 25, 23, 59, 59),
    "χριστούγεννα": new Date(year, 11, 25, 23, 59, 59),
    "πρωτοχρονια":  new Date(year, 0, 1, 23, 59, 59),
    "πρωτοχρονιά":  new Date(year, 0, 1, 23, 59, 59),
    "θεοφανεια":    new Date(year, 0, 6, 23, 59, 59),
    "15 αυγουστου": new Date(year, 7, 15, 23, 59, 59),
    "28 οκτωβριου": new Date(year, 9, 28, 23, 59, 59),
    "25 μαρτιου":   new Date(year, 2, 25, 23, 59, 59),
  };

  // Normalise: strip accents, lowercase, collapse spaces
  const norm = alias
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return map[norm] ?? null;
}

/**
 * Extract date from title (e.g. "7 Φεβρουαρίου" or "έως Πάσχα")
 */
function extractDateFromTitle(title: string, now: Date): Date | null {
  const greekMonths: Record<string, number> = {
    "ιανουάριος": 0, "ιανουαρίου": 0, "ιανουαριου": 0, "ιαν": 0,
    "φεβρουάριος": 1, "φεβρουαρίου": 1, "φεβρουαριου": 1, "φεβ": 1,
    "μάρτιος": 2, "μαρτίου": 2, "μαρτιου": 2, "μαρ": 2,
    "απρίλιος": 3, "απριλίου": 3, "απριλιου": 3, "απρ": 3,
    "μάιος": 4, "μαΐου": 4, "μαιου": 4, "μαι": 4,
    "ιούνιος": 5, "ιουνίου": 5, "ιουνιου": 5, "ιουν": 5,
    "ιούλιος": 6, "ιουλίου": 6, "ιουλιου": 6, "ιουλ": 6,
    "αύγουστος": 7, "αυγούστου": 7, "αυγουστου": 7, "αυγ": 7,
    "σεπτέμβριος": 8, "σεπτεμβρίου": 8, "σεπτεμβριου": 8, "σεπ": 8,
    "οκτώβριος": 9, "οκτωβρίου": 9, "οκτωβριου": 9, "οκτ": 9,
    "νοέμβριος": 10, "νοεμβρίου": 10, "νοεμβριου": 10, "νοε": 10,
    "δεκέμβριος": 11, "δεκεμβρίου": 11, "δεκεμβριου": 11, "δεκ": 11
  };

  const lowerTitle = title.toLowerCase();
  const year = now.getFullYear();

  // Pattern 0: Greek religious holiday aliases (e.g. "Πάσχα", "Μ. Τρίτη")
  // Matches patterns like "έως Πάσχα", "μέχρι Μ. Τρίτη", "έως τα Χριστούγεννα"
  const holidayPatterns = [
    /(?:έως|εως|μέχρι|μεχρι|ως|πριν από|προ)\s+(?:τα?\s+|της?\s+)?([Μμ]\.\s*[α-ωά-ώΑ-ΩΆ-Ώ]{3,20})/u,
    /(?:έως|εως|μέχρι|μεχρι|ως)\s+(?:τα?\s+|της?\s+)?([α-ωά-ώΑ-ΩΆ-Ώ]{4,20}(?:\s+[α-ωά-ώΑ-ΩΆ-Ώ]{3,20})?)/u,
  ];
  for (const pat of holidayPatterns) {
    const m = lowerTitle.match(pat);
    if (m) {
      const resolved = resolveGreekHolidayAlias(m[1].trim(), year);
      if (resolved) return resolved;
    }
  }

  // Pattern 1: [day] [Greek Month Name] (e.g. "7 Φεβρουαρίου")
  const dateMatch = lowerTitle.match(/(\d{1,2})\s+([α-ωά-ώ]{3,15})(?:\s+(\d{4}))?/);
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const monthName = dateMatch[2];
    const yearStr = dateMatch[3];

    // Find month index by checking if our map keys include the monthName
    const monthEntry = Object.entries(greekMonths).find(([key]) => monthName.startsWith(key.substring(0, 3)));

    if (monthEntry) {
      const month = monthEntry[1];
      const yr = yearStr ? parseInt(yearStr, 10) : year;
      return new Date(yr, month, day, 23, 59, 59);
    }
  }

  // Pattern 2: DD/MM/YYYY or DD/MM
  const numericMatch = lowerTitle.match(/(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?/);
  if (numericMatch) {
    const day = parseInt(numericMatch[1], 10);
    const month = parseInt(numericMatch[2], 10) - 1;
    let yr = numericMatch[3] ? parseInt(numericMatch[3], 10) : year;
    if (yr < 100) yr += 2000;
    return new Date(yr, month, day, 23, 59, 59);
  }

  return null;
}

/**
 * Rule-based status computation
 * 
 * Rules (priority order):
 * 1) If applicationEndAt < now => closed + archived
 * 2) Title Date Guard: if title has a past date => archived (MOVED UP)
 * 3) If applicationStartAt <= now <= applicationEndAt => open + published
 * 4) If applicationStartAt > now => upcoming + published
 * 5) If no dates: check if it's a real benefit or just a draft
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

  // Explicit closure evidence is authoritative even when no deadline was
  // extracted. This must run before the no-date branches, which all return.
  if (hasClosedSignals(pageSignals)) {
    return {
      applicationStatus: "closed",
      status: "archived",
      reason: "page signals indicate closed",
    };
  }

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
  const hasActiveApplicationWindow =
    !!effectiveStartAt &&
    !!effectiveEndAt &&
    compareDatesInAthens(effectiveStartAt, now) <= 0 &&
    compareDatesInAthens(effectiveEndAt, now) >= 0;
  if (!hasActiveApplicationWindow && titleDate && isPast(titleDate, now)) {
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

  // Rule 4: If applicationStartAt > now => upcoming + published (or draft if insufficient evidence)
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

  // Rule 5: If no dates: check if it's a real benefit or just a draft
  if (!effectiveStartAt && !effectiveEndAt) {
    // Extra guard for "Pass 2025"
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
    
    // If it's a real kind but no dates, we still want it published as "unknown/permanent"
    const realKinds = ["benefit", "program", "voucher_pass"];
    // Note: pageSignals or title-based extraction could still mark it as archived if it's old
    
    // Check if the current item kind is in realKinds
    // Since kind is not in StatusInputs, we'll check common keywords in title as a proxy
    const lowerTitle = title.toLowerCase();
    const isLikelyRealBenefit = 
      lowerTitle.includes("επίδομα") || 
      lowerTitle.includes("πρόγραμμα") || 
      lowerTitle.includes("pass") || 
      lowerTitle.includes("voucher");

    if (isLikelyRealBenefit) {
      return {
        applicationStatus: "unknown",
        status: "published", 
        reason: "no dates available but treated as permanent information",
      };
    }

    // Default for news/others without dates: draft
    return {
      applicationStatus: "unknown",
      status: "draft",
      reason: "no dates available and not a primary benefit kind",
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

  // Default: unknown + draft
  return {
    applicationStatus: "unknown",
    status: "draft",
    reason: "insufficient evidence",
  };
}
