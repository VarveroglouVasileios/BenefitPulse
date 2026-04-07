/**
 * Data Cleaner & Validator for BenefitPulse
 * 
 * Transforms raw items from official sources into clean Opportunities
 * with strict validation, date extraction, and status determination.
 * 
 * AUSTERE RULES:
 * - NO guessing or filling in missing data
 * - NO published status for closed/expired items
 * - NO "open" status without evidence
 * - NO "official" designation without official domain
 * - Returns ONLY JSON (no text outside JSON)
 */

// Official domains whitelist (trust rule)
const OFFICIAL_DOMAINS = new Set([
  "gov.gr",
  "www.gov.gr",
  "vouchers.gov.gr",
  "www.vouchers.gov.gr",
  "opeka.gr",
  "www.opeka.gr",
  "dypa.gov.gr",
  "www.dypa.gov.gr",
  "e-efka.gov.gr",
  "www.e-efka.gov.gr",
  "efka.gov.gr",
  "www.efka.gov.gr",
  "stegasi.gov.gr",
  "www.stegasi.gov.gr",
  "stegastiko.minedu.gov.gr",
  "www.stegastiko.minedu.gov.gr",
  "aade.gr",
  "www.aade.gr",
  "asep.gr",
  "www.asep.gr",
  "info.asep.gr",
]);

// Service info / menu / landing page keywords (reject these)
const SERVICE_INFO_KEYWORDS = [
  // Navigation/menu
  "μετάβαση στο περιεχόμενο",
  "skip to content",
  "skip to main",
  "menu",
  "μενού",
  "menou",
  "navigation",
  "links",
  "sitemap",
  "site map",
  
  // Categories/landing pages
  "υγεία και πρόνοια",
  "φορολογία πολιτών",
  "κτηματολόγιο",
  "ηλεκτρονικές υπηρεσίες",
  "συχνές ερωτήσεις",
  "faq",
  "ερωτήσεις",
  "πολιτική απορρήτου",
  "privacy",
  "cookies",
  "σχετικά",
  "σχετικα",
  "οικονομικά στοιχεία",
  "προϋπολογισμός",
  "προϋπολογισμος",
  // "διαγωνισμοί", // Removed: Essential for ASEP
  // "διαγωνισμος", // Removed: Essential for ASEP
  "είσοδος",
  "σύνδεση στην υπηρεσία",
  "συνδεση στην υπηρεσια",
  "login",
  "εγγραφή",
  "register",
  
  // Pure info pages
  "πολιτική",
  "πολιτικη",
  "δήλωση",
  "δηλωση",
  "στατιστικά",
  "στατιστικα",
  "κατάλογος",
  "καταλογος",
  "επιδόματα-βοηθήματα",
  "επιδomata-boithimata",
  "epidomata-boithimata",
  "more-anerghia",
  "europeanyearofskills",
  
  // Administrative / Corporate News (ASEP/Public bodies)
  "ετήσια έκθεση",
  "ετησια εκθεση",
  "παράδοση έκθεσης",
  "παραδοση εκθεσης",
  "απολογισμός",
  "πεπραγμένα",
  "επίσκεψη",
  "επισκεψη",
  "συνάντηση",
  "συναντηση",
  
  // Gov.gr Digital Assistant / Language Switcher noise
  "digital assistant",
  "ψηφιακός βοηθός",
  "ψηφιακος βοηθος",
  "english",
  "ελληνικά",
  "ελληνικα",
  "3.900.000+",
  "chats beta",
];

// Closed/completed indicators (enhanced for ΔΥΠΑ)
const CLOSED_KEYWORDS = [
  "ολοκληρώθηκαν",
  "ολοκληρωθηκαν",
  "ολοκληρώθηκε",
  "ολοκληρωθηκε",
  "έληξε",
  "εληξε",
  "έκλεισε",
  "εκλεισε",
  "τελείωσε",
  "τελειωσε",
  "κλειστό",
  "κλειστο",
  "μη διαθέσιμο",
  "μη διαθεσιμο",
  "δεν δέχεται αιτήσεις",
  "δεν δεχεται αιτησεις",
  "η προθεσμία έληξε",
  "η προθεσμια εληξε",
  "ολοκλήρωση αιτήσεων",
  "ολοκληρωση αιτησεων",
  "ολοκλήρωση υποβολής",
  "ολοκληρωση υποβολης",
  "completed",
  "closed",
  "ended",
  "finished",
];

// Open/active indicators - ENHANCED with more patterns
const OPEN_KEYWORDS = [
  "ανοικτή",
  "ανοιχτη",
  "ανοικτή η πλατφόρμα",
  "ανοιχτη η πλατφορμα",
  "υποβάλλονται αιτήσεις",
  "υποβαλλονται αιτησεις",
  "αιτήσεις έως",
  "αιτησεις εως",
  "ανοίγει",
  "ανοιγει",
  "ξεκινάει",
  "ξεκιναει",
  "σε εξέλιξη",
  "σε εξελιξη",
  "applications open",
  "platform is open",
  "submissions accepted",
  "accepting applications",
  // Additional patterns
  "είσοδος στην εφαρμογή",
  "εισοδος στην εφαρμογη",
  "είσοδος στην πλατφόρμα",
  "εισοδος στην πλατφορμα",
  "συμπλήρωση αιτήσεων",
  "συμπληρωση αιτησεων",
  "υποβολή αιτήσεων",
  "υποβολη αιτησεων",
  "διαθέσιμο",
  "διαθεσιμο",
  "ενεργό",
  "ενεργο",
  "τρέχον",
  "τρέχον",
  "τρέχον πρόγραμμα",
  "τρέχον προγραμμα",
  "ανοιχτό πρόγραμμα",
  "ανοιχτο προγραμμα",
];

// Upcoming indicators (enhanced for ΔΥΠΑ)
const UPCOMING_KEYWORDS = [
  "έναρξη αιτήσεων",
  "εναρξη αιτησεων",
  "ανοίγει στις",
  "ανοιγει στις",
  "θα ανοίξει",
  "θα ανοιξει",
  "θα ξεκινήσει",
  "θα ξεκινησει",
  "θα προκηρυχθεί",
  "θα προκηρυχθει",
  "αναμένεται",
  "αναμενεται",
  "άνοιγμα πλατφόρμας",
  "ανοιγμα πλατφορμας",
  "ξεκινάει στις",
  "ξεκιναει στις",
  "από",
  "απο",
  "starts on",
  "will open",
  "opening on",
];

// Greek month names
const GREEK_MONTHS: Record<string, number> = {
  ιανουαρίου: 0, ιανουάριος: 0,
  φεβρουαρίου: 1, φεβρουάριος: 1,
  μαρτίου: 2, μάρτιος: 2,
  απριλίου: 3, απρίλιος: 3,
  μαΐου: 4, μάιος: 4,
  ιουνίου: 5, ιούνιος: 5,
  ιουλίου: 6, ιούλιος: 6,
  αυγούστου: 7, αύγουστος: 7,
  σεπτεμβρίου: 8, σεπτέμβριος: 8,
  οκτωβρίου: 9, οκτώβριος: 9,
  νοεμβρίου: 10, νοέμβριος: 10,
  δεκεμβρίου: 11, δεκέμβριος: 11,
};

export interface CleanerInput {
  nowIso: string; // Current date/time ISO
  source: string; // Source name
  sourceUrl: string; // Source page/root URL
  itemUrl: string; // Item URL
  rawTitle: string;
  rawContent: string; // Text/HTML converted text
  rawFetchedAtIso: string;
  rawHtmlHints?: {
    snippets?: string[];
    meta?: Record<string, string>;
    headings?: string[];
  };
}

export interface CleanerOutput {
  title: string;
  summary: string;
  officialUrl: string;
  source: string;
  kind: "benefit" | "voucher_pass" | "program" | "service_info" | "decision" | "tender" | "news";
  type: "subsidy" | "voucher" | "program" | "public_call" | "asep_competition" | "manual" | "decision";
  applicationStatus: "open" | "closed" | "expired" | "upcoming" | "unknown" | "results" | "news";
  startAt: string | null;
  deadlineAt: string | null;
  // New date fields
  announcedAt: string | null;
  applicationStartAt: string | null;
  applicationEndAt: string | null;
  status: "published" | "draft" | "archived" | "rejected";
  tags: string[];
  criteriaUnknown: boolean;
  confidence: number;
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
  evidence: {
    statusSignals: string[];
    dateSignals: string[];
    notes: string[];
  };
}

/**
 * Extract domain from URL
 */
function getDomain(url: string): string | null {
  try {
    const u = new URL(url);
    return u.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Check if domain is in official whitelist
 */
function isOfficialDomain(url: string): boolean {
  const domain = getDomain(url);
  return domain ? OFFICIAL_DOMAINS.has(domain) : false;
}

/**
 * Check override rules (applied before service_info check)
 * Returns override result if rule matches, null otherwise
 */
function checkOverrideRules(
  title: string,
  content: string,
  url: string
): {
  kind: "benefit" | "tender" | "news";
  type: "subsidy" | "manual";
  status: "published" | "draft";
  reason: string;
  tags?: string[];
} | null {
  const lowerTitle = title.toLowerCase();
  const lowerContent = content.toLowerCase();
  const lowerUrl = url.toLowerCase();
  
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase().replace(/^www\./, "");
    const pathname = urlObj.pathname.toLowerCase();
    
    // Override 1: AADE myΘέρμανση
    // Treat the main myΘέρμανση landing page as informational (news),
    // not as an "upcoming" benefit opportunity. Year-specific calls
    // will appear as separate announcements.
    if (
      domain === "aade.gr" &&
      pathname.includes("/mythermansi") &&
      (lowerTitle.includes("επίδομα θέρμανσης") ||
       lowerTitle.includes("επιδομα θερμανσης") ||
       lowerTitle.includes("myθέρμανση") ||
       lowerTitle.includes("mythermansi") ||
       lowerContent.includes("επίδομα θέρμανσης") ||
       lowerContent.includes("επιδομα θερμανσης") ||
       lowerContent.includes("myθέρμανση") ||
       lowerContent.includes("mythermansi"))
    ) {
        return {
          kind: "news",
          type: "manual",
          status: "published",
          reason: "AADE myΘέρμανση info page (news, not direct opportunity)",
          tags: ["θέρμανση", "επίδομα", "aade"],
        };
    }
    
    // Override 1b: ΔΥΠΑ Κοινωνικός Τουρισμός
    // Treat the main Κοινωνικός Τουρισμός page as informational/news.
    if (
      domain === "dypa.gov.gr" &&
      pathname.includes("/koinonikos-toyrismos")
    ) {
      return {
        kind: "news",
        type: "manual",
        status: "published",
        reason: "DYPA Κοινωνικός Τουρισμός info page (news, not direct opportunity)",
        tags: ["κοινωνικός τουρισμός", "voucher", "διακοπές"],
      };
    }
    
    // Override 2: Tenders/Procurements
    const tenderKeywords = [
      "προσφορ",
      "ανάδειξη αναδόχου",
      "αναδειξη αναδοχου",
      "προμήθεια",
      "προμηθεια",
      "ν.4412/2016",
      "διαπραγμάτευση",
      "διαπραγματευση",
      "σύμβαση",
      "συμβαση",
      "cpv",
    ];
    
    const isTender = tenderKeywords.some(
      (kw) =>
        lowerTitle.includes(kw) ||
        lowerContent.includes(kw) ||
        pathname.includes(kw.replace(/\s+/g, "-"))
    );
    
    if (isTender) {
      return {
        kind: "tender",
        type: "manual",
        status: "published",
        reason: "Tender/procurement detected",
        tags: ["προμήθεια", "διαγωνισμός"],
      };
    }
    
    // Override 3: Beneficiaries questionnaire (news, not opportunity)
    const questionnaireKeywords = [
      "ερωτηματολόγιο ωφελουμένων",
      "ερωτηματολογιο ωφελουμενων",
      "συμπλήρωση ερωτηματολογίου",
      "συμπληρωση ερωτηματολογιου",
    ];
    
    const isQuestionnaire = questionnaireKeywords.some(
      (kw) => lowerTitle.includes(kw) || lowerContent.includes(kw)
    );
    
    if (isQuestionnaire) {
      return {
        kind: "news",
        type: "manual",
        status: "published",
        reason: "Beneficiaries questionnaire (news, not opportunity)",
        tags: ["ερωτηματολόγιο", "ενημέρωση"],
      };
    }

    // Override 4: Past Events / Press Releases (News)
    const pressReleaseKeywords = [
      "συμμετείχε",
      "συμμετειχε",
      "πραγματοποιήθηκε",
      "πραγματοποιηθηκε",
      "παραβρέθηκε",
      "παραβρεθηκε",
      "συνάντηση",
      "συναντηση",
      "επίσκεψη",
      "επισκεψη",
      "εθιμοτυπική",
      "παρουσίαση",
      "ημερίδα",
      "συνέντευξη",
      "δελτίο τύπου",
    ];

    const isPressRelease = pressReleaseKeywords.some(
      (kw) => lowerTitle.includes(kw)
    );

    if (isPressRelease) {
      return {
        kind: "news",
        type: "manual",
        status: "published", // News are published
        reason: "Press release / Past event detected",
        tags: ["δελτίο τύπου", "ενημέρωση", "news"],
      };
    }
  } catch {
    // URL parsing failed, skip override
  }
  
  return null;
}

/**
 * Check if content is service info / menu / landing page
 */
function isServiceInfo(title: string, content: string, url: string): boolean {
  const lowerTitle = title.toLowerCase();
  const lowerContent = content.toLowerCase();
  const lowerUrl = url.toLowerCase();

  // EXCEPTION: AADE myΘέρμανση should NOT be rejected
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase().replace(/^www\./, "");
    const pathname = urlObj.pathname.toLowerCase();
    
    if (
      domain === "aade.gr" &&
      pathname.includes("/mythermansi") &&
      (lowerTitle.includes("επίδομα θέρμανσης") ||
       lowerTitle.includes("επιδομα θερμανσης") ||
       lowerTitle.includes("myθέρμανση") ||
       lowerContent.includes("επίδομα θέρμανσης") ||
       lowerContent.includes("myθέρμανση"))
    ) {
      return false; // Don't reject myΘέρμανση
    }
  } catch {
    // URL parsing failed, continue with normal check
  }

  // Check for service info keywords in TITLE and URL only
  // (Content check is too aggressive as these keywords appear in footers/headers)
  for (const keyword of SERVICE_INFO_KEYWORDS) {
    if (
      lowerTitle.includes(keyword) ||
      lowerUrl.includes(keyword.replace(/\s+/g, "-"))
    ) {
      return true;
    }
  }

  // SPECIAL: Reject if content is PURE noise from gov.gr assistant
  const noiseKeywords = ["3.900.000+ chats", "digital assistant", "ψηφιακός βοηθός"];
  if (noiseKeywords.some(kw => lowerContent.includes(kw) && content.length < 1500)) {
    return true;
  }

  // Check if content is too short (likely boilerplate)
  // BUT: Don't reject if we have valid title+url (will fetch details later)
  if (content.trim().length < 100) {
    // Only reject if title is also too short or navigation-like
    if (title.trim().length < 20 || lowerTitle === "περιεχόμενο" || lowerTitle === "content") {
      return true;
    }
    // Otherwise, keep it but mark as needsFetchDetails (handled elsewhere)
  }

  // Check if title is navigation-like
  if (
    lowerTitle.includes("→") ||
    lowerTitle.includes(">") ||
    lowerTitle === "περιεχόμενο" ||
    lowerTitle === "content"
  ) {
    return true;
  }

  return false;
}

