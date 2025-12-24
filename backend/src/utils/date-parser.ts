/**
 * Unified Date Parser and Normalizer
 * 
 * Supports:
 * - ISO strings
 * - Greek formats (24/12/2025, 24-12-2025)
 * - Timestamps in ms (1766275200000)
 * - Text patterns ("Ημερομηνία: 1766275200000...")
 * 
 * Normalization:
 * - All dates stored as Date (UTC) but comparisons in Europe/Athens
 * - Invalid dates return null (never Invalid Date)
 */

export interface DateParseResult {
  date: Date | null;
  rawDate: string;
  matchedText?: string;
  error?: string;
}

// Greek month names mapping
const GREEK_MONTHS: Record<string, number> = {
  "ιανουαρίου": 0, "ιανουαριου": 0, "ιαν": 0,
  "φεβρουαρίου": 1, "φεβρουαριου": 1, "φεβ": 1,
  "μαρτίου": 2, "μαρτιου": 2, "μαρ": 2,
  "απριλίου": 3, "απριλιου": 3, "απρ": 3,
  "μαΐου": 4, "μαιου": 4, "μαι": 4, "μαη": 4,
  "ιουνίου": 5, "ιουνιου": 5, "ιουν": 5,
  "ιουλίου": 6, "ιουλιου": 6, "ιουλ": 6,
  "αυγούστου": 7, "αυγουστου": 7, "αυγ": 7,
  "σεπτεμβρίου": 8, "σεπτεμβριου": 8, "σεπ": 8,
  "οκτωβρίου": 9, "οκτωβριου": 9, "οκτ": 9,
  "νοεμβρίου": 10, "νοεμβριου": 10, "νοε": 10,
  "δεκεμβρίου": 11, "δεκεμβριου": 11, "δεκ": 11,
};

/**
 * Parse timestamp from text (supports ms timestamps)
 */
