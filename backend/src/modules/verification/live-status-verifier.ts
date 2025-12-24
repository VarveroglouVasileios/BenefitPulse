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
  brokenLink?: boolean; // True if URL is 404/redirect to unrelated domain
  isRelevantDecision?: boolean; // For diavgeia: true if relevant to benefits/programs
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
 * Check if Diavgeia decision is relevant to benefits/programs
 */
function isRelevantDiavgeiaDecision(html: string, title: string, summary: string): boolean {
  const lowerHtml = html.toLowerCase();
  const lowerTitle = title.toLowerCase();
  const lowerSummary = summary.toLowerCase();
  const combinedText = `${lowerTitle} ${lowerSummary} ${lowerHtml}`;
  
  // Keywords that indicate relevance to benefits/programs
  const relevantKeywords = [
    "voucher",
    "pass",
    "επίδομα",
    "επιδομα",
    "επιδότηση",
    "επιχορηγηση",
    "πρόγραμμα",
    "προγραμμα",
    "παροχή",
    "παροχη",
    "βοήθημα",
    "βοηθημα",
    "κατάρτιση",
    "καταρτιση",
    "απασχόληση",
    "απασχοληση",
    "ανεργία",
    "ανεργια",
    "subsidy",
    "grant",
    "benefit",
  ];
  
  // Check if at least 2 keywords are present in title/summary OR 1 keyword in body
  const titleSummaryText = `${lowerTitle} ${lowerSummary}`;
  const keywordsInTitleSummary = relevantKeywords.filter(kw => titleSummaryText.includes(kw));
  
  if (keywordsInTitleSummary.length >= 2) {
    return true; // Strong signal from title/summary
  }
  
  // Check body content (must have substantial content with keywords)
  const keywordsInBody = relevantKeywords.filter(kw => lowerHtml.includes(kw));
  if (keywordsInBody.length >= 1 && lowerHtml.length > 500) {
    // At least 1 keyword AND substantial content (>500 chars)
    return true;
  }
  
  return false;
}

/**
 * Check if redirect goes to unrelated domain
 */
function isUnrelatedRedirect(originalUrl: string, finalUrl: string): boolean {
  try {
    const originalDomain = new URL(originalUrl).hostname.toLowerCase().replace(/^www\./, "");
    const finalDomain = new URL(finalUrl).hostname.toLowerCase().replace(/^www\./, "");
    
    // Same domain or subdomain is OK
    if (finalDomain === originalDomain || finalDomain.endsWith(`.${originalDomain}`)) {
      return false;
    }
    
    // Known redirect domains that are OK
    const allowedRedirectDomains = [
      "gov.gr",
      "dypa.gov.gr",
      "efka.gov.gr",
      "e-efka.gov.gr",
      "opeka.gr",
      "aade.gr",
      "diavgeia.gov.gr",
      "opendata.diavgeia.gov.gr",
    ];
    
    // Check if final domain is in allowed list
    const isAllowed = allowedRedirectDomains.some(allowed => 
      finalDomain === allowed || finalDomain.endsWith(`.${allowed}`)
    );
    
    return !isAllowed; // Unrelated if not in allowed list
  } catch {
    return false; // If parsing fails, assume OK
  }
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
      brokenLink: false,
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
    // Fetch page (GET, not HEAD) - track redirects
    let finalUrl = url;
    const response = await axios.get(url, {
      timeout: 10000,
      maxRedirects: 5,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BenefitPulse/1.0; +https://benefitpulse.gr)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      validateStatus: (status) => status < 500, // Don't throw on 404/410
    });
    
    // Get final URL after redirects
    finalUrl = response.request?.responseURL || response.config?.url || url;
    
    // Check for dead links
    if (response.status === 404 || response.status === 410) {
      const result: VerificationResult = {
        verificationResult: "dead_link",
        evidenceSnippet: `HTTP ${response.status}`,
        verifiedAt: new Date(),
        httpStatus: response.status,
        shouldUpdateStatus: true,
        brokenLink: true,
      };
      
      cacheResult(url, result);
      return result;
    }
    
    // Check for unrelated redirects
    if (finalUrl !== url && isUnrelatedRedirect(url, finalUrl)) {
      const result: VerificationResult = {
        verificationResult: "dead_link",
        evidenceSnippet: `Redirected to unrelated domain: ${finalUrl}`,
        verifiedAt: new Date(),
        httpStatus: response.status,
        shouldUpdateStatus: true,
        brokenLink: true,
      };
      
      cacheResult(url, result);
      return result;
    }
    
    // Special handling for Diavgeia: check if decision is relevant
    const isDiavgeia = domain.includes("diavgeia.gov.gr");
    let isRelevantDecision = true; // Default: assume relevant
    
    if (isDiavgeia) {
      const html = typeof response.data === "string" ? response.data : "";
      isRelevantDecision = isRelevantDiavgeiaDecision(
        html,
        opportunity.title || "",
        opportunity.summary || ""
      );
      
      // If not relevant, mark as decision (not opportunity) and exclude from active tabs
      if (!isRelevantDecision) {
        const result: VerificationResult = {
          verificationResult: "closed", // Treat as closed (not active opportunity)
          evidenceSnippet: "Diavgeia decision not relevant to benefits/programs",
          verifiedAt: new Date(),
          httpStatus: response.status,
          shouldUpdateStatus: true,
          brokenLink: false,
          isRelevantDecision: false,
        };
        
        cacheResult(url, result);
        return result;
      }
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
      brokenLink: false,
      isRelevantDecision: isDiavgeia ? isRelevantDecision : undefined,
    };
    
    cacheResult(url, result);
    return result;
  } catch (error: any) {
    // Network/timeout errors: mark as unknown (don't reject)
    const result: VerificationResult = {
      verificationResult: "unknown",
      evidenceSnippet: error.message?.substring(0, 200) || "Network error",
      verifiedAt: new Date(),
      brokenLink: false,
    };
    
    // Don't cache errors (retry next time)
    return result;
  }
}