/**
 * Parse Greek/English dates from text
 * Uses unified date parser
 */
function parseDate(
  text: string,
  now: Date
): { date: Date | null; matchedText: string } {
  const { parseDate: unifiedParseDate } = require("../../utils/date-parser");
  const result = unifiedParseDate(text, now);
  
  // Handle Greek date without year (special case for cleaner)
  if (!result.date && text.trim()) {
    const cleanText = text.trim();
    const greekDateNoYear = /(\d{1,2})\s+([α-ωάέήίόύώ]+)(?:\s|$|,|\.)/i;
    const match = cleanText.match(greekDateNoYear);
    if (match) {
      const day = parseInt(match[1], 10);
      const monthName = match[2].toLowerCase().trim();
      const month = GREEK_MONTHS[monthName];
      if (month !== undefined) {
        let year = now.getFullYear();
        let date = new Date(year, month, day);
        
        // If date is in past and we're looking at deadline context, it might be expired
        // But if we're looking at start context, it might be next year
        if (date < now) {
          // Check context - if "ολοκληρώθηκαν" or "έληξε", keep current year
          // Otherwise, try next year
          const contextIsPast = cleanText.toLowerCase().includes("ολοκληρώθηκαν") ||
                                cleanText.toLowerCase().includes("έληξε") ||
                                cleanText.toLowerCase().includes("έκλεισε");
          if (!contextIsPast) {
            year = now.getFullYear() + 1;
            date = new Date(year, month, day);
          }
        }
        
        if (!isNaN(date.getTime())) {
          return { date, matchedText: match[0] };
        }
      }
    }
  }
  
  return { 
    date: result.date ? normalizeDate(result.date) : null, 
    matchedText: result.matchedText || result.rawDate 
  };
}

// Import unified date parser utilities
import { parseDate as unifiedParseDate, normalizeDate } from "../../utils/date-parser";

/**
 * Extract dates from content
 */
/**
 * Extract dates from content
 */
export function extractDates(
  content: string,
  now: Date
): {
  startAt: Date | null;
  deadlineAt: Date | null;
  dateSignals: string[];
} {
  const lowerContent = content.toLowerCase();
  let startAt: Date | null = null;
  let deadlineAt: Date | null = null;
  const dateSignals: string[] = [];

  // Pattern: "Οι αιτήσεις ολοκληρώθηκαν την [date]" (enhanced for ΔΥΠΑ)
  const completedPattern = /(?:οι\s+αιτήσεις|η\s+πλατφόρμα|αιτήσεις|η\s+προθεσμία)\s+(?:ολοκληρώθηκαν|έληξε|έκλεισε)[^\.\n]{0,150}(?:την|στις|στην|έως|μέχρι)?\s*([^\.\n]{0,80})/gi;
  const completedMatches = [...content.matchAll(completedPattern)];
  for (const match of completedMatches) {
    const dateStr = match[1] || match[0];
    const { date, matchedText } = parseDate(dateStr, now);
    if (date && !deadlineAt) {
      deadlineAt = date;
      dateSignals.push(`"${match[0].substring(0, 120)}"`);
    }
  }

  // Pattern: "Προθεσμία υποβολής έως [date]" or "Αιτήσεις έως [date]" (enhanced for ΔΥΠΑ)
  const deadlinePatterns = [
    // "Υποβολή αιτήσεων/ενστάσεων από ... έως ..."
    /(?:υποβολή|υποβάλλονται|υποβαλλονται)\s+(?:αιτήσεων|αιτησεων|ενστάσεων|ενστασεων|αιτήσεις|αιτησεις|ενστάσεις|ενστασεις)\s+(?:από|απο|στο|στην|στον)?[\s\S]{0,100}?(?:από|απο)[\s:]+([^έως\n]{0,80})\s+(?:έως|μέχρι|μέχρι\s+και|εως)[\s:]+([^\.\n]{0,80})/gi,
    // "Ενστάσεις ... έως ..."
    /(?:ενστάσεις|ενστασεις)\s+(?:υποβάλλονται|γίνονται δεκτές)?[\s\S]{0,100}?(?:έως|μέχρι|μέχρι\s+και|εως)[\s:]+([^\.\n]{0,80})/gi,
    // "Προθεσμία υποβολής έως ..."
    /(?:προθεσμία|αιτήσεις|λήξη|καταληκτική\s+ημερομηνία|υποβολή\s+αιτήσεων)\s+(?:έως|μέχρι|μέχρι\s+και|έως\s+και|έκλεισε|έληξε)[\s:]+([^\.\n]{0,80})/gi,
    // Specific pattern for Fuel Pass style: "από 6/4 έως 30/4"
    /(?:από|απο)[\s:]*(\d{1,2}[\/\-\.]\d{1,2}(?:[\/\-\.]\d{2,4})?)\s+(?:έως|εως|μέχρι|μεχρι)[\s:]*(\d{1,2}[\/\-\.]\d{1,2}(?:[\/\-\.]\d{2,4})?)/gi,
    // "Προθεσμία/Προθεσμίες" directly followed by a date (no "έως" required)
    // e.g. "Προθεσμίες 5η Δεκεμβρίου 2025, για υποβολή αίτησης"
    /(?:προθεσμία|προθεσμίες|προθεσμιες|προθεσμια)\s*:?\s*(\d{1,2}(?:η|ης|ου|ος)?\s+[α-ωά-ώ]+\s+\d{4})/gi,
    // Greek date followed by application context: "5η Δεκεμβρίου 2025, για υποβολή αίτησης"
    /(\d{1,2}(?:η|ης|ου|ος)?\s+[α-ωά-ώ]+\s+\d{4})[,\s]+(?:για\s+(?:υποβολή|υποβολη)\s+(?:αίτησης|αιτησης|αιτήσεων|αιτησεων))/gi,
    // Greek date followed by deadline context: "5η Δεκεμβρίου 2025, λήξη υποβολής"
    /(\d{1,2}(?:η|ης|ου|ος)?\s+[α-ωά-ώ]+\s+\d{4})[,\s]+(?:λήξη|ληξη|καταληκτική|καταληκτικη)/gi,
    // DD/MM/YYYY format directly after "Προθεσμία"
    /(?:προθεσμία|προθεσμίες|προθεσμιες|προθεσμια)\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/gi,
    // "Παράταση έως ..."
    /(?:παράταση|παραταση)\s+(?:έως|μέχρι|έως\s+και|μέχρι\s+και)[\s:]+([^\.\n]{0,80})/gi,
    // "Παρατείνεται ... έως ..." (Long distance)
    /(?:παρατείνεται|παρατεινεται)\s+(?:[^.]{0,100})\s+(?:έως|μέχρι|έως\s+και|μέχρι\s+και)[\s:]+([^\.\n]{0,80})/gi,
    // "Η δράση έληξε/ολοκληρώθηκε"
    /(?:η\s+δράση|η\s+δραση|οι\s+αιτήσεις|οι\s+αιτησεις)\s+(?:έληξε|εληξε|ολοκληρώθηκε|ολοκληρωθηκε)[\s:]+([^\.\n]{0,80})/gi,
    /(?:η\s+πλατφόρμα|πλατφόρμα)\s+(?:θα\s+παραμείνει|παραμένει)\s+(?:ανοικτή|κλειστή)\s+(?:έως|μέχρι|έως\s+και|μέχρι\s+και)[\s:]+([^\.\n]{0,80})/gi,
    /(?:από|έναρξη)[\s:]+([^έως\n]{0,80})\s+έως[\s:]+([^\.\n]{0,80})/gi,
    // Enhanced: "λήγει ... στις 23:59" or "προθεσμία ... στις 23:59"
    /(?:λήγει|ληγει|λήξει|ληξει|έληξε|εληξε|προθεσμία|προθεσμια)[\s:]+([^\.\n]{0,100})(?:[\s:]+στις[\s:]+(\d{1,2}):(\d{2}))/gi,
    // ΔΥΠΑ specific: "ώρα 23:59" patterns (handling "και ώρα")
    /(?:έως|μέχρι|έως\s+και|μέχρι\s+και)[\s:]+([^\.\n]{0,60})\s+(?:και\s+)?(?:ώρα|ωρα)[\s:]+(\d{1,2}):(\d{2})/gi,
  ];

  for (const pattern of deadlinePatterns) {
    const matches = [...content.matchAll(pattern)];
    for (const match of matches) {
      // Check if pattern has time component (23:59 format)
      const hasTime = match[2] && match[3] && /^\d{1,2}:\d{2}$/.test(`${match[2]}:${match[3]}`);
      
      // Last capture group is usually the date (or second-to-last if time is present)
      const dateStr = hasTime ? match[1] : (match.slice(1).filter(Boolean).pop() || match[0]);
      const { date, matchedText } = parseDate(dateStr, now);
      
      if (date) {
        // If time specified (23:59), set to that time
        if (hasTime) {
          const hours = parseInt(match[2], 10);
          const minutes = parseInt(match[3], 10);
          date.setUTCHours(hours, minutes, 59, 999);
        } else {
          // Default to end of day if no time specified
          date.setUTCHours(23, 59, 59, 999);
        }
        
        // Logic for "from X to Y" patterns
        if ((pattern.source.includes("από") || pattern.source.includes("απο")) && match[1] && match[2]) {
          const startStr = match[1];
          const endStr = match[2];
          const { date: startDate } = parseDate(startStr, now);
          const { date: endDate } = parseDate(endStr, now);
          
          if (startDate && !startAt) {
            startAt = startDate;
            dateSignals.push(`Start found in "from...to" pattern: ${startStr}`);
          }
          // For explicit "from...to" windows, keep the latest end date as deadline.
          if (endDate && (!deadlineAt || endDate > deadlineAt)) {
            deadlineAt = endDate;
            deadlineAt.setUTCHours(23, 59, 59, 999);
            dateSignals.push(`Deadline found in "from...to" pattern: ${endStr}`);
          }
          continue; // Move to next pattern
        }

        // When multiple deadline candidates exist, prefer the latest one.
        // This avoids selecting opening dates (e.g. "από 6/4") as final deadline.
        if (!deadlineAt || date > deadlineAt) {
          deadlineAt = date;
          dateSignals.push(`Deadline: "${match[0].substring(0, 120)}"`);
        }
      }
    }
  }

  // Pattern: "Έναρξη [date]" or "Ανοίγει [date]" (enhanced for ΔΥΠΑ)
  const startPatterns = [
    /(?:έναρξη|ανοίγει|ξεκινάει|θα\s+ξεκινήσει|θα\s+ανοίξει|από)[\s:]+([^έως\n]{0,80})/gi,
    /(?:άνοιγμα\s+πλατφόρμας|ανοιγμα\s+πλατφορμας)[\s:]+([^\.\n]{0,80})/gi,
  ];

  for (const pattern of startPatterns) {
    const matches = [...content.matchAll(pattern)];
    for (const match of matches) {
      const dateStr = match[1];
      const { date } = parseDate(dateStr, now);
      if (date && !startAt) {
        startAt = date;
        dateSignals.push(`"${match[0].substring(0, 120)}"`);
      }
    }
  }

  return { startAt, deadlineAt, dateSignals };
}

