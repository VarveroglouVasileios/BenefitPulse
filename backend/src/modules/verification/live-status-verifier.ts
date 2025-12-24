/**
 * Live Status Verification Service
 * 
 * Verifies published opportunities by fetching their official URLs
 * and checking for status signals (closed, open, upcoming)
 */

import axios from "axios";
import * as cheerio from "cheerio";
import { parseDate, normalizeDate } from "../../utils/date-parser";

export interface VerificationResult {
  verificationResult: "open" | "upcoming" | "closed" | "unknown" | "dead_link";
  evidenceSnippet: string;
  verifiedAt: Date;
  httpStatus?: number;
  shouldUpdateStatus?: boolean;
  newApplicationStatus?: "open" | "upcoming" | "closed" | "unknown";
}

// Rate limiting: track last request time per domain
const domainLastRequest = new Map<string, number>();
const RATE_LIMIT_MS = 1000; // 1 request per second per domain

// Caching: store verification results for 24h
const verificationCache = new Map<string, { result: VerificationResult; cachedAt: Date }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Extract domain from URL for rate limiting
 */
function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.toLowerCase();
  } catch {
    return "unknown";
  }
}

/**
 * Rate limit: wait if needed before making request
 */
async function rateLimit(domain: string): Promise<void> {
  const lastRequest = domainLastRequest.get(domain) || 0;
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequest;
  
  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    const waitTime = RATE_LIMIT_MS - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  domainLastRequest.set(domain, Date.now());
}

/**
 * Check cache for verification result
 */
function getCachedResult(url: string): VerificationResult | null {
  const cached = verificationCache.get(url);
  if (!cached) return null;
  
  const age = Date.now() - cached.cachedAt.getTime();
  if (age > CACHE_TTL_MS) {
    verificationCache.delete(url);
    return null;
  }
  
  return cached.result;
}

/**
 * Cache verification result
 */
function cacheResult(url: string, result: VerificationResult): void {
  verificationCache.set(url, {
    result,
    cachedAt: new Date(),
  });
}

/**
 * Extract status signals from page content
 */