function parseTimestamp(text: string): Date | null {
  // Extract numeric timestamp (10-13 digits)
  const timestampMatch = text.match(/\b(\d{10,13})\b/);
  if (timestampMatch) {
    const timestamp = parseInt(timestampMatch[1], 10);
    // If it's 10 digits, assume seconds and convert to ms
    const ms = timestamp.toString().length === 10 ? timestamp * 1000 : timestamp;
    const date = new Date(ms);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  return null;
}

/**
 * Parse ISO date string
 */
function parseISO(text: string): Date | null {
  // Try ISO format (YYYY-MM-DD or full ISO string)
  const isoMatch = text.match(/\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?)?/);
  if (isoMatch) {
    const date = new Date(isoMatch[0]);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  return null;
}

/**
 * Parse Greek date formats (DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY)
 */
function parseGreekFormat(text: string): Date | null {
  // Pattern: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const datePattern = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/;
  const match = text.match(datePattern);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // JS months are 0-indexed
    const year = parseInt(match[3], 10);
    
    // Validate
    if (day < 1 || day > 31 || month < 0 || month > 11) {
      return null;
    }
    
    // Create date in UTC, but interpret as Athens time
    // We'll create it as if it's in Athens timezone, then convert to UTC
    const date = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  return null;
}

/**
 * Parse Greek date with month name (e.g., "29 Οκτωβρίου 2025")
 */
function parseGreekMonthName(text: string): Date | null {
  const greekDatePattern = /(\d{1,2})\s+([α-ωάέήίόύώ]+)\s+(\d{4})/i;
  const match = text.match(greekDatePattern);
  if (match) {
    const day = parseInt(match[1], 10);
    const monthName = match[2].toLowerCase();
    const year = parseInt(match[3], 10);
    const month = GREEK_MONTHS[monthName];
    
    if (month !== undefined && day >= 1 && day <= 31) {
      const date = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  return null;
}

/**
 * Parse date from text patterns like "Ημερομηνία: 24/12/2025"
 */
function extractDateFromText(text: string): { date: Date | null; matchedText: string } {
  const cleanText = text.trim();
  
  // Try to extract date after common prefixes
  const prefixes = [
    /(?:ημερομηνία|ημερομηνια|date|published|updated|έως|μέχρι|από|έναρξη|λήξη)[\s:]+([^\.\n]{0,80})/i,
    /(?:ημερομηνία|ημερομηνια|date)[\s:]+([^\.\n]{0,80})/i,
  ];
  
  for (const prefix of prefixes) {
    const match = cleanText.match(prefix);
    if (match && match[1]) {
      const dateStr = match[1].trim();
      // Try all parsers on extracted text
      const parsers = [
        () => parseISO(dateStr),
        () => parseGreekFormat(dateStr),
        () => parseGreekMonthName(dateStr),
        () => parseTimestamp(dateStr),
      ];
      
      for (const parser of parsers) {
        const date = parser();
        if (date) {
          return { date, matchedText: match[0] };
        }
      }
    }
  }
  
  return { date: null, matchedText: "" };
}

/**
 * Main date parser function
 * 
 * @param input - Can be ISO string, Greek format, timestamp (number or string), or text
 * @param now - Current date for relative parsing (optional)
 * @returns DateParseResult with date (null if invalid), rawDate, and optional error
 */
export function parseDate(input: string | number | Date | null | undefined, now?: Date): DateParseResult {
  const rawDate = String(input || "");
  
  // Handle null/undefined/empty
  if (!input || rawDate.trim() === "" || rawDate === "null" || rawDate === "undefined") {
    return { date: null, rawDate, error: "Empty or null input" };
  }
  
  // If already a Date object
  if (input instanceof Date) {
    if (isNaN(input.getTime())) {
      return { date: null, rawDate, error: "Invalid Date object" };
    }
    return { date: input, rawDate };
  }
  
  // If number (timestamp)
  if (typeof input === "number") {
    const ms = input.toString().length === 10 ? input * 1000 : input;
    const date = new Date(ms);
    if (isNaN(date.getTime())) {
      return { date: null, rawDate, error: "Invalid timestamp" };
    }
    return { date, rawDate };
  }
  
  const text = String(input).trim();
  
  // Try parsers in order of specificity
  const parsers: Array<{ name: string; fn: () => Date | null }> = [
    { name: "ISO", fn: () => parseISO(text) },
    { name: "timestamp", fn: () => parseTimestamp(text) },
    { name: "greekFormat", fn: () => parseGreekFormat(text) },
    { name: "greekMonthName", fn: () => parseGreekMonthName(text) },
  ];
  
  for (const parser of parsers) {
    const date = parser.fn();
    if (date && !isNaN(date.getTime())) {
      return { date, rawDate, matchedText: text };
    }
  }
  
  // Try extracting from text patterns
  const extracted = extractDateFromText(text);
  if (extracted.date) {
    return { date: extracted.date, rawDate, matchedText: extracted.matchedText };
  }
  
  // Try native Date constructor as last resort
  try {
    const nativeDate = new Date(text);
    if (!isNaN(nativeDate.getTime())) {
      return { date: nativeDate, rawDate, matchedText: text };
    }
  } catch {
    // Ignore
  }
  
  return { date: null, rawDate, error: "Could not parse date" };
}

/**
 * Normalize date to UTC Date object
 * All dates are stored as UTC but should be compared in Europe/Athens timezone
 * 
 * @param date - Date to normalize
 * @returns Normalized Date in UTC, or null if invalid
 */
export function normalizeDate(date: Date | null | undefined): Date | null {
  if (!date) return null;
  if (isNaN(date.getTime())) return null;
  return date;
}

/**
 * Compare dates in Europe/Athens timezone
 * 
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Comparison result: -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
export function compareDatesInAthens(date1: Date | null, date2: Date | null): number {
  if (!date1 && !date2) return 0;
  if (!date1) return -1;
  if (!date2) return 1;
  
  // Dates are stored as UTC, but we compare them directly
  // (UTC comparison is equivalent to Athens comparison for same moment)
  const time1 = date1.getTime();
  const time2 = date2.getTime();
  
  if (time1 < time2) return -1;
  if (time1 > time2) return 1;
  return 0;
}

/**
 * Check if date is in the past (in Europe/Athens timezone)
 */
export function isPast(date: Date | null, now: Date = new Date()): boolean {
  if (!date) return false;
  return compareDatesInAthens(date, now) < 0;
}

/**
 * Check if date is in the future (in Europe/Athens timezone)
 */
export function isFuture(date: Date | null, now: Date = new Date()): boolean {
  if (!date) return false;
  return compareDatesInAthens(date, now) > 0;
}

/**
 * Check if date is today (in Europe/Athens timezone)
 */
export function isToday(date: Date | null, now: Date = new Date()): boolean {
  if (!date) return false;
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return dateStart.getTime() === nowStart.getTime();
}

/**
 * Format date for display (in Europe/Athens timezone)
 */
export function formatDateForDisplay(date: Date | null): string {
  if (!date) return "";
  // Format as DD/MM/YYYY
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