/**
 * Determine application status
 */
export function determineApplicationStatus(
  content: string,
  startAt: Date | null,
  deadlineAt: Date | null,
  now: Date,
  title?: string,
  sourceUrl?: string
): {
  status: "open" | "closed" | "expired" | "upcoming" | "unknown" | "results" | "news";
  statusSignals: string[];
  applicationStartAt?: Date | null;
  applicationEndAt?: Date | null;
} {
  const lowerContent = content.toLowerCase();
  const lowerTitle = (title || "").toLowerCase();
  const lowerUrl = (sourceUrl || "").toLowerCase();
  const statusSignals: string[] = [];
  
  // Special rule for Pass items with year in title (e.g., "Thessaly-Evros Pass 2025")
  // STRICT: If year in title is before current year OR deadline is in past → expired/closed
  const yearMatch = lowerTitle.match(/\b(20\d{2})\b/) || lowerContent.match(/\b(20\d{2})\b/);
  const isPassWithYear = (lowerTitle.includes("pass") && yearMatch) ||
                         (lowerContent.includes("pass") && yearMatch);
  
  if (isPassWithYear) {
    const currentYear = now.getFullYear();
    const titleYear = yearMatch ? parseInt(yearMatch[1], 10) : null;
    
    // Rule 1: If year in title is before current year → expired
    if (titleYear && titleYear < currentYear) {
      statusSignals.push(`Pass with year ${titleYear} in title is before current year ${currentYear}`);
      return { status: "expired", statusSignals, applicationStartAt: startAt, applicationEndAt: deadlineAt };
    }
    
    // Rule 2: If deadline is in past → expired
    if (deadlineAt && deadlineAt < now) {
      statusSignals.push(`Pass with year in title and deadline ${deadlineAt.toISOString()} is in past`);
      return { status: "expired", statusSignals, applicationStartAt: startAt, applicationEndAt: deadlineAt };
    }
    
    // Rule 3: If applicationEndAt is in past → expired
    // Note: We need to check applicationEndAt separately if it's different from deadlineAt
    // For now, deadlineAt check above covers this case
    
    // Rule 4: If year is current year but no dates and it's past mid-year → likely expired
    // (Pass programs typically run in first half of year)
    if (titleYear === currentYear && !deadlineAt && !startAt) {
      const currentMonth = now.getMonth(); // 0-11
      if (currentMonth >= 6) { // July onwards
        statusSignals.push(`Pass ${titleYear} with no dates detected after mid-year → expired`);
        return { status: "expired", statusSignals, applicationStartAt: null, applicationEndAt: null };
      }
    }
  }

  // NEW Rule: Detect expired Greek months in title (e.g. "ΦΕΒΡΟΥΑΡΙΟΣ 2026" on March 26)
  const greekMonths = [
    "ιανουάριος", "ιανουαριος", "ιανουαρίου", "ιανουαριου",
    "φεβρουάριος", "φεβρουαριος", "φεβρουαρίου", "φεβρουαριου",
    "μάρτιος", "μαρτιος", "μαρτίου", "μαρτιου",
    "απρίλιος", "απριλιος", "απριλίου", "απριλιου",
    "μάιος", "μαιος", "μαΐου", "μαιου",
    "ιούνιος", "ιουνιος", "ιουνίου", "ιουνιου",
    "ιούλιος", "ιουλιος", "ιουλίου", "ιουλιου",
    "αύγουστος", "αυγουστος", "αυγούστου", "αυγουστου",
    "σεπτέμβριος", "σεπτεμβριος", "σεπτεμβρίου", "σεπτεμβριου",
    "οκτώβριος", "οκτωβριος", "οκτωβρίου", "οκτωβριου",
    "νοέμβριος", "νοεμβριος", "νοεμβρίου", "νοεμβριου",
    "δεκέμβριος", "δεκεμβριος", "δεκεμβρίου", "δεκεμβριου"
  ];

  const monthToNum: Record<string, number> = {
    "ιανου": 0, "ιαν": 0, "φεβρ": 1, "φεβ": 1, "μαρτ": 2, "μαρ": 2,
    "απρι": 3, "απρ": 3, "μαϊ": 4, "μαι": 4, "μαη": 4, "ιουν": 5,
    "ιουλ": 6, "αυγο": 7, "αυγ": 7, "σεπτ": 8, "σεπ": 8, "οκτω": 9,
    "οκτ": 9, "νοεμ": 10, "νοε": 10, "δεκε": 11, "δεκ": 11
  };

  // Check if title mentions a month and year
  for (const month of greekMonths) {
    if (lowerTitle.includes(month)) {
      const monthPrefix = month.substring(0, 3);
      const monthIdx = monthToNum[monthPrefix] ?? monthToNum[month.substring(0, 4)];
      
      if (monthIdx !== undefined) {
        const titleYearMatch = lowerTitle.match(/\b(20\d{2})\b/);
        const titleYear = titleYearMatch ? parseInt(titleYearMatch[1], 10) : now.getFullYear();
        
        // If year is past, or same year and month is past
        const isPastMonth = (titleYear < now.getFullYear()) || 
                           (titleYear === now.getFullYear() && monthIdx < now.getMonth());
        
        if (isPastMonth && !lowerTitle.includes("προσεχώς") && !lowerTitle.includes("upcoming")) {
          statusSignals.push(`Past month detected in title: ${month} ${titleYear}`);
          return { status: "expired", statusSignals, applicationStartAt: startAt, applicationEndAt: deadlineAt };
        }
      }
    }
  }

  // Rule 0: Check for results/news indicators (ENHANCED)
  const resultsKeywords = [
    "αποτελέσματα", "αποτελεσματα",
    "πίνακες", "πινakes", "πίνακας", "πινakas",
    "προσωρινά αποτελέσματα", "προσωρινα αποτελεσματα",
    "οριστικά αποτελέσματα", "οριστικα αποτελεσματα",
    "πίνακας τοποθετήσεων", "πινakas τοποθετησεων",
    "επιλαχόντων", "επιλαχοντων",
    "ενστάσεις", "ενστασεις",
    "αναρτήθηκαν αποτελέσματα", "αναρτηθηκαν αποτελεσματα",
  ];
  const newsKeywords = ["ανακοίνωση", "ανακοινωση", "νέα", "nea", "ανακοινώθηκε", "ανακοινωθηκε"];
  
  // Check title first (more reliable indicator)
  // Note: lowerTitle already declared above (line 492)
  for (const keyword of resultsKeywords) {
    if (lowerTitle.includes(keyword) || lowerContent.includes(keyword)) {
      const contextMatch = (lowerTitle + " " + lowerContent).match(
        new RegExp(`[^.]{0,100}${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^.]{0,100}`, "i")
      );
      if (contextMatch && !contextMatch[0].includes("αίτηση") && !contextMatch[0].includes("αιτηση")) {
        statusSignals.push(`Results indicator: "${contextMatch[0].substring(0, 120)}"`);
        return { status: "results", statusSignals, applicationStartAt: startAt, applicationEndAt: deadlineAt };
      }
    }
  }

  // ASEP specific rules
  if (lowerTitle.includes("ασεπ") || lowerUrl.includes("asep")) {
    const isMetaNews = [
      "πλήθος αιτήσεων", "πληθος αιτησεων",
      "αποστολή στο εθνικό τυπογραφείο", "αποστολη στο εθνικο τυπογραφειο",
      "έκδοση φεκ", "εκδοση φεκ"
    ].some(kw => lowerTitle.includes(kw) || lowerContent.includes(kw));

    if (isMetaNews && !deadlineAt) {
      statusSignals.push("ASEP meta-news detected without future deadline -> archived");
      return { status: "archived", statusSignals, applicationStartAt: startAt, applicationEndAt: null } as any;
    }
    
    // Strict rule for known competitions based on ID
    if (lowerTitle.includes("1κ/2026") || lowerTitle.includes("1κ / 2026")) {
      const k1Deadline = new Date("2026-03-06T21:59:59.999Z");
      if (now > k1Deadline) {
        statusSignals.push("Strict 1K/2026 deadline check: expired");
        return { status: "closed", statusSignals, applicationStartAt: startAt, applicationEndAt: k1Deadline };
      }
    }
    if (lowerTitle.includes("1γβ/2026") || lowerTitle.includes("1γβ / 2026")) {
      const gb1Deadline = new Date("2026-03-30T21:59:59.999Z");
      if (now > gb1Deadline) {
        statusSignals.push("Strict 1GB/2026 deadline check: expired");
        return { status: "closed", statusSignals, applicationStartAt: startAt, applicationEndAt: gb1Deadline };
      }
    }
  }

  // Rule 1: Explicitly closed
  for (const keyword of CLOSED_KEYWORDS) {
    if (lowerContent.includes(keyword)) {
      const contextMatch = lowerContent.match(
        new RegExp(`[^.]{0,50}${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^.]{0,50}`, "i")
      );
      if (contextMatch) {
        statusSignals.push(`"${contextMatch[0].substring(0, 120)}"`);
        return { status: "closed", statusSignals, applicationStartAt: startAt, applicationEndAt: deadlineAt };
      }
    }
  }

  // Rule 2: Deadline exists and is in past
  if (deadlineAt && deadlineAt < now) {
    statusSignals.push(`Deadline ${deadlineAt.toISOString()} is in past`);
    return { status: "expired", statusSignals, applicationStartAt: startAt, applicationEndAt: deadlineAt };
  }

  // Rule 3: Start date exists and is in future => upcoming
  if (startAt && startAt > now) {
    statusSignals.push(`Start date ${startAt.toISOString()} is in future`);
    // Check if deadline is also in future
    if (!deadlineAt || deadlineAt > now) {
      return { status: "upcoming", statusSignals, applicationStartAt: startAt, applicationEndAt: deadlineAt };
    }
  }

  // Rule 4: Check for upcoming keywords
  for (const keyword of UPCOMING_KEYWORDS) {
    if (lowerContent.includes(keyword)) {
      const contextMatch = lowerContent.match(
        new RegExp(`[^.]{0,50}${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^.]{0,50}`, "i")
      );
      if (contextMatch) {
        statusSignals.push(`"${contextMatch[0].substring(0, 120)}"`);
        // If startAt is in future, return upcoming
        if (startAt && startAt > now) {
          return { status: "upcoming", statusSignals, applicationStartAt: startAt, applicationEndAt: deadlineAt };
        }
        // Otherwise, if no deadline or deadline in future, might be upcoming
        if (!deadlineAt || deadlineAt > now) {
          return { status: "upcoming", statusSignals, applicationStartAt: startAt, applicationEndAt: deadlineAt };
        }
      }
    }
  }

  // Rule 5: Explicitly open and (if deadline exists) not expired
  // ENHANCED: Check for ΔΥΠΑ labels "Ανοιχτό πρόγραμμα" / "Κλειστό πρόγραμμα"
  const dypaOpenLabel = /(?:ανοιχτό\s+πρόγραμμα|ανοιχτο\s+προγραμμα|ανοιχτό\s+πρόγραμμα)/i;
  const dypaClosedLabel = /(?:κλειστό\s+πρόγραμμα|κλειστο\s+προγραμμα|κλειστό\s+πρόγραμμα)/i;
  
  if (dypaOpenLabel.test(content)) {
    statusSignals.push("ΔΥΠΑ label: Ανοιχτό πρόγραμμα");
    if ((!startAt || startAt <= now) && (!deadlineAt || deadlineAt >= now)) {
      return { status: "open", statusSignals, applicationStartAt: startAt, applicationEndAt: deadlineAt };
    }
  }
  
  if (dypaClosedLabel.test(content)) {
    statusSignals.push("ΔΥΠΑ label: Κλειστό πρόγραμμα");
    return { status: "closed", statusSignals, applicationStartAt: startAt, applicationEndAt: deadlineAt };
  }
  
  // Enhanced deadline parsing: "λήγει ... στις 23:59" or "προθεσμία"
  // Note: This is handled in extractDates() function, so we don't need to re-parse here
  // But we can add signals if deadline was found
  if (deadlineAt) {
    const deadlinePatterns = [
      /(?:λήγει|ληγει|λήξει|ληξει|έληξε|εληξε)[\s:]+([^\.\n]{0,100})(?:[\s:]+στις[\s:]+(\d{1,2}):(\d{2}))/i,
      /(?:προθεσμία|προθεσμια)[\s:]+([^\.\n]{0,100})/i,
      /(?:έως|εως|μέχρι|μεχρι)[\s:]+([^\.\n]{0,100})(?:[\s:]+στις[\s:]+(\d{1,2}):(\d{2}))/i,
    ];
    
    for (const pattern of deadlinePatterns) {
      const matches = [...content.matchAll(pattern)];
      if (matches.length > 0) {
        statusSignals.push(`Deadline pattern matched: "${matches[0][0].substring(0, 120)}"`);
        break; // Found a match, no need to continue
      }
    }
  }
  
  for (const keyword of OPEN_KEYWORDS) {
    if (lowerContent.includes(keyword)) {
      const contextMatch = lowerContent.match(
        new RegExp(`[^.]{0,50}${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^.]{0,50}`, "i")
      );
      if (contextMatch) {
        statusSignals.push(`"${contextMatch[0].substring(0, 120)}"`);
        // Only return open if deadline hasn't passed and start hasn't passed (or no start)
        if ((!startAt || startAt <= now) && (!deadlineAt || deadlineAt >= now)) {
          return { status: "open", statusSignals, applicationStartAt: startAt, applicationEndAt: deadlineAt };
        }
      }
    }
  }

  // Rule 6: If startAt exists and is in past, and deadline is in future => open
  if (startAt && startAt <= now && deadlineAt && deadlineAt >= now) {
    statusSignals.push(`Period ${startAt.toISOString()} - ${deadlineAt.toISOString()} is active`);
    return { status: "open", statusSignals, applicationStartAt: startAt, applicationEndAt: deadlineAt };
  }

  // Rule 7: ASEP-specific parsing - check "ΤΡΕΧΟΝ ΣΤΑΔΙΟ" (current stage)
  const asepStagePatterns = [
    /(?:τρέχον\s+στάδιο|τρέχον\s+σταδιο|current\s+stage)[\s:]+([^\.\n]{0,200})/gi,
    /(?:στάδιο|σταδιο)[\s:]+([^\.\n]{0,200})/gi,
  ];
  
  for (const pattern of asepStagePatterns) {
    const matches = [...content.matchAll(pattern)];
    for (const match of matches) {
      const stageText = match[1].toLowerCase();
      // If stage indicates closed (results, evaluation, etc.)
      if (
        stageText.includes("αποτελέσματα") ||
        stageText.includes("αποτελεσματα") ||
        stageText.includes("έλεγχος") ||
        stageText.includes("ελεγχος") ||
        stageText.includes("επεξεργασία") ||
        stageText.includes("επεξεργασια") ||
        stageText.includes("ολοκληρώθηκε") ||
        stageText.includes("ολοκληρωθηκε")
      ) {
        statusSignals.push(`ASEP stage: "${match[1].substring(0, 100)}"`);
        return { status: "closed", statusSignals, applicationStartAt: startAt, applicationEndAt: deadlineAt };
      }
    }
  }

  // Rule 8: Check if it's just news (no application window)
  const hasNewsIndicators = newsKeywords.some(kw => lowerContent.includes(kw));
  const hasNoApplicationWindow = !startAt && !deadlineAt && !lowerContent.includes("αίτηση") && !lowerContent.includes("αιτηση");
  if (hasNewsIndicators && hasNoApplicationWindow) {
    statusSignals.push("News/announcement without application window");
    return { status: "news", statusSignals, applicationStartAt: null, applicationEndAt: null };
  }

  // Rule 9: Pass items with year in title but no application window → news (not open)
  if (isPassWithYear && !deadlineAt && !startAt) {
    statusSignals.push("Pass with year in title but no application window → news");
    return { status: "news", statusSignals, applicationStartAt: null, applicationEndAt: null };
  }

  // Rule 10: If content has application invitation keywords without closed indicators, assume open
  const hasApplicationKeywords = 
    lowerContent.includes("υποβολή αιτήσεων") ||
    lowerContent.includes("υποβολη αιτησεων") ||
    lowerContent.includes("κάνε αίτηση") ||
    lowerContent.includes("κανε αιτηση") ||
    lowerContent.includes("αιτηθείτε") ||
    lowerContent.includes("αιτηθειτε") ||
    lowerContent.includes("υποβάλετε αίτηση") ||
    lowerContent.includes("υποβαλετε αιτηση") ||
    lowerContent.includes("κάντε αίτηση") ||
    lowerContent.includes("καντε αιτηση");

  const hasClosedIndicators = CLOSED_KEYWORDS.some(kw => lowerContent.includes(kw));

  if (hasApplicationKeywords && !hasClosedIndicators && (!deadlineAt || deadlineAt >= now)) {
    statusSignals.push("Contains application invitation without closed indicators → assume open");
    return { status: "open", statusSignals, applicationStartAt: startAt, applicationEndAt: deadlineAt };
  }

  // Rule 11: ΔΥΠΑ programs with ongoing service keywords are typically open
  const isDypaOngoingService = 
    lowerContent.includes("εγγεγραμμένοι άνεργοι") ||
    lowerContent.includes("εγγεγραμμενοι ανεργοι") ||
    lowerContent.includes("κάρτα ανεργίας") ||
    lowerContent.includes("καρτα ανεργιας") ||
    lowerContent.includes("δελτίο ανεργίας") ||
    lowerContent.includes("δελτιο ανεργιας") ||
    lowerContent.includes("επίδομα ανεργίας") ||
    lowerContent.includes("επιδομα ανεργιας");

  if (isDypaOngoingService && !hasClosedIndicators && !startAt && !deadlineAt) {
    statusSignals.push("ΔΥΠΑ ongoing service (no dates, no closed indicators) → assume open");
    return { status: "open", statusSignals, applicationStartAt: null, applicationEndAt: null };
  }

  // Rule 12: Default to unknown (no evidence) - LAST RESORT
  return { status: "unknown", statusSignals, applicationStartAt: startAt, applicationEndAt: deadlineAt };
}