function extractStatusSignals(html: string, url: string): {
  status: "open" | "upcoming" | "closed" | "unknown";
  evidenceSnippet: string;
  dates?: { startAt?: Date; endAt?: Date };
} {
  const $ = cheerio.load(html);
  const text = $.text().toLowerCase();
  const now = new Date();
  
  // Closed signals
  const closedPatterns = [
    /η\s+προθεσμία\s+έληξε/i,
    /προθεσμία\s+έληξε/i,
    /δεν\s+είναι\s+δυνατή\s+η\s+υποβολή/i,
    /οι\s+αιτήσεις\s+ολοκληρώθηκαν/i,
    /ολοκληρώθηκαν\s+οι\s+αιτήσεις/i,
    /έκλεισε\s+η\s+προθεσμία/i,
    /κλείσιμο\s+αιτήσεων/i,
  ];
  
  for (const pattern of closedPatterns) {
    const match = text.match(pattern);
    if (match) {
      const context = match[0];
      const startIdx = Math.max(0, text.indexOf(context) - 50);
      const endIdx = Math.min(text.length, text.indexOf(context) + context.length + 50);
      const snippet = text.substring(startIdx, endIdx).trim();
      
      return {
        status: "closed",
        evidenceSnippet: snippet.substring(0, 200),
      };
    }
  }
  
  // Open signals with dates
  const openPatterns = [
    /υποβολή\s+αιτήσεων\s+από\s+([^έως\n]{0,80})\s+έως\s+([^\.\n]{0,80})/i,
    /αιτήσεις\s+από\s+([^έως\n]{0,80})\s+έως\s+([^\.\n]{0,80})/i,
    /υποβολή\s+έως\s+([^\.\n]{0,80})/i,
    /προθεσμία\s+έως\s+([^\.\n]{0,80})/i,
  ];
  
  for (const pattern of openPatterns) {
    const match = text.match(pattern);
    if (match) {
      const dates: { startAt?: Date; endAt?: Date } = {};
      
      // Parse dates
      if (match[1]) {
        const startResult = parseDate(match[1]);
        if (startResult.date) {
          dates.startAt = normalizeDate(startResult.date);
        }
      }
      
      if (match[2] || match[1]) {
        const endStr = match[2] || match[1];
        const endResult = parseDate(endStr);
        if (endResult.date) {
          dates.endAt = normalizeDate(endResult.date);
        }
      }
      
      // Determine status based on dates
      let status: "open" | "upcoming" | "closed" | "unknown" = "unknown";
      if (dates.endAt) {
        if (dates.endAt < now) {
          status = "closed";
        } else if (dates.startAt && dates.startAt > now) {
          status = "upcoming";
        } else {
          status = "open";
        }
      } else if (dates.startAt && dates.startAt > now) {
        status = "upcoming";
      } else if (dates.startAt && dates.startAt <= now) {
        status = "open";
      }
      
      const context = match[0];
      const startIdx = Math.max(0, text.indexOf(context) - 50);
      const endIdx = Math.min(text.length, text.indexOf(context) + context.length + 50);
      const snippet = text.substring(startIdx, endIdx).trim();
      
      return {
        status,
        evidenceSnippet: snippet.substring(0, 200),
        dates,
      };
    }
  }
  
  // Upcoming signals
  const upcomingPatterns = [
    /θα\s+ξεκινήσει/i,
    /αναμένεται/i,
    /θα\s+προκηρυχθεί/i,
    /έναρξη\s+από\s+([^\.\n]{0,80})/i,
  ];
  
  for (const pattern of upcomingPatterns) {
    const match = text.match(pattern);
    if (match) {
      const dates: { startAt?: Date } = {};
      
      if (match[1]) {
        const startResult = parseDate(match[1]);
        if (startResult.date) {
          dates.startAt = normalizeDate(startResult.date);
        }
      }
      
      const context = match[0];
      const startIdx = Math.max(0, text.indexOf(context) - 50);
      const endIdx = Math.min(text.length, text.indexOf(context) + context.length + 50);
      const snippet = text.substring(startIdx, endIdx).trim();
      
      return {
        status: dates.startAt && dates.startAt > now ? "upcoming" : "unknown",
        evidenceSnippet: snippet.substring(0, 200),
        dates,
      };
    }
  }
  
  return {
    status: "unknown",
    evidenceSnippet: "",
  };
}

/**
 * Verify live status of an opportunity
 */
export async function verifyLiveStatus(
  opportunity: any
): Promise<VerificationResult> {
  const url = opportunity.officialUrl;
  if (!url) {
    return {
      verificationResult: "unknown",
      evidenceSnippet: "No URL provided",
      verifiedAt: new Date(),
    };
  }
  
  // Check cache
  const cached = getCachedResult(url);
  if (cached) {
    return cached;
  }
  
  const domain = getDomain(url);
  await rateLimit(domain);
  
  try {
    // Fetch page (GET, not HEAD)
    const response = await axios.get(url, {
      timeout: 10000,
      maxRedirects: 5,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BenefitPulse/1.0; +https://benefitpulse.gr)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      validateStatus: (status) => status < 500, // Don't throw on 404/410
    });
    
    // Check for dead links
    if (response.status === 404 || response.status === 410) {
      const result: VerificationResult = {
        verificationResult: "dead_link",
        evidenceSnippet: `HTTP ${response.status}`,
        verifiedAt: new Date(),
        httpStatus: response.status,
        shouldUpdateStatus: true,
      };
      
      cacheResult(url, result);
      return result;
    }
    
    // Extract status signals from content
    const html = typeof response.data === "string" ? response.data : "";
    const signals = extractStatusSignals(html, url);
    
    const result: VerificationResult = {
      verificationResult: signals.status,
      evidenceSnippet: signals.evidenceSnippet,
      verifiedAt: new Date(),
      httpStatus: response.status,
      shouldUpdateStatus: signals.status !== "unknown",
      newApplicationStatus: signals.status !== "unknown" ? signals.status : undefined,
    };
    
    cacheResult(url, result);
    return result;
  } catch (error: any) {
    // Network/timeout errors: mark as unknown (don't reject)
    const result: VerificationResult = {
      verificationResult: "unknown",
      evidenceSnippet: error.message?.substring(0, 200) || "Network error",
      verifiedAt: new Date(),
    };
    
    // Don't cache errors (retry next time)
    return result;
  }
}