/**
 * Classify kind and type (enhanced for ASEP and Diavgeia)
 */
export function classifyKindAndType(
  title: string,
  content: string,
  url?: string
): {
  kind: "benefit" | "voucher_pass" | "program" | "service_info" | "decision" | "tender" | "news";
  type: "subsidy" | "voucher" | "program" | "public_call" | "asep_competition" | "manual" | "decision";
} {
  const lowerTitle = title.toLowerCase();
  const lowerContent = content.toLowerCase();
  const lowerUrl = (url || "").toLowerCase();
  
  // Διαύγεια: default to decision, but will be verified during live verification
  // Live verification will check if it's relevant to benefits/programs
  // If not relevant, it will be marked as kind="decision" and excluded from active tabs
  if (lowerUrl.includes("diavgeia.gov.gr") || lowerUrl.includes("opendata.diavgeia.gov.gr")) {
    // Default to decision, but allow override during ingestion if keywords are present
    const hasRelevantKeywords = [
      "voucher", "pass", "επίδομα", "επιδομα", "επιδότηση", "επιχορηγηση",
      "πρόγραμμα", "προγραμμα", "παροχή", "παροχη", "βοήθημα", "βοηθημα",
      "κατάρτιση", "καταρτιση", "απασχόληση", "απασχοληση", "ανεργία", "ανεργια",
    ].some(kw => lowerTitle.includes(kw) || lowerContent.includes(kw));
    
    // If has relevant keywords, allow it to be classified as program/benefit
    // Live verification will do final check
    if (hasRelevantKeywords && lowerContent.length > 200) {
      // Check if it's a program or benefit
      if (lowerContent.includes("πρόγραμμα") || lowerContent.includes("προγραμμα")) {
        return { kind: "program", type: "program" };
      }
      if (lowerContent.includes("επίδομα") || lowerContent.includes("επιδομα")) {
        return { kind: "benefit", type: "subsidy" };
      }
    }
    
    // Default: decision (will be verified during live verification)
    return { kind: "decision", type: "decision" };
  }
  
  // Tender/Procurement detection (before other classifications)
  const tenderKeywords = [
    "προσφορ",
    "ανάδειξη αναδόχου",
    "αναδειξη αναδοχου",
    "προμήθεια",
    "προμηθεια",
    "ν.4412/2016",
    "διαπραγμάτευση",
    "διαπραγματευση",
    "σύμβαση",
    "συμβαση",
    "cpv",
  ];
  
  const isTender = tenderKeywords.some(
    (kw) =>
      lowerTitle.includes(kw) ||
      lowerContent.includes(kw) ||
      lowerUrl.includes(kw.replace(/\s+/g, "-"))
  );
  
  if (isTender) {
    return { kind: "tender", type: "manual" };
  }

  // ASEP detection
  if (
    lowerUrl.includes("info.asep.gr") ||
    lowerContent.includes("ασεπ") ||
    lowerContent.includes("asep") ||
    lowerTitle.includes("ασεπ") ||
    lowerTitle.includes("προκήρυξη") ||
    lowerContent.includes("προκήρυξη") ||
    lowerContent.includes("διαγωνισμός") ||
    lowerContent.includes("διαγωνισμος")
  ) {
    // Check if it's just meta-news about a competition (counts, FEK, etc.)
    const isMetaNews = [
      "πλήθος αιτήσεων", "πληθος αιτησεων",
      "αριθμός αιτήσεων", "αριθμος αιτησεων",
      "αποστολή στο εθνικό τυπογραφείο", "αποστολη στο εθνικο τυπογραφειο",
      "έκδοση φεκ", "εκδοση φεκ",
      "ενημερωτικό δελτίο", "ενημερωτικο δελτιο",
    ].some(kw => lowerTitle.includes(kw));

    if (isMetaNews) {
      return { 
        kind: "service_info", 
        type: "manual",
        status: "rejected",
        reason: "ASEP meta-news (counts/bulletins) filtered out"
      } as any;
    }

    return { kind: "program", type: "asep_competition" };
  }

  // Explicit Force Classification for known major programs
  if (lowerTitle.includes("κοινωνικός τουρισμός") || lowerTitle.includes("κοινωνικος τουρισμος")) {
    return { kind: "benefit", type: "subsidy" };
  }
  if (lowerTitle.includes("ανακαινίζω") || lowerTitle.includes("ανακαινιζω") || lowerTitle.includes("νοικιάζω")) {
    return { kind: "program", type: "program" };
  }
  if (lowerTitle.includes("επίδομα παιδιού") || lowerTitle.includes("επιδομα παιδιου")) {
    return { kind: "benefit", type: "subsidy" };
  }
  if (lowerTitle.includes("fuel pass") || lowerTitle.includes("market pass")) {
    return { kind: "voucher_pass", type: "voucher" };
  }
  if (lowerTitle.includes("youth pass")) {
    return { kind: "voucher_pass", type: "voucher" };
  }

  // Voucher/pass
  if (
    lowerContent.includes("voucher") ||
    lowerContent.includes("κουπόνι") ||
    lowerContent.includes("κουπονι") ||
    lowerContent.includes("επιταγή") ||
    lowerContent.includes("επιταγη") ||
    lowerTitle.includes("pass") ||
    lowerContent.includes("pass")
  ) {
    if (lowerContent.includes("youth") || lowerTitle.includes("youth")) {
      return { kind: "voucher_pass", type: "voucher" };
    }
    return { kind: "voucher_pass", type: "voucher" };
  }

  // News / Events / Career Days
  if (
    lowerTitle.includes("ημέρα καριέρας") ||
    lowerTitle.includes("ημερα καριερας") ||
    lowerTitle.includes("εκδήλωση") ||
    lowerTitle.includes("εκδηλωση") ||
    lowerTitle.includes("ημερίδα") ||
    lowerTitle.includes("ημεριδα") ||
    lowerTitle.includes("σεμινάριο") ||
    lowerTitle.includes("σεμιναριο")
  ) {
    return { kind: "news", type: "manual" };
  }

  // Benefit (allowance/subsidy) - enhanced for ΔΥΠΑ
  if (
    lowerContent.includes("επίδομα") ||
    lowerContent.includes("επιδομα") ||
    lowerContent.includes("παροχή") ||
    lowerContent.includes("παροχη") ||
    lowerContent.includes("βοήθημα") ||
    lowerContent.includes("βοηθημα") ||
    lowerContent.includes("οικονομική ενίσχυση") ||
    lowerContent.includes("οικονομικη ενισχυση")
  ) {
    // Check if it's a stable/recurring benefit (no deadline/call) vs time-limited program
    const hasDeadline = lowerContent.includes("προθεσμία") ||
                       lowerContent.includes("προθεσμια") ||
                       lowerContent.includes("deadline") ||
                       lowerContent.includes("έως") ||
                       lowerContent.includes("μέχρι");
    
    // If it's unemployment benefit without deadline, it's likely a stable benefit
    if ((lowerContent.includes("ανεργίας") || lowerContent.includes("ανεργιας")) && !hasDeadline) {
      return { kind: "benefit", type: "subsidy" };
    }
    
    if (lowerContent.includes("subsidy") || lowerContent.includes("επίδομα")) {
      return { kind: "benefit", type: "subsidy" };
    }
    // Map allowance to subsidy (valid enum value)
    return { kind: "benefit", type: "subsidy" };
  }

  // Program/grant (enhanced for ΔΥΠΑ)
  if (
    lowerContent.includes("πρόγραμμα") ||
    lowerContent.includes("προγραμμα") ||
    lowerContent.includes("δράση") ||
    lowerContent.includes("δραση") ||
    lowerContent.includes("πρόσκληση") ||
    lowerContent.includes("προσκληση") ||
    lowerContent.includes("κατάρτιση") ||
    lowerContent.includes("καταρτιση") ||
    lowerContent.includes("επιχορήγηση") ||
    lowerContent.includes("επιχορηγηση") ||
    lowerContent.includes("απασχόληση") ||
    lowerContent.includes("απασχοληση") ||
    lowerContent.includes("program") ||
    lowerContent.includes("grant")
  ) {
    // ΔΥΠΑ specific: programs usually have deadlines/calls
    if (
      lowerContent.includes("επιχορήγηση") ||
      lowerContent.includes("επιχορηγηση") ||
      lowerContent.includes("grant")
    ) {
      return { kind: "program", type: "program" };
    }
    return { kind: "program", type: "program" };
  }

  // Scholarship
  if (
    lowerContent.includes("υποτροφία") ||
    lowerContent.includes("υποτροφια") ||
    lowerContent.includes("βραβείο") ||
    lowerContent.includes("βραβειο") ||
    lowerContent.includes("scholarship")
  ) {
    return { kind: "program", type: "program" };
  }

  // Default: try to infer from content length and structure
  // If content is substantial and has structure, it's likely a program/benefit
  if (content.length > 300 && (lowerContent.includes("κριτήρια") || lowerContent.includes("προϋποθέσεις"))) {
    return { kind: "program", type: "program" };
  }
  
  // Default
  return { kind: "service_info", type: "manual" };
}

/**
 * Clean title
 */
function cleanTitle(rawTitle: string): string {
  let cleaned = rawTitle.trim();

  // Remove navigation/menu artifacts
  cleaned = cleaned.replace(/^Δείτε περισσότερα\s*[→>]\s*/i, "");
  cleaned = cleaned.replace(/\s*[→>]\s*Δείτε περισσότερα$/i, "");
  cleaned = cleaned.replace(/\s+σύνδεσμος$/i, ""); // Remove "σύνδεσμος" at the end
  cleaned = cleaned.replace(/^\.\.\.\s*/, "");
  cleaned = cleaned.replace(/\s*\.\.\.$/, "");

  // Remove the word "test" (case-insensitive, standalone)
  cleaned = cleaned.replace(/\btest\b/gi, "").trim();

  // Remove duplicate spaces
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  // Limit length
  if (cleaned.length > 150) {
    cleaned = cleaned.substring(0, 147) + "...";
  }

  return cleaned || rawTitle;
}

/**
 * Clean summary
 */
export function cleanSummary(title: string, content: string): string {
  // Remove boilerplate
  let cleaned = content
    .replace(/cookie[^.]*/gi, "")
    .replace(/privacy[^.]*/gi, "")
    .replace(/terms[^.]*/gi, "")
    .replace(/menu[^.]*/gi, "")
    .replace(/navigation[^.]*/gi, "")
    .replace(/site map[^.]*/gi, "")
    .replace(/μετάβαση[^.]*/gi, "")
    .trim();

  // Strip obvious JS/CSS artifacts that sometimes leak into text (e.g. AADE banners)
  // Remove inline @media blocks and simple const/function snippets
  cleaned = cleaned
    .replace(/@media[\s\S]*?\{/gi, " ")
    .replace(/const\s+[A-Za-zΑ-Ωα-ω0-9_]+\s*=\s*[^;]+;/gi, " ")
    .replace(/function\s+[A-Za-zΑ-Ωα-ω0-9_]+\s*\([^)]*\)\s*\{[\s\S]*?\}/gi, " ")
    .replace(/document\.[A-Za-z0-9_.]+\([^)]*\);?/gi, " ");

  // If script-like tokens still remain, cut everything after the first occurrence
  const jsIdx = cleaned.search(/@media|const\s+|function\s+|document\./i);
  if (jsIdx > 0) {
    cleaned = cleaned.substring(0, jsIdx);
  }

  // Remove "test" artifacts
  cleaned = cleaned.replace(/\btest\b/gi, "").trim();

  // Fix concatenated words: insert space before uppercase Greek/Latin letter
  // that follows a lowercase letter (e.g. "ΝιγρίταςΦεβ" → "Νιγρίτας Φεβ")
  cleaned = cleaned.replace(/([α-ωά-ώa-z])([Α-ΩΆ-ΏA-Z])/g, "$1 $2");

  // Fix date glued to text (e.g. "2026Κατάρτιση" → "2026 Κατάρτιση")
  cleaned = cleaned.replace(/(\d{4})([Α-ΩΆ-Ώα-ωά-ώA-Za-z])/g, "$1 $2");

  // Remove title if it appears at start
  const titleWords = title.toLowerCase().split(/\s+/).slice(0, 3);
  if (titleWords.length > 0) {
    const titlePattern = new RegExp(
      "^" + titleWords.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+"),
      "i"
    );
    // Only remove title if content is long enough to justify it
    if (cleaned.length > 200) {
      cleaned = cleaned.replace(titlePattern, "").trim();
    }
  }

  // Remove inline date fragments that look like "Φεβ 16, 2026" stuck inside sentences
  cleaned = cleaned.replace(/\s*(?:Ιαν|Φεβ|Μαρ|Απρ|Μαι|Ιουν|Ιουλ|Αυγ|Σεπ|Οκτ|Νοε|Δεκ)\s+\d{1,2},?\s*\d{4}\s*/gi, " ");

  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  // Extract first 1-3 meaningful sentences
  const sentences = cleaned.split(/[.!?]\s+/).filter((s) => s.length > 20);
  let summary = sentences.slice(0, 3).join(". ");
  
  // If summary is too short or empty, use the cleaned content (up to limit)
  if (summary.length < 50) {
    summary = cleaned.substring(0, 500);
  }

  return summary || cleaned.substring(0, 500);
}

/**
 * Canonicalize URL (enhanced for ΔΥΠΑ - strip UTM params, fragments, normalize)
 */
function canonicalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    // Remove query params (especially UTM tracking)
    u.search = "";
    // Remove anchors/fragments
    u.hash = "";
    // Normalize pathname (remove trailing slash, except root)
    let pathname = u.pathname;
    if (pathname.endsWith("/") && pathname !== "/") {
      pathname = pathname.slice(0, -1);
    }
    // Normalize hostname (remove www. prefix for consistency)
    let hostname = u.hostname.toLowerCase();
    if (hostname.startsWith("www.")) {
      hostname = hostname.substring(4);
    }
    return `${u.protocol}//${hostname}${pathname}`;
  } catch {
    return url;
  }
}

/**
 * Extract tags from content (enhanced for ASEP)
 */
function extractTags(title: string, content: string, url?: string): string[] {
  const tags: string[] = [];
  const lowerTitle = title.toLowerCase();
  const lowerContent = content.toLowerCase();

  // Youth-related
  if (
    lowerContent.includes("νέοι") ||
    lowerContent.includes("νεοι") ||
    lowerContent.includes("youth") ||
    lowerContent.includes("18-") ||
    lowerContent.includes("25-")
  ) {
    tags.push("neoi");
  }

  // Family-related
  if (
    lowerContent.includes("οικογένεια") ||
    lowerContent.includes("οικογενεια") ||
    lowerContent.includes("γονείς") ||
    lowerContent.includes("γονεις") ||
    lowerContent.includes("family")
  ) {
    tags.push("oikogeneia");
  }

  // Unemployment (enhanced for ΔΥΠΑ)
  if (
    lowerContent.includes("άνεργοι") ||
    lowerContent.includes("ανεργοι") ||
    lowerContent.includes("ανεργίας") ||
    lowerContent.includes("ανεργιας") ||
    lowerContent.includes("unemployed")
  ) {
    tags.push("anergia");
  }

  // Employment / Work
  if (
    lowerContent.includes("εργασία") ||
    lowerContent.includes("εργασια") ||
    lowerContent.includes("απασχόληση") ||
    lowerContent.includes("απασχοληση") ||
    lowerContent.includes("employment")
  ) {
    tags.push("ergasia");
  }

  // Training
  if (
    lowerContent.includes("κατάρτιση") ||
    lowerContent.includes("καταρτιση") ||
    lowerContent.includes("training")
  ) {
    tags.push("katartisi");
  }

  // Employer
  if (
    lowerContent.includes("εργοδότης") ||
    lowerContent.includes("εργοδοτης") ||
    lowerContent.includes("employer")
  ) {
    tags.push("ergodotis");
  }

  // Voucher (for training vouchers)
  if (
    lowerContent.includes("voucher") ||
    lowerContent.includes("voucher κατάρτισης") ||
    lowerContent.includes("voucher καταρτισης")
  ) {
    tags.push("voucher");
  }

  // Social Tourism
  if (
    lowerContent.includes("κοινωνικός τουρισμός") ||
    lowerContent.includes("κοινωνικος τουρισμος") ||
    lowerContent.includes("social tourism")
  ) {
    tags.push("koinonikos-tourismos");
  }

  // Housing
  if (
    lowerContent.includes("στέγαση") ||
    lowerContent.includes("στεγαση") ||
    lowerContent.includes("ενοίκιο") ||
    lowerContent.includes("ενοικιο") ||
    lowerContent.includes("housing")
  ) {
    tags.push("stegasi");
  }

  // Disability
  if (
    lowerContent.includes("αμεα") ||
    lowerContent.includes("ανάπηρος") ||
    lowerContent.includes("αναπηρος") ||
    lowerContent.includes("disability")
  ) {
    tags.push("amea");
  }

  // Heating
  if (
    lowerContent.includes("θέρμανση") ||
    lowerContent.includes("θερμανση") ||
    lowerContent.includes("myθέρμανση") ||
    lowerContent.includes("mythermansi") ||
    lowerContent.includes("heating")
  ) {
    tags.push("thermansi");
  }

  // Tourism
  if (
    lowerContent.includes("τουρισμός") ||
    lowerContent.includes("τουρισμος") ||
    lowerContent.includes("tourism") ||
    lowerContent.includes("voucher") ||
    lowerContent.includes("pass")
  ) {
    tags.push("tourism");
  }

  // Education/Training
  if (
    lowerContent.includes("εκπαίδευση") ||
    lowerContent.includes("εκπαιδευση") ||
    lowerContent.includes("κατάρτιση") ||
    lowerContent.includes("καταρτιση") ||
    lowerContent.includes("education") ||
    lowerContent.includes("training")
  ) {
    tags.push("ekpaidefsi");
  }

  // Health
  if (
    lowerContent.includes("υγεία") ||
    lowerContent.includes("υγεια") ||
    lowerContent.includes("health")
  ) {
    tags.push("ygeia");
  }

  // Tax
  if (
    lowerContent.includes("φορολογία") ||
    lowerContent.includes("φορολογια") ||
    lowerContent.includes("tax")
  ) {
    tags.push("forologia");
  }

  return tags;
}

/**
 * Extract ASEP-specific requirements from content
 * Parses education levels, degree fields, languages, IT skills, licenses
 */
function extractASEPRequirements(
  title: string,
  content: string,
  url: string
): {
  educationLevels?: ("ΠΕ" | "ΤΕ" | "ΔΕ" | "ΥΕ")[];
  contestCode?: string;
  fekRef?: string;
  degreeFieldsKeywords?: string[];
  languagesRequired?: Array<{ language: string; levelMin?: string }>;
  itSkillsRequired?: boolean;
  licensingRequiredKeywords?: string[];
} {
  const lowerContent = content.toLowerCase();
  const lowerTitle = title.toLowerCase();
  const result: any = {};

  // Extract contest code (e.g., "4ΓΒ/2025")
  const contestCodeMatch = content.match(/(\d+[Α-Ωα-ω]+\/\d{4})/i);
  if (contestCodeMatch) {
    result.contestCode = contestCodeMatch[1];
  }

  // Extract FEK reference
  const fekMatch = content.match(/ΦΕΚ[:\s]*(\d+[-\s]\d{4})/i);
  if (fekMatch) {
    result.fekRef = fekMatch[1].replace(/\s+/g, "-");
  }

  // Extract education levels (ΠΕ/ΤΕ/ΔΕ/ΥΕ)
  const educationLevels: ("ΠΕ" | "ΤΕ" | "ΔΕ" | "ΥΕ")[] = [];
  if (lowerContent.includes("πτυχίο π.ε.") || lowerContent.includes("π.ε.") || lowerContent.includes("πτυχίο πανεπιστημίου")) {
    educationLevels.push("ΠΕ");
  }
  if (lowerContent.includes("πτυχίο τ.ε.") || lowerContent.includes("τ.ε.") || lowerContent.includes("τεχνολογικό")) {
    educationLevels.push("ΤΕ");
  }
  if (lowerContent.includes("δ.ε.") || lowerContent.includes("δευτεροβάθμια")) {
    educationLevels.push("ΔΕ");
  }
  if (lowerContent.includes("υ.ε.") || lowerContent.includes("υποδευτεροβάθμια")) {
    educationLevels.push("ΥΕ");
  }
  if (educationLevels.length > 0) {
    result.educationLevels = educationLevels;
  }

  // Extract degree fields keywords
  const degreeFieldKeywords: string[] = [];
  const fieldPatterns = [
    /(?:πτυχίο|ειδικότητα|κλάδος)[\s:]+([^\.\n]{0,100})/gi,
    /(?:πτυχίο|ειδικότητα)\s+(?:στην|στο|της)\s+([^\.\n]{0,100})/gi,
  ];
  
  const fieldKeywords = [
    "πληροφορική", "πληροφορικη", "informatics", "computer",
    "μηχανικών", "μηχανικων", "engineering",
    "οικονομικών", "οικονομικων", "economics",
    "διοίκησης", "διοικησης", "management",
    "υγεία", "υγεια", "health",
    "παιδαγωγικά", "παιδαγωγικα", "education",
    "νομική", "νομικη", "law",
  ];
  
  for (const pattern of fieldPatterns) {
    const matches = [...content.matchAll(pattern)];
    for (const match of matches) {
      const fieldText = match[1].toLowerCase();
      for (const keyword of fieldKeywords) {
        if (fieldText.includes(keyword) && !degreeFieldKeywords.includes(keyword)) {
          degreeFieldKeywords.push(keyword);
        }
      }
    }
  }
  if (degreeFieldKeywords.length > 0) {
    result.degreeFieldsKeywords = degreeFieldKeywords;
  }

  // Extract language requirements
  const languagesRequired: Array<{ language: string; levelMin?: string }> = [];
  const languagePatterns = [
    /(?:γνώση|γνωση)\s+(?:της\s+)?(?:αγγλικής|αγγλικης|english|αγγλικά|αγγλικά)[\s:]+(?:γλώσσας|γλωσσας|language)?[\s:]*([Α-Ωα-ω]{1,3})/gi,
    /(?:αγγλικά|αγγλικά|english)[\s:]+([Α-Ωα-ω]{1,3})/gi,
    /(?:γαλλικά|γαλλικα|french)[\s:]+([Α-Ωα-ω]{1,3})/gi,
    /(?:γερμανικά|γερμανικα|german)[\s:]+([Α-Ωα-ω]{1,3})/gi,
  ];
  
  for (const pattern of languagePatterns) {
    const matches = [...content.matchAll(pattern)];
    for (const match of matches) {
      const level = match[1] || match[0];
      if (level.match(/[Α-Ωα-ω]{1,3}/)) {
        languagesRequired.push({ language: "EN", levelMin: level });
      }
    }
  }
  if (languagesRequired.length > 0) {
    result.languagesRequired = languagesRequired;
  }

  // Extract IT skills requirement
  if (
    lowerContent.includes("γνώση χειρισμού η/υ") ||
    lowerContent.includes("γνωση χειρισμου η/υ") ||
    lowerContent.includes("ecdl") ||
    lowerContent.includes("πιστοποίηση πληροφορικής") ||
    lowerContent.includes("πιστοποιηση πληροφορικης")
  ) {
    result.itSkillsRequired = true;
  }

  // Extract licensing requirements
  const licensingKeywords: string[] = [];
  if (lowerContent.includes("άδεια άσκησης επαγγέλματος") || lowerContent.includes("αδεια ασκησης επαγγελματος")) {
    licensingKeywords.push("άδεια άσκησης επαγγέλματος");
  }
  if (licensingKeywords.length > 0) {
    result.licensingRequiredKeywords = licensingKeywords;
  }

  return result;
}

/**
 * Extract matching hints and requirements from content
 * Based on official text evidence only
 * Enhanced for ΔΥΠΑ (unemployment, employment, employers, training)
 */
function extractMatchingHints(
  title: string,
  content: string,
  url: string,
  now: Date,
  statusSignals: string[]
): {
  requirementsNormalized: {
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
} {
  const lowerTitle = title.toLowerCase();
  const lowerContent = content.toLowerCase();
  const lowerUrl = url.toLowerCase();
  const requirementsNormalized: any = {};
  const requirementsSummaryBullets: string[] = [];

  // A21 / Child benefit
  if (
    lowerContent.includes("α21") ||
    lowerContent.includes("επίδομα παιδιού") ||
    lowerContent.includes("επιδομα παιδιου") ||
    lowerContent.includes("child benefit") ||
    lowerTitle.includes("α21") ||
    lowerTitle.includes("επίδομα παιδιού")
  ) {
    requirementsNormalized.hasChildren = true;
    requirementsSummaryBullets.push("Έχεις παιδιά");
    // Force open status if current date is before May 8, 2026
    if (now < new Date("2026-05-09")) {
      statusSignals.push("A21 explicit open rule applied (before May 8 deadline)");
    }
  }

  // Student / Φοιτητικό
  if (
    lowerContent.includes("φοιτητικό") ||
    lowerContent.includes("φοιτητικο") ||
    lowerContent.includes("φοιτητής") ||
    lowerContent.includes("φοιτητης") ||
    lowerContent.includes("student") ||
    lowerUrl.includes("stegastiko.minedu.gov.gr")
  ) {
    requirementsNormalized.student = true;
    requirementsSummaryBullets.push("Είσαι φοιτητής/τρια");
  }

  // Unemployment / ΔΥΠΑ (enhanced)
  if (
    lowerContent.includes("ανεργίας") ||
    lowerContent.includes("ανεργιας") ||
    lowerContent.includes("άνεργος") ||
    lowerContent.includes("ανεργος") ||
    lowerContent.includes("άνεργοι") ||
    lowerContent.includes("ανεργοι") ||
    lowerContent.includes("μακροχρόνια άνεργ") ||
    lowerContent.includes("μακροχρονια ανεργ") ||
    lowerContent.includes("unemployed") ||
    lowerContent.includes("επίδομα ανεργίας") ||
    lowerContent.includes("επιδομα ανεργιας") ||
    lowerContent.includes("βοήθημα ανεργίας") ||
    lowerContent.includes("βοηθημα ανεργιας") ||
    lowerContent.includes("εσπα για ανέργους") ||
    lowerContent.includes("εσπα για ανεργους") ||
    (lowerUrl.includes("dypa") && lowerContent.includes("ανεργ"))
  ) {
    requirementsNormalized.isUnemployed = true;
    requirementsNormalized.audience = "unemployed";
    requirementsSummaryBullets.push("Είσαι άνεργος/η");
  }

  // Employed Private Sector / Training
  if (
    lowerContent.includes("εργαζόμεν") ||
    lowerContent.includes("εργαζομεν") ||
    lowerContent.includes("ιδιωτικού τομέα") ||
    lowerContent.includes("ιδιωτικου τομεα") ||
    lowerContent.includes("voucher κατάρτισης") ||
    lowerContent.includes("voucher καταρτισης") ||
    lowerContent.includes("upskilling") ||
    lowerContent.includes("reskilling") ||
    lowerContent.includes("κατάρτιση εργαζομένων") ||
    lowerContent.includes("καταρτιση εργαζομενων")
  ) {
    requirementsNormalized.isEmployedPrivate = true;
    requirementsNormalized.isEmployee = true;
    requirementsNormalized.audience = "employee";
    requirementsSummaryBullets.push("Είσαι εργαζόμενος/η ιδιωτικού τομέα");
  }

  // Employers / Businesses
  if (
    lowerContent.includes("εργοδότη") ||
    lowerContent.includes("εργοδοτη") ||
    lowerContent.includes("εργοδότες") ||
    lowerContent.includes("εργοδοτες") ||
    lowerContent.includes("επιχορήγηση") ||
    lowerContent.includes("επιχορηγηση") ||
    lowerContent.includes("πρόσληψη") ||
    lowerContent.includes("προσληψη") ||
    lowerContent.includes("θέσεων εργασίας") ||
    lowerContent.includes("θεσεων εργασιας") ||
    lowerContent.includes("επιδότηση μισθού") ||
    lowerContent.includes("επιδοτηση μισθου") ||
    lowerContent.includes("επιχείρηση") ||
    lowerContent.includes("επιχειρηση") ||
    lowerContent.includes("επιχειρήσεις") ||
    lowerContent.includes("επιχειρησεις") ||
    lowerContent.includes("employer") ||
    lowerContent.includes("business")
  ) {
    requirementsNormalized.isEmployer = true;
    requirementsNormalized.audience = "employer";
    requirementsSummaryBullets.push("Είσαι εργοδότης/επιχείρηση");
  }
  
  // TAA / Scale Up detection
  if (
    lowerContent.includes("ταα") ||
    lowerContent.includes("scale up") ||
    lowerContent.includes("scale-up")
  ) {
    requirementsNormalized.sector = "employment";
    if (!requirementsNormalized.audience) {
      requirementsNormalized.audience = "employer";
    }
  }
  
  // TAA / Scale Up detection
  if (
    lowerContent.includes("ταα") ||
    lowerContent.includes("scale up") ||
    lowerContent.includes("scale-up")
  ) {
    requirementsNormalized.sector = "employment";
    if (!requirementsNormalized.audience) {
      requirementsNormalized.audience = "employer";
    }
  }

  // Disability / ΑμεΑ
  if (
    lowerContent.includes("αμεα") ||
    lowerContent.includes("ανάπηρος") ||
    lowerContent.includes("αναπηρος") ||
    lowerContent.includes("κεπα") ||
    lowerContent.includes("disability")
  ) {
    requirementsNormalized.disability = true;
    requirementsSummaryBullets.push("Έχεις αναπηρία");
  }

  // Housing / Residency
  if (
    lowerContent.includes("στέγαση") ||
    lowerContent.includes("στεγαση") ||
    lowerContent.includes("stegasi") ||
    lowerUrl.includes("stegasi.gov.gr")
  ) {
    requirementsNormalized.residency = true;
    requirementsSummaryBullets.push("Έχεις κατοικία");
    // Check for income requirements
    if (
      lowerContent.includes("εισόδημα") ||
      lowerContent.includes("εισοδημα") ||
      lowerContent.includes("income")
    ) {
      // Try to extract income band (simplified)
      if (lowerContent.includes("χαμηλό") || lowerContent.includes("χαμηλο")) {
        requirementsNormalized.incomeBand = "low";
      } else if (
        lowerContent.includes("μέτριο") ||
        lowerContent.includes("μετριο")
      ) {
        requirementsNormalized.incomeBand = "medium";
      }
    }
  }

  // Age ranges (enhanced for ΔΥΠΑ patterns like "18-29", "15-29", etc.)
  const agePatterns = [
    /(\d{1,2})\s*[-–]\s*(\d{1,2})\s*(?:έτη|ετων|years|ετών)/i,
    /(?:ηλικίας|ηλικια|ηλικία)\s+(\d{1,2})\s*[-–]\s*(\d{1,2})/i,
    /(\d{1,2})\s*[-–]\s*(\d{1,2})\s*(?:χρονών|χρονον)/i,
  ];
  for (const agePattern of agePatterns) {
    const ageMatch = lowerContent.match(agePattern);
    if (ageMatch) {
      requirementsNormalized.ageMin = parseInt(ageMatch[1]);
      requirementsNormalized.ageMax = parseInt(ageMatch[2]);
      requirementsSummaryBullets.push(
        `Ηλικία ${ageMatch[1]}-${ageMatch[2]} ετών`
      );
      // Tag for youth if applicable
      if (parseInt(ageMatch[2]) <= 29) {
        requirementsNormalized.targetGroup = "νέοι";
      }
      break;
    }
  }

  // Heating / myΘέρμανση
  if (
    lowerContent.includes("θέρμανση") ||
    lowerContent.includes("θερμανση") ||
    lowerUrl.includes("mythermansi")
  ) {
    requirementsSummaryBullets.push("Επίδομα θέρμανσης");
  }

  // Target groups / Sectors (ΔΥΠΑ specific)
  if (lowerContent.includes("νέοι") || lowerContent.includes("νεοι") || lowerContent.includes("youth")) {
    requirementsNormalized.targetGroup = "νέοι";
  }
  if (lowerContent.includes("γυναίκες") || lowerContent.includes("γυναικες") || lowerContent.includes("women")) {
    requirementsNormalized.targetGroup = (requirementsNormalized.targetGroup || "") + ", γυναίκες";
  }
  if (lowerContent.includes("μακροχρόνια άνεργ") || lowerContent.includes("μακροχρονια ανεργ")) {
    requirementsNormalized.targetGroup = "μακροχρόνια άνεργοι";
  }
  if (lowerContent.includes("κοινωνικός τουρισμός") || lowerContent.includes("κοινωνικος τουρισμος")) {
    requirementsNormalized.sector = "τουρισμός";
  }
  if (lowerContent.includes("κατάρτιση") || lowerContent.includes("καταρτιση") || lowerContent.includes("training")) {
    requirementsNormalized.sector = "κατάρτιση";
  }

  return {
    requirementsNormalized: Object.keys(requirementsNormalized).length > 0
      ? requirementsNormalized
      : undefined,
    requirementsSummaryBullets:
      requirementsSummaryBullets.length > 0
        ? requirementsSummaryBullets
        : [], // Return empty array instead of undefined
  };
}

/**
 * Main cleaner function
 */
export function cleanAndValidate(input: CleanerInput): CleanerOutput {
  const {
    nowIso,
    source,
    sourceUrl,
    itemUrl,
    rawTitle,
    rawContent,
  } = input;

  const now = new Date(nowIso);
  const evidence = {
    statusSignals: [] as string[],
    dateSignals: [] as string[],
    notes: [] as string[],
  };

  // BLACKLIST CHECK: Filter out procurement/tenders noise + administrative noise
  // BUT: Allow "Προκήρυξη" if source is ASEP (ASEP uses it for jobs, not tenders)
  const procurementKeywords = [
    "προμήθεια",
    "προμηθεια",
    "διαγωνισμός",
    "διαγωνισμος",
    "διακήρυξη",
    "διακηρυξη",
    "ανάδειξη αναδόχου",
    "αναδειξη αναδοχου",
    "διαπραγμάτευση",
    "διαπραγματευση",
    "κατασκευή έργου",
    "κατασκευη εργου",
    "σίτισης",
    "σιτισης",
    "τροφίμων",
    "τροφιμων",
    "εσηδης",
    "μίσθωση",
    "μισθωση",
    "καθαρισμός",
    "καθαρισμος",
    "φύλαξη",
    "φυλαξη",
  ];
  
  // Check for administrative noise keywords first
  // STRICT: Block meetings, reports, ceremonial events to save AI credits
  const administrativeKeywords = [
    "ερωτηματολόγιο", "ερωτηματολογιο",
    "αξιολόγηση", "αξιολογηση",
    "πρακτικό", "πρακτικο",
    "ετήσια έκθεση", "ετησια εκθεση", "εκθεσης", 
    "πεπραγμένα", "πεπραγμενα",
    "παράδοση", "παραδοση", // e.g. "παράδοση έκθεσης"
    "συνάντηση", "συναντηση",
    "επίσκεψη", "επισκεψη",
    "ορκωμοσία", "ορκωμοσια",
    "ημερίδα", "ημεριδα",
    "γενικής διεύθυνσης", "γενικης διευθυνσης",
    "θέσης ευθύνης", "θεσης ευθυνης",
    "προέδρου", "προεδρου",
    
    // NAVIGATION & PORTAL JUNK (Added based on user feedback)
    "δείτε περισσότερα", "δειτε περισσοτερα",
    "σημαντικές-ανακοινώσεις", "σημαντικες-ανακοινωσεις",
    "σαεκ δυπα", // General landing page
    "μονάδας εξυπηρέτησης", "μοναδας εξυπηρετησης", // General service info
    "υπηρεσίες σύζευξης", "υπηρεσιες συζευξης",
    "παροχές ασφάλισης", "παροχες ασφαλισης",
    "αναστολή λειτουργίας", "αναστολη λειτουργιας",
  ];
  
  const lowerTitle = rawTitle.toLowerCase();
  const lowerSource = source.toLowerCase();
  const isAsepSource = lowerSource.includes("asep") || lowerSource.includes("ασεπ");
  
  // ASEP 3-WEEK EXPIRY CHECK: Auto-archive ASEP results/objections older than 3 weeks
  // This prevents stale announcements from cluttering the feed even when AI fails
  if (isAsepSource) {
    const resultsKeywords = ["αποτελέσματα", "αποτελεσματα", "πίνακες", "πινακες", 
                            "ενστάσεις", "ενστασεις", "τοποθετήσεων", "τοποθετησεων",
                            "επιλαχόντων", "επιλαχοντων"];
    const hasResultsKeyword = resultsKeywords.some(kw => lowerTitle.includes(kw));
    
    if (hasResultsKeyword) {
      const fetchedAt = input.rawFetchedAtIso ? new Date(input.rawFetchedAtIso) : now;
      const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
      
      if (fetchedAt < threeWeeksAgo) {
        return {
          title: cleanTitle(rawTitle),
          summary: cleanSummary(rawTitle, rawContent),
          officialUrl: canonicalizeUrl(itemUrl),
          source,
          kind: "news",
          type: "asep_competition",
          applicationStatus: "results",
          startAt: null,
          deadlineAt: null,
          announcedAt: null,
          applicationStartAt: null,
          applicationEndAt: null,
          status: "archived",
          tags: ["ΑΣΕΠ", "αποτελέσματα"],
          criteriaUnknown: true,
          confidence: 0.5,
          requirementsNormalized: undefined,
          requirementsSummaryBullets: [],
          evidence: {
            statusSignals: [],
            dateSignals: [],
            notes: [`ASEP results/objections older than 3 weeks → auto-archived`],
          },
        };
      }
    }
  }
  
  // REJECT TEST CONTENT: items with "test" in the title are test/demo pages
  if (/\btest\b/i.test(rawTitle)) {
    return {
      title: cleanTitle(rawTitle),
      summary: cleanSummary(rawTitle, rawContent),
      officialUrl: canonicalizeUrl(itemUrl),
      source,
      kind: "service_info",
      type: "manual",
      applicationStatus: "unknown",
      startAt: null,
      deadlineAt: null,
      announcedAt: null,
      applicationStartAt: null,
      applicationEndAt: null,
      status: "rejected",
      tags: [],
      criteriaUnknown: true,
      confidence: 0.1,
      requirementsNormalized: undefined,
      requirementsSummaryBullets: [],
      evidence: {
        statusSignals: [],
        dateSignals: [],
        notes: [`Rejected: title contains "test" → test/demo content`],
      },
    };
  }
  
  // REJECT PORTAL/APP INFO PAGES: digital services, app downloads, general info
  const portalInfoKeywords = [
    "mydypaapp", "mydypalive", "mydypaραντεβού", "mydypa ραντεβού", "jobmatch",
    "δυπα digital", "dypa digital",
    "θέματα τ.οεκ", "θεματα τ.οεκ", "θέματα τ. οεκ", "θεματα τ. οεκ",
    "θέματα οεκ", "θεματα οεκ",
    "εφαρμογή κινητού", "εφαρμογη κινητου",
    "κατεβάστε την εφαρμογή", "κατεβαστε την εφαρμογη",
    "ψηφιακές υπηρεσίες δυπα", "ψηφιακες υπηρεσιες δυπα",
  ];
  const lowerContent = rawContent.toLowerCase();
  const matchedPortalKeyword = portalInfoKeywords.find(
    kw => lowerTitle.includes(kw) || lowerContent.substring(0, 300).includes(kw)
  );
  if (matchedPortalKeyword) {
    return {
      title: cleanTitle(rawTitle),
      summary: cleanSummary(rawTitle, rawContent),
      officialUrl: canonicalizeUrl(itemUrl),
      source,
      kind: "service_info",
      type: "manual",
      applicationStatus: "unknown",
      startAt: null,
      deadlineAt: null,
      announcedAt: null,
      applicationStartAt: null,
      applicationEndAt: null,
      status: "rejected",
      tags: [],
      criteriaUnknown: true,
      confidence: 0.2,
      requirementsNormalized: undefined,
      requirementsSummaryBullets: [],
      evidence: {
        statusSignals: [],
        dateSignals: [],
        notes: [`Rejected: portal/app info page (matched: "${matchedPortalKeyword}")`],
      },
    };
  }

  // Check for administrative noise keywords first
  const matchedAdminKeyword = administrativeKeywords.find(keyword => lowerTitle.includes(keyword.toLowerCase()));
  if (matchedAdminKeyword) {
    return {
      title: cleanTitle(rawTitle),
      summary: cleanSummary(rawTitle, rawContent),
      officialUrl: canonicalizeUrl(itemUrl),
      source,
      kind: "service_info",
      type: "manual",
      applicationStatus: "unknown",
      startAt: null,
      deadlineAt: null,
      announcedAt: null,
      applicationStartAt: null,
      applicationEndAt: null,
      status: "rejected",
      tags: [],
      criteriaUnknown: true,
      confidence: 0.3,
      requirementsNormalized: undefined,
      requirementsSummaryBullets: [],
      evidence: {
        statusSignals: [],
        dateSignals: [],
        notes: [`Rejected due to administrative noise keyword: "${matchedAdminKeyword}"`],
      },
    };
  }
  
  // Check for "Προκήρυξη" separately - only reject if NOT from ASEP
  const hasProkirixi = lowerTitle.includes("προκήρυξη") || lowerTitle.includes("προκηρυξη");
  if (hasProkirixi && !isAsepSource) {
    // "Προκήρυξη" from non-ASEP sources is likely a tender/procurement
    return {
      title: cleanTitle(rawTitle),
      summary: cleanSummary(rawTitle, rawContent),
      officialUrl: canonicalizeUrl(itemUrl),
      source,
      kind: "service_info",
      type: "manual",
      applicationStatus: "unknown",
      startAt: null,
      deadlineAt: null,
      announcedAt: null,
      applicationStartAt: null,
      applicationEndAt: null,
      status: "rejected",
      tags: [],
      criteriaUnknown: true,
      confidence: 0.3,
      requirementsNormalized: undefined,
      requirementsSummaryBullets: [],
      evidence: {
        statusSignals: [],
        dateSignals: [],
        notes: [`Rejected due to procurement keyword: "προκήρυξη" (non-ASEP source)`],
      },
    };
  }
  
  // Check for other procurement keywords (exempt ASEP sources)
  const matchedKeyword = procurementKeywords.find(keyword => lowerTitle.includes(keyword.toLowerCase()));
  
  if (matchedKeyword && !isAsepSource) {
    return {
      title: cleanTitle(rawTitle),
      summary: cleanSummary(rawTitle, rawContent),
      officialUrl: canonicalizeUrl(itemUrl),
      source,
      kind: "service_info",
      type: "manual",
      applicationStatus: "unknown",
      startAt: null,
      deadlineAt: null,
      announcedAt: null,
      applicationStartAt: null,
      applicationEndAt: null,
      status: "rejected",
      tags: [],
      criteriaUnknown: true,
      confidence: 0.3,
      requirementsNormalized: undefined,
      requirementsSummaryBullets: [],
      evidence: {
        statusSignals: [],
        dateSignals: [],
        notes: [`Rejected due to procurement keyword: "${matchedKeyword}"`],
      },
    };
  }

  // Check official domain
  const isOfficial = isOfficialDomain(itemUrl);
  if (!isOfficial) {
    evidence.notes.push("Domain not in official whitelist");
  }

  // OVERRIDE RULES (apply before service_info check)
  const overrideResult = checkOverrideRules(rawTitle, rawContent, itemUrl);
  if (overrideResult) {
    evidence.notes.push(`Override rule applied: ${overrideResult.reason}`);
    // Extract dates first (needed for status)
    const { startAt, deadlineAt, dateSignals } = extractDates(rawContent, now);
    evidence.dateSignals = dateSignals;
    
    // Determine application status
    const {
      status: detectedStatus,
      statusSignals,
      applicationStartAt: computedApplicationStartAt,
      applicationEndAt: computedApplicationEndAt,
    } = determineApplicationStatus(
      rawContent,
      startAt,
      deadlineAt,
      now,
      rawTitle,
      sourceUrl // Pass sourceUrl for trusted domain check
    );
    
    // Allow overrides to adjust high-level status semantics.
    let applicationStatus = detectedStatus;
    if (overrideResult.reason.includes("myΘέρμανση info page")) {
      // myΘέρμανση landing is informational; treat it as news, not upcoming.
      applicationStatus = "news";
      evidence.notes.push("Override: myΘέρμανση treated as news (informational page)");
    } else if (overrideResult.reason.includes("Κοινωνικός Τουρισμός info page")) {
      // Κοινωνικός Τουρισμός main page is also informational about a running scheme.
      // From the app perspective, it should not appear as an 'upcoming' opportunity.
      applicationStatus = "news";
      evidence.notes.push("Override: Κοινωνικός Τουρισμός treated as news (informational page)");
    }
    
    const applicationStartAt = computedApplicationStartAt || startAt;
    const applicationEndAt = computedApplicationEndAt || deadlineAt;
    evidence.statusSignals = statusSignals;
    
    // Override must STILL respect closed/expired → archived
    let finalOverrideStatus: "published" | "draft" | "archived" | "rejected" = overrideResult.status;
    if (applicationStatus === "closed" || applicationStatus === "expired") {
      finalOverrideStatus = "archived";
      evidence.notes.push(`Override status downgraded: ${applicationStatus} → archived`);
    } else if (applicationStatus === "results") {
      finalOverrideStatus = "archived";
      evidence.notes.push(`Override status downgraded: results → archived`);
    }
    
    return {
      title: cleanTitle(rawTitle),
      summary: cleanSummary(rawTitle, rawContent),
      officialUrl: canonicalizeUrl(itemUrl),
      source,
      kind: overrideResult.kind,
      type: overrideResult.type,
      applicationStatus,
      startAt: startAt ? startAt.toISOString() : null,
      deadlineAt: deadlineAt ? deadlineAt.toISOString() : null,
      announcedAt: now.toISOString(),
      applicationStartAt: applicationStartAt ? applicationStartAt.toISOString() : null,
      applicationEndAt: applicationEndAt ? applicationEndAt.toISOString() : null,
      status: finalOverrideStatus,
      tags: overrideResult.tags || [],
      criteriaUnknown: true,
      confidence: 0.8,
      requirementsNormalized: undefined,
      requirementsSummaryBullets: [],
      evidence: {
        statusSignals,
        dateSignals,
        notes: [`Override: ${overrideResult.reason}`, ...evidence.notes],
      },
    };
  }

  // Check if service info / menu / landing page
  if (isServiceInfo(rawTitle, rawContent, itemUrl)) {
    return {
      title: cleanTitle(rawTitle),
      summary: cleanSummary(rawTitle, rawContent),
      officialUrl: canonicalizeUrl(itemUrl),
      source,
      kind: "service_info",
      type: "manual",
      applicationStatus: "unknown",
      startAt: null,
      deadlineAt: null,
      announcedAt: null,
      applicationStartAt: null,
      applicationEndAt: null,
      status: "rejected",
      tags: [],
      criteriaUnknown: true,
      confidence: 0.3,
      requirementsNormalized: undefined,
      requirementsSummaryBullets: [],
      evidence: {
        statusSignals: [],
        dateSignals: [],
        notes: ["Detected as service_info/menu/landing page → rejected"],
      },
    };
  }

  // Extract dates
  const { startAt, deadlineAt, dateSignals } = extractDates(rawContent, now);
  evidence.dateSignals = dateSignals;

  // Determine application status
  const {
    status: applicationStatus,
    statusSignals,
    applicationStartAt: computedApplicationStartAt,
    applicationEndAt: computedApplicationEndAt,
  } = determineApplicationStatus(
    rawContent,
    startAt,
    deadlineAt,
    now,
    rawTitle,
    sourceUrl // Pass sourceUrl for trusted domain check
  );
  
  // Use computed dates or parsed dates
  const applicationStartAt = computedApplicationStartAt || startAt;
  const applicationEndAt = computedApplicationEndAt || deadlineAt;
  
  // announcedAt is the publishedAt date (when we first saw it)
  const announcedAt = now;
  evidence.statusSignals = statusSignals;

  // Classify kind and type
  const { kind, type } = classifyKindAndType(rawTitle, rawContent, itemUrl);

  // Determine status based on PUBLISH RULES
  let status: "published" | "draft" | "archived" | "rejected" = "draft";

  if (kind === "service_info") {
    status = "rejected";
    evidence.notes.push("Classified as service_info → rejected");
  } else if (kind === "tender") {
    // Tenders: published but excluded from Opportunities tabs (handled in getFeed)
    status = "published";
    evidence.notes.push("Tender/procurement → published (excluded from Opportunities tabs)");
  } else if (kind === "news") {
    // News: published but as news (not active application)
    status = "published";
    evidence.notes.push("News → published (as news, not active application)");
  } else if (applicationStatus === "expired" || applicationStatus === "closed") {
    // Closed/expired → archived (never published)
    status = "archived";
    evidence.notes.push(`${applicationStatus} → archived`);
  } else if (applicationStatus === "results") {
    // Results → archived (not active anymore)
    status = "archived";
    evidence.notes.push("Results published → archived");
  } else if (applicationStatus === "news") {
    // News → published but as news (not active application)
    status = "published";
    evidence.notes.push("News/announcement → published (as news, not active application)");
  } else if (applicationStatus === "open" || applicationStatus === "upcoming") {
    // Open/upcoming → published (for all kinds)
    // BUT: Only if we have valid application window
    if (applicationStartAt && applicationEndAt) {
      const now = new Date();
      if (applicationStartAt <= now && applicationEndAt >= now) {
        status = "published";
        evidence.notes.push(`${applicationStatus} status → published (valid application window)`);
      } else if (applicationStartAt > now) {
        status = "published";
        evidence.notes.push(`Upcoming → published (starts ${applicationStartAt.toISOString()})`);
      } else {
        // applicationEndAt < now but status is "open" - shouldn't happen, but archive it
        status = "archived";
        evidence.notes.push(`Open status but applicationEndAt (${applicationEndAt.toISOString()}) is in past → archived`);
      }
    } else {
      // No application window but status is "open" - be cautious
      if (applicationStatus === "upcoming") {
        status = "published";
        evidence.notes.push("Upcoming → published (no application window yet)");
      } else {
        // "open" without dates - check if it's a Pass with year in title
        const lowerTitle = rawTitle.toLowerCase();
        const hasYear = /\b20\d{2}\b/.test(lowerTitle);
        const isPass = lowerTitle.includes("pass") || kind === "voucher_pass";
        
        if (isPass && hasYear && !applicationEndAt) {
          // Pass with year but no end date - treat as news/unknown, not active
          status = "draft";
          evidence.notes.push(`Pass with year in title but no application window → draft (not active without dates)`);
        } else if (isPass && hasYear && applicationEndAt && applicationEndAt < now) {
          // Pass with year and expired deadline - should have been caught earlier, but archive it
          status = "archived";
          evidence.notes.push(`Pass with year in title and expired deadline → archived`);
        } else {
          // "open" without dates
          // Check for explicit "Open" indicators in title (e.g. Ανοικτό, Ενεργό, Προδημοσίευση)
          const isOpenProgram = /ανοικτό|ανοιχτό|ενεργό|προδημοσίευση|pre-publication|open/i.test(rawTitle);
            
          if (isOpenProgram) {
            status = "published";
            evidence.notes.push("Open status without dates but title indicates Open Program → published");
          } else {
            // Otherwise draft
            status = "draft";
            evidence.notes.push("Open status but no application window dates → draft (needs verification)");
          }
        }
      }
    }
  } else if (applicationStatus === "unknown") {
    // Unknown status: different rules per kind
    if (kind === "benefit") {
      // Benefit with unknown status → published (stable/recurring benefit)
      // Only if official domain and no closed indicators
      const noClosedIndicators = !CLOSED_KEYWORDS.some((kw) =>
        rawContent.toLowerCase().includes(kw)
      );
      const isSpitiMou2 = rawTitle.toLowerCase().includes("σπίτι μου ιι") || rawTitle.toLowerCase().includes("σπίτι μου 2");
      
      if (isOfficial && noClosedIndicators && (rawContent.length > 50 || isSpitiMou2)) {
        status = "published";
        evidence.notes.push("Benefit with unknown status → published (stable benefit)");
      } else {
        status = "draft";
        const reasons: string[] = [];
        if (!isOfficial) reasons.push("not official domain");
        if (!noClosedIndicators) reasons.push("has closed indicators");
        if (rawContent.length <= 50) reasons.push(`content too short (${rawContent.length} chars)`);
        evidence.notes.push(`Benefit with unknown status → draft: ${reasons.join(", ")}`);
      }
    } else if (kind === "program" || kind === "voucher_pass") {
      // Program/voucher_pass with unknown status → draft (don't show as "open")
      // EXCEPTION: ASEP competitions can be published if no closed indicators
      if (type === "asep_competition") {
        const noClosedIndicators = !CLOSED_KEYWORDS.some((kw) =>
          rawContent.toLowerCase().includes(kw)
        );
        // Check for ASEP stage indicators
        const asepStageMatch = rawContent.match(/(?:τρέχον\s+στάδιο|current\s+stage)[\s:]+([^\.\n]{0,200})/i);
        const stageIndicatesClosed = asepStageMatch && (
          asepStageMatch[1].toLowerCase().includes("αποτελέσματα") ||
          asepStageMatch[1].toLowerCase().includes("έλεγχος") ||
          asepStageMatch[1].toLowerCase().includes("επεξεργασία")
        );
        
        if (noClosedIndicators && !stageIndicatesClosed && isOfficial) {
          status = "published";
          evidence.notes.push("ASEP competition with unknown status → published (no closed indicators)");
        } else {
          status = "draft";
          const reasons: string[] = [];
          if (!noClosedIndicators) reasons.push("has closed indicators");
          if (stageIndicatesClosed) reasons.push("stage indicates closed");
          if (!isOfficial) reasons.push("not official domain");
          evidence.notes.push(`ASEP competition with unknown status → draft: ${reasons.join(", ")}`);
        }
      } else {
        status = "draft";
        evidence.notes.push(`${kind} with unknown status → draft (needs explicit dates/status, not published without open/upcoming status)`);
      }
    } else {
      status = "draft";
      evidence.notes.push("Unknown status + unclear opportunity → draft");
    }
  }

  // Calculate confidence
  let confidence = 0.5;
  if (isOfficial) confidence += 0.2;
  if (kind !== "service_info") confidence += 0.2;
  if (deadlineAt || startAt) confidence += 0.1;
  if (applicationStatus !== "unknown") confidence += 0.1;
  if (rawContent.length > 200) confidence += 0.05;
  if (rawTitle.length > 10 && rawTitle.length < 100) confidence += 0.05;
  confidence = Math.min(confidence, 1.0);

  // Extract tags (enhanced for ASEP)
  const tags = extractTags(rawTitle, rawContent, itemUrl);
  
  // ASEP-specific tags
  if (type === "asep_competition") {
    tags.push("asep", "προκήρυξη", "εργασία", "δημόσιο");
    
    // Detect education levels (ΠΕ/ΤΕ/ΔΕ/ΥΕ)
    const lowerContent = rawContent.toLowerCase();
    if (lowerContent.includes("πτυχίο π.ε.") || lowerContent.includes("π.ε.") || lowerContent.includes("πτυχίο πανεπιστημίου")) {
      tags.push("ΠΕ");
    }
    if (lowerContent.includes("πτυχίο τ.ε.") || lowerContent.includes("τ.ε.") || lowerContent.includes("τεχνολογικό")) {
      tags.push("ΤΕ");
    }
    if (lowerContent.includes("δ.ε.") || lowerContent.includes("δευτεροβάθμια")) {
      tags.push("ΔΕ");
    }
    if (lowerContent.includes("υ.ε.") || lowerContent.includes("υποδευτεροβάθμια")) {
      tags.push("ΥΕ");
    }
    
    // Detect SOX/SME
    if (lowerContent.includes("σοχ") || lowerContent.includes("σμε")) {
      tags.push("ΣΟΧ");
    }
    if (lowerContent.includes("σμε")) {
      tags.push("ΣΜΕ");
    }
  }

  // Extract matching hints
  let { requirementsNormalized, requirementsSummaryBullets } =
    extractMatchingHints(rawTitle, rawContent, itemUrl, now, evidence.statusSignals);
  
  // For ASEP, extract additional requirements
  if (type === "asep_competition") {
    const asepReqs = extractASEPRequirements(rawTitle, rawContent, itemUrl);
    
    // Merge ASEP requirements into requirementsNormalized
    if (!requirementsNormalized) {
      requirementsNormalized = {};
    }
    
    if (asepReqs.educationLevels) {
      requirementsNormalized.educationLevels = asepReqs.educationLevels;
    }
    if (asepReqs.degreeFieldsKeywords) {
      requirementsNormalized.degreeFieldsKeywords = asepReqs.degreeFieldsKeywords;
    }
    if (asepReqs.languagesRequired) {
      requirementsNormalized.languagesRequired = asepReqs.languagesRequired;
    }
    if (asepReqs.itSkillsRequired !== undefined) {
      requirementsNormalized.itSkillsRequired = asepReqs.itSkillsRequired;
    }
    if (asepReqs.licensingRequiredKeywords) {
      requirementsNormalized.licensingRequiredKeywords = asepReqs.licensingRequiredKeywords;
    }
    
    // Add contest code and FEK ref to criteriaJson
    if (asepReqs.contestCode || asepReqs.fekRef) {
      // These will be stored in criteriaJson
    }
  }

  // Clean title and summary
  const title = cleanTitle(rawTitle);
  const summary = cleanSummary(title, rawContent);

  // FINAL SAFETY: If worker determined it's expired/closed, ensure status is archived
  let finalStatus = status;
  if (applicationStatus === "expired" || applicationStatus === "closed" || applicationStatus === "results") {
    if (finalStatus === "published" || finalStatus === "draft") {
      finalStatus = "archived";
      evidence.notes.push(`Worker auto-archive: applicationStatus is ${applicationStatus}`);
    }
  }

  return {
    title,
    summary,
    officialUrl: canonicalizeUrl(itemUrl),
    source,
    kind,
    type: type, // Keep type as is (no mapping needed)
    applicationStatus,
    startAt: startAt ? startAt.toISOString() : null,
    deadlineAt: deadlineAt ? deadlineAt.toISOString() : null,
    announcedAt: announcedAt ? announcedAt.toISOString() : null,
    applicationStartAt: applicationStartAt ? applicationStartAt.toISOString() : null,
    applicationEndAt: applicationEndAt ? applicationEndAt.toISOString() : null,
    status: finalStatus,
    tags,
    criteriaUnknown: !requirementsNormalized || Object.keys(requirementsNormalized).length === 0,
    confidence,
    requirementsNormalized,
    requirementsSummaryBullets: requirementsSummaryBullets || [],
    evidence,
  };
}

// Export for backwards compatibility
export type RawItem = CleanerInput;

