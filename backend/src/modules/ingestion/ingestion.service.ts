import Parser from "rss-parser";
import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import * as cheerio from "cheerio";
import { Source } from "../../models/source.model";
import { RawItem } from "../../models/rawItem.model";
import { Opportunity } from "../../models/opportunity.model";
import { generateHash } from "../../utils/normalize";
import { config } from "../../config/env";
import { extractOpportunity, extractApplicationStatus } from "./extractor";
import { cleanAndValidate, CleanerInput } from "./cleaner";
import { checkSourceHealth, fixEndpointUrl } from "./source-health-check";
import { IngestionReporter } from "./ingestion-reporter";
import { parseDate, normalizeDate } from "../../utils/date-parser";
import { ProgressTracker } from "../../utils/progress";
import { extractDiavgeiaText, crossReferenceAsepWithDiavgeia, searchDiavgeia } from "./diavgeia";

// Simple in-memory caches for AI results (per worker process)
// Key: hash of title+url (or content), Value: AIStatusResult / ExtractedOpportunity
const aiStatusCache = new Map<string, Awaited<ReturnType<typeof extractApplicationStatus>>>();
const aiExtractCache = new Map<string, Awaited<ReturnType<typeof extractOpportunity>>>();
const SOURCE_FETCH_TIMEOUT_MS = config.ingestion.sourceTimeoutMs;
const AI_THROTTLE_DELAY_MS = config.ingestion.aiThrottleMs;

const rssParser = new Parser({
  customFields: {
    item: ["category"],
  },
});

const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  "Connection": "keep-alive",
  "Cache-Control": "max-age=0",
  "Accept-Language": "el-GR,el;q=0.9,en-US;q=0.8,en;q=0.7",
  "Sec-Ch-Ua": '"Chromium";v="123", "Not:A-Brand";v="8", "Google Chrome";v="123"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"macOS"',
  "Upgrade-Insecure-Requests": "1"
};

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** gov.gr often returns 403 on /en/... for datacenter IPs; Greek path may work. */
function alternateGovGrUrlIfEnglish(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (host !== "www.gov.gr" && host !== "gov.gr") return null;
    if (!u.pathname.startsWith("/en/")) return null;
    u.pathname = u.pathname.replace(/^\/en\//, "/");
    return u.toString();
  } catch {
    return null;
  }
}

// Headers per source type
function getHeadersForSourceType(sourceType: string, url?: string): Record<string, string> {
  const baseHeaders = {
    ...DEFAULT_HEADERS,
  };

  if (url) {
    try {
      const u = new URL(url);
      baseHeaders["Referer"] = `${u.protocol}//${u.hostname}/`;
    } catch { /* ignore */ }
  }

  if (sourceType === "rss") {
    return {
      ...baseHeaders,
      Accept: "application/rss+xml,application/xml;q=0.9,text/xml;q=0.9,*/*;q=0.8",
    };
  } else if (sourceType === "api") {
    return {
      ...baseHeaders,
      Accept: "application/json, text/plain, */*",
    };
  } else {
    // html_listing, html_catalog, single_page
    return {
      ...baseHeaders,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Upgrade-Insecure-Requests": "1",
    };
  }
}

// Follow redirects and detect 404s
async function fetchWithRedirects(
  url: string,
  options: any = {}
): Promise<{ 
  data: any; 
  finalUrl: string; 
  statusCode: number; 
  is404: boolean; 
  contentType?: string;
  contentLength?: number;
}> {
  try {
    const fetchHeaders = { ...DEFAULT_HEADERS, ...(options.headers || {}) };
    if (!fetchHeaders["Referer"]) {
      try {
        const u = new URL(url);
        fetchHeaders["Referer"] = `${u.protocol}//${u.hostname}/`;
      } catch { /* ignore */ }
    }

    const response = await axios.get(url, {
      ...options,
      headers: fetchHeaders,
      maxRedirects: 10,
      maxContentLength: 50 * 1024 * 1024, // 50MB
      maxBodyLength: 50 * 1024 * 1024,
      validateStatus: (status) => status < 500, // Don't throw on 4xx
    });

    const finalUrl = response.request?.responseURL || url;
    const statusCode = response.status;
    const contentType = response.headers['content-type'] || '';
    const contentLength = response.headers['content-length'] 
      ? parseInt(response.headers['content-length'], 10) 
      : (typeof response.data === 'string' ? response.data.length : 0);
    
    // Check for 404 or error page
    let is404 = false;
    if (statusCode === 404) {
      is404 = true;
    } else if (typeof response.data === 'string' && response.data.length < 10000) {
      // Only check small pages for "textual 404s" to avoid false positives in large content
      const lowerData = response.data.toLowerCase();
      is404 = lowerData.includes("δεν ήταν δυνατή η εύρεση") ||
              lowerData.includes("σελίδα δεν βρέθηκε") ||
              (lowerData.includes("404") && (lowerData.includes("not found") || lowerData.includes("σφάλμα")));
    }

    return {
      data: response.data,
      finalUrl,
      statusCode,
      is404,
      contentType,
      contentLength,
    };
  } catch (error: any) {
    if (error.response) {
      return {
        data: error.response.data || "",
        finalUrl: url,
        statusCode: error.response.status,
        is404: error.response.status === 404,
        contentType: error.response.headers['content-type'] || '',
        contentLength: error.response.headers['content-length'] 
          ? parseInt(error.response.headers['content-length'], 10) 
          : 0,
      };
    }
    throw error;
  }
}

/**
 * Simple HTTP GET with retry for transient errors (429/503 and network timeouts).
 */
async function fetchWithRetry(
  url: string,
  options: any = {},
  retries: number = 3,
  baseDelayMs: number = 1500
): Promise<{ 
  data: any; 
  finalUrl: string; 
  statusCode: number; 
  is404: boolean;
  contentType?: string;
  contentLength?: number;
}> {
  let lastError: any;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fetchWithRedirects(url, options);
    } catch (err: any) {
      lastError = err;
      const status = err.response?.status;
      const isTransient =
        status === 429 ||
        status === 503 ||
        status === 502 ||
        status === 504 ||
        !status; // network/timeout

      if (!isTransient || attempt === retries - 1) {
        throw err;
      }

      const delay = baseDelayMs * (attempt + 1);
      console.warn(`⚠️  Transient HTTP error (${status || 'network'}) for ${url} — retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

const AUTO_PUBLISH_DOMAINS = new Set([
  "vouchers.gov.gr",
  "www.vouchers.gov.gr",
  "gov.gr",
  "www.gov.gr",
  "dypa.gov.gr",
  "www.dypa.gov.gr",
  "prosvasis.dypa.gov.gr", // Added: Prosvasis domain whitelist
  "opeka.gr",
  "www.opeka.gr",
  "stegasi.gov.gr",
  "www.stegasi.gov.gr",
  "e-efka.gov.gr",
  "www.e-efka.gov.gr",
  "efka.gov.gr",
  "www.efka.gov.gr",
  "keaprogram.gr",
  "www.keaprogram.gr",
  "vouchers.gov.gr",
]);

function shouldAutoPublish(officialUrl: string, extracted: any) {
  try {
    const u = new URL(officialUrl);
    const domainOk = AUTO_PUBLISH_DOMAINS.has(u.hostname);
    const titleOk = (extracted.title || "").length > 10;
    const summaryOk = (extracted.summary || "").length > 30;
    const confidenceOk = (extracted.confidence ?? 0) >= 0.75;
    if (domainOk && titleOk && summaryOk) return true;
    if (confidenceOk) return true;
    return false;
  } catch {
    return false;
  }
}

export class IngestionService {
  async fetchRSS(source: any, reporter?: IngestionReporter, sourceId?: string): Promise<any[]> {
    try {
      const headers = getHeadersForSourceType("rss");
      const { data, finalUrl, statusCode, is404, contentType, contentLength } = await fetchWithRetry(source.url, {
        headers: { ...headers, ...(source.config?.headers || {}) },
        responseType: "text",
        timeout: SOURCE_FETCH_TIMEOUT_MS,
      });

      // Store fetch metadata
      source.lastHttpStatus = statusCode;
      source.lastFinalUrl = finalUrl;
      source.lastContentType = contentType;
      source.lastBytes = contentLength;
      source.lastError = undefined;

      // Save raw response in debug mode
      if (reporter && sourceId) {
        await reporter.saveRawResponse(sourceId, source.name, contentType || 'application/rss+xml', data);
      }

      if (is404 || statusCode === 404) {
        console.error(`❌ Source ${source.name} returned 404: ${source.url}`);
        source.lastError = `HTTP 404: Source returned 404`;
        throw new Error(`HTTP 404: Source returned 404 - ${source.url}`);
      }

      try {
        const feed = await rssParser.parseString(data);
        
        return (feed.items || []).map((item: any) => {
          // Parse date with unified parser (never Invalid Date)
          let publishedAt: Date | null = null;
          let parseError = false;
          
          if (item.pubDate) {
            const parseResult = parseDate(item.pubDate);
            if (parseResult.date) {
              publishedAt = normalizeDate(parseResult.date);
            } else {
              parseError = true;
              console.warn(`⚠️  Invalid pubDate for RSS item: "${item.title?.substring(0, 50)}" - "${item.pubDate}"`);
              if (reporter && sourceId) {
                reporter.trackInvalidDate(sourceId, source.name, item.pubDate, 'rssParser');
              }
            }
          }
          
          // Fallback to current date if parsing failed
          if (!publishedAt) {
            publishedAt = new Date();
          }
          
          return {
            title: item.title || "",
            content:
              item.content || item.contentSnippet || item.description || "",
            url: item.link || "",
            publishedAt: publishedAt,
            metadata: {
              guid: item.guid,
              categories: item.categories || item.category,
              parseError: parseError,
            },
          };
        });
      } catch (parseErr: any) {
        // Fallback: lenient XML parsing for Diavgeia/broken feeds
        const parser = new XMLParser({
          ignoreAttributes: false,
          allowBooleanAttributes: true,
        });
        const parsed = parser.parse(data);
        const items =
          parsed?.rss?.channel?.item ||
          parsed?.channel?.item ||
          parsed?.feed?.entry ||
          [];
        return items.map((item: any) => {
          // Parse date with unified parser (never Invalid Date)
          let publishedAt: Date | null = null;
          
          if (item.pubDate) {
            const parseResult = parseDate(item.pubDate);
            if (parseResult.date) {
              publishedAt = normalizeDate(parseResult.date);
            } else {
              console.warn(`⚠️  Invalid pubDate for RSS item (fallback parser): "${item.title?.substring(0, 50)}" - "${item.pubDate}"`);
              if (reporter && sourceId) {
                reporter.trackInvalidDate(sourceId, source.name, item.pubDate, 'fallbackParser');
              }
            }
          } else if (item.updated) {
            const parseResult = parseDate(item.updated);
            if (parseResult.date) {
              publishedAt = normalizeDate(parseResult.date);
            } else {
              console.warn(`⚠️  Invalid updated date for RSS item (fallback parser): "${item.title?.substring(0, 50)}" - "${item.updated}"`);
              if (reporter && sourceId) {
                reporter.trackInvalidDate(sourceId, source.name, item.updated, 'fallbackParser');
              }
            }
          }
          
          // Fallback to current date if parsing failed
          if (!publishedAt) {
            publishedAt = new Date();
          }
          
          return {
            title: item.title || "",
            content:
              item.description || item.content || item["content:encoded"] || "",
            url: item.link?.["@_href"] || item.link || "",
            publishedAt: publishedAt,
            metadata: {
              ...item,
              parseError: parseErr?.message || String(parseErr) || false,
            },
          };
        });
      }
    } catch (error: any) {
      console.error(`Error fetching RSS from ${source.url}:`, error);
      source.lastError = error.message || String(error);
      throw error;
    }
  }

  async fetchAPI(source: any, reporter?: IngestionReporter, sourceId?: string): Promise<any[]> {
    try {
      const headers = getHeadersForSourceType("api");
      const { data, finalUrl, statusCode, contentType, contentLength } = await fetchWithRetry(source.url, {
        headers: { ...headers, ...(source.config?.headers || {}) },
        params: source.config?.params || {},
        responseType: "json",
        timeout: SOURCE_FETCH_TIMEOUT_MS,
      });

      // Store fetch metadata
      source.lastHttpStatus = statusCode;
      source.lastFinalUrl = finalUrl;
      source.lastContentType = contentType || '';
      source.lastBytes = contentLength 
        ? contentLength 
        : (typeof data === 'string' ? data.length : JSON.stringify(data).length);
      source.lastError = undefined;

      // Save raw response in debug mode
      if (reporter && sourceId) {
        const rawData = typeof data === 'string' ? data : JSON.stringify(data);
        await reporter.saveRawResponse(sourceId, source.name, source.lastContentType, rawData);
      }

      // Handle different API response formats
      let items: any[] = [];
      
      // Διαύγεια API format: response.data.response.docs
      if (data?.response?.docs) {
        items = data.response.docs;
      } else if (Array.isArray(data)) {
        items = data;
      } else if (data?.data) {
        items = Array.isArray(data.data) ? data.data : [data.data];
      } else if (data?.decisions) {
        items = Array.isArray(data.decisions) ? data.decisions : [data.decisions];
      }

      // Filter Διαύγεια items by keyword relevance in subject
      const isDiavgeia = source.url.includes("diavgeia.gov.gr");
      let filteredItems = items;
      
      if (isDiavgeia) {
        // Keywords that must appear in subject
        const requiredKeywords = [
          "επίδομα", "επιδότηση", "voucher", "pass", "youth pass",
          "tourism4all", "north evia pass", "thessaly-evros pass",
          "thessaly evros pass", "north evia", "thessaly evros"
        ];
        
        // Irrelevant subjects (reject unless they also contain keyword)
        const irrelevantPatterns = [
          /υπερωριακή\s+απασχόληση/i,
          /χεπ/i,
          /προμήθειες\s+σχολείου/i,
          /προμηθειες\s+σχολειου/i,
          /προμήθειες/i,
          /διαγωνισμός\s+προμηθειών/i,
        ];
        
        filteredItems = items.filter((item: any) => {
          const subject = (item.subject || "").toLowerCase();
          
          // Check if subject contains at least one required keyword
          const hasKeyword = requiredKeywords.some(keyword => 
            subject.includes(keyword.toLowerCase())
          );
          
          if (!hasKeyword) {
            return false; // Reject: no keyword match
          }
          
          // Check if subject matches irrelevant pattern
          const matchesIrrelevant = irrelevantPatterns.some(pattern => 
            pattern.test(subject)
          );
          
          // Reject if matches irrelevant pattern (even if has keyword, it's likely noise)
          if (matchesIrrelevant) {
            return false;
          }
          
          return true; // Accept: has keyword and not irrelevant
        });
      }
      
      return filteredItems.map((item: any) => {
        // For Διαύγεια: build content from metadata if no body exists
        let content = item.content ||
          item.description ||
          item.summary ||
          item.excerpt ||
          item.text ||
          "";
        
        // Διαύγεια: build summary from metadata fields (always, not just if content is short)
        if (isDiavgeia) {
          const parts: string[] = [];
          if (item.subject) parts.push(item.subject);
          if (item.decisionTypeLabel) parts.push(`Τύπος: ${item.decisionTypeLabel}`);
          if (item.organizationLabel) parts.push(`Φορέας: ${item.organizationLabel}`);
          if (item.issueDate) parts.push(`Ημερομηνία: ${item.issueDate}`);
          if (item.ada) parts.push(`ΑΔΑ: ${item.ada}`);
          
          // Use metadata summary as content (don't require body)
          content = parts.join(". ");
        }
        
        // Build URL for Διαύγεια
        let url = item.url || item.link || item.documentUrl || "";
        if (isDiavgeia && item.ada && !url) {
          url = `https://diavgeia.gov.gr/doc/${item.ada}`;
        }
        
        // Parse date for Διαύγεια
        // Parse date with unified parser (never Invalid Date)
        let publishedAt: Date | null = null;
        
        const dateFields = [
          item.publishedAt,
          item.published_at,
          item.submissionTimestamp,
          item.issueDate,
          item.date,
        ];
        
        for (const dateField of dateFields) {
          if (dateField) {
            const parseResult = parseDate(dateField);
            if (parseResult.date) {
              publishedAt = normalizeDate(parseResult.date);
              break;
            }
          }
        }
        
        // Fallback to current date if parsing failed
        if (!publishedAt) {
          publishedAt = new Date();
        }
        
        // Coerce title to string: some APIs return objects (e.g., { el: "...", en: "..." })
        const rawTitle = item.title || item.name || item.subject || "";
        const safeTitle = typeof rawTitle === "string" ? rawTitle : (rawTitle?.el || rawTitle?.en || rawTitle?.name || (typeof rawTitle === "object" ? JSON.stringify(rawTitle) : String(rawTitle)));
        
        return {
          title: safeTitle,
          content: content,
          url: url || item.id || "",
          publishedAt: publishedAt,
          metadata: {
            ...item,
            isDiavgeia: isDiavgeia,
            ada: item.ada,
            organizationLabel: item.organizationLabel,
            decisionTypeLabel: item.decisionTypeLabel,
          },
        };
      });
    } catch (error: any) {
      console.error(`Error fetching API from ${source.url}:`, error);
      if (error.response) {
        source.lastHttpStatus = error.response.status;
        source.lastFinalUrl = source.url;
        source.lastContentType = error.response.headers['content-type'] || '';
        source.lastBytes = 0;
        source.lastError = error.message || String(error);
      } else {
        source.lastError = error.message || String(error);
      }
      if (error.response?.status === 404) {
        throw new Error(`HTTP 404: API endpoint returned 404 - ${source.url}`);
      }
      throw error;
    }
  }

  async fetchHTMLCatalog(source: any, reporter?: IngestionReporter, sourceId?: string): Promise<any[]> {
    try {
      const headers = getHeadersForSourceType("html_catalog");
      const { data, finalUrl, statusCode, is404, contentType, contentLength } = await fetchWithRetry(source.url, {
        headers: { ...headers, ...(source.config?.headers || {}) },
        responseType: "text",
        timeout: SOURCE_FETCH_TIMEOUT_MS,
      });

      // Store fetch metadata
      source.lastHttpStatus = statusCode;
      source.lastFinalUrl = finalUrl;
      source.lastContentType = contentType || '';
      source.lastBytes = contentLength || 0;
      source.lastError = undefined;

      // Save raw response in debug mode
      if (reporter && sourceId) {
        await reporter.saveRawResponse(sourceId, source.name, source.lastContentType, data);
      }

      // Basic 404 detection for catalog pages as well
      if (is404 || statusCode === 404) {
        throw new Error(`HTTP 404: HTML catalog returned 404 - ${source.url}`);
      }

      const $ = cheerio.load(data);
      const items: any[] = [];
      $("a").each((_, el) => {
        const href = $(el).attr("href");
        const text = $(el).text().trim();
        if (!href || !text) return;

        // Build absolute URL
        const url = href.startsWith("http")
          ? href
          : new URL(href, source.url).toString();

        let u: URL;
        try {
          u = new URL(url);
        } catch {
          return;
        }

        // Allow only vouchers.gov.gr and single-level slug (/youthpass etc.)
        if (
          u.hostname !== "vouchers.gov.gr" &&
          u.hostname !== "www.vouchers.gov.gr"
        )
          return;
        const segments = u.pathname.split("/").filter(Boolean);
        if (segments.length !== 1) return;
        if (u.pathname === "/") return;

        const canonical = `${u.hostname}${u.pathname}`;
        items.push({
          title: text,
          content: text,
          url: u.toString(),
          publishedAt: new Date(),
          metadata: { canonical },
        });
      });

      // Dedup by canonical
      const seen = new Set<string>();
      const deduped: any[] = [];
      for (const item of items) {
        const canonical = item.metadata?.canonical || item.url;
        if (seen.has(canonical)) continue;
        seen.add(canonical);
        deduped.push(item);
      }

      return deduped;
    } catch (error: any) {
      console.error(`Error fetching HTML catalog from ${source.url}:`, error);
      if (error.response) {
        source.lastHttpStatus = error.response.status;
        source.lastFinalUrl = source.url;
        source.lastContentType = error.response.headers['content-type'] || '';
        source.lastBytes = 0;
        source.lastError = error.message || String(error);
      } else {
        source.lastError = error.message || String(error);
      }
      if (error.response?.status === 404) {
        throw new Error(`HTTP 404: HTML catalog returned 404 - ${source.url}`);
      }
      throw error;
    }
  }

  async fetchHTMLListing(source: any, reporter?: IngestionReporter, sourceId?: string): Promise<any[]> {
    try {
      const headers = getHeadersForSourceType("html_listing");
      const { data, finalUrl, statusCode, is404, contentType, contentLength } = await fetchWithRetry(source.url, {
        headers: { ...headers, ...(source.config?.headers || {}) },
        responseType: "text",
        timeout: SOURCE_FETCH_TIMEOUT_MS,
      });

      // Store fetch metadata
      source.lastHttpStatus = statusCode;
      source.lastFinalUrl = finalUrl;
      source.lastContentType = contentType;
      source.lastBytes = contentLength;
      source.lastError = undefined;

      // Save raw response in debug mode
      if (reporter && sourceId) {
        await reporter.saveRawResponse(sourceId, source.name, contentType || 'text/html', data);
      }

      if (is404 || statusCode === 404) {
        console.error(`❌ Source ${source.name} returned 404: ${source.url}`);
        // If URL doesn't have /el/ and it's prosvasis, try with /el/
        if (source.url.includes("prosvasis.dypa.gov.gr") && !source.url.includes("/el/")) {
          const elUrl = source.url.replace("prosvasis.dypa.gov.gr/", "prosvasis.dypa.gov.gr/el/");
          console.log(`⚠️  Trying with /el/ prefix: ${elUrl}`);
          // Update source URL in DB
          const Source = (await import("../../models/source.model")).Source;
          await Source.updateOne({ _id: source._id }, { $set: { url: elUrl } });
          // Retry with /el/
          return this.fetchHTMLListing({ ...source, url: elUrl });
        }
        throw new Error(`HTTP 404: Source returned 404 - ${source.url}`);
      }

      const $ = cheerio.load(data);
      
      // Check HTML title for 404
      const pageTitle = $("title").text().toLowerCase();
      if (pageTitle.includes("δεν ήταν δυνατή") || pageTitle.includes("404") || pageTitle.includes("not found")) {
        console.error(`❌ Source ${source.name} has 404 page title: ${source.url}`);
        // Try with /el/ if prosvasis
        if (source.url.includes("prosvasis.dypa.gov.gr") && !source.url.includes("/el/")) {
          const elUrl = source.url.replace("prosvasis.dypa.gov.gr/", "prosvasis.dypa.gov.gr/el/");
          console.log(`⚠️  Trying with /el/ prefix: ${elUrl}`);
          const Source = (await import("../../models/source.model")).Source;
          await Source.updateOne({ _id: source._id }, { $set: { url: elUrl } });
          return this.fetchHTMLListing({ ...source, url: elUrl });
        }
        throw new Error(`HTTP 404: Source has 404 page title - ${source.url}`);
      }
      const items: any[] = [];
      
      // Blocklist keywords for menu/FAQ/guides (ignore these)
      const blocklistKeywords = [
        "faq", "συχνές ερωτήσεις", "συχνες ερωτησεις",
        "menu", "μενού", "menou",
        "cookies", "πολιτική", "πολιτικη",
        "privacy", "προστασία", "προστασια",
        "επικοινωνία", "επικοινωνια", "contact",
        "σημεία εξυπηρέτησης", "σημεια εξυπηρετησης",
        "οδηγίες", "οδηγιες", "guides",
        "footer", "header", "navigation",
        "sitemap", "site map",
      ];
      
      const baseHost = new URL(finalUrl || source.url).hostname;
      const isEskaEsPa = baseHost.includes("espa.gr");
      const isOpekepe = baseHost.includes("opekepe.gr");
      const isMindev = baseHost.includes("mindev.gov.gr");
      const isEpendyseis = baseHost.includes("ependyseis.mindev.gov.gr");
      const isDiavgeiaHtml = baseHost.includes("diavgeia.gov.gr");
      const isAsep = baseHost.includes("asep.gr");

      // Special handling for ASEP info portal
      if (isAsep) {
        $("article, .views-row, .node-announcement, .node-press-release").each((_, el) => {
          const $el = $(el);
          const linkEl = $el.find("a").first();
          const titleEl = $el.find("h2, h3, .title, .field-name-title").first();

          const href = linkEl.attr("href");
          if (!href) return;

          const title = titleEl.text().trim() || linkEl.text().trim();
          if (!title || title.length < 5) return;

          const dateEl = $el.find(".date, .created, .field-name-post-date, time").first();
          const publishedAt = dateEl.length ? parseDate(dateEl.text()).date || new Date() : new Date();

          items.push({
            title,
            url: href.startsWith("http") ? href : `https://info.asep.gr${href.startsWith("/") ? "" : "/"}${href}`,
            content: $el.text().trim().substring(0, 1000),
            publishedAt,
          });
        });
      }

      // Special handling for Diavgeia HTML listings
      if (isDiavgeiaHtml) {
        $(".decision-row, .result-item, tr.decision").each((_, el) => {
          const $el = $(el);
          const linkEl = $el.find("a[href*='decision'], a[href*='ada']").first();
          if (!linkEl.length) return;

          const title = $el.find(".subject, .title, td:nth-child(2)").text().trim();
          if (!title) return;

          items.push({
            title,
            url: linkEl.attr("href"),
            content: $el.text().trim(),
            publishedAt: new Date(),
          });
        });
      }

      // Special handling for dypa.gov.gr/proghrammata-anoikhta and proghrammata-apaskholisis-11
      if (source.url.includes("dypa.gov.gr/proghrammata-anoikhta") || 
          source.url.includes("dypa.gov.gr/proghrammata-apaskholisis-11")) {
        // Find "Ανοιχτό πρόγραμμα" blocks or program links
        // Try multiple selectors for program cards/items
        $(".program-card, .program-item, [class*='program'], [class*='anoikto'], article, .card, [class*='card'], a[href*='programma'], a[href*='proghramma']").each((_, block) => {
          const $block = $(block);
          const linkEl = $block.is("a") ? $block : $block.find("a").first();
          
          if (!linkEl.length) return;
          
          const href = linkEl.attr("href");
          if (!href) return;
          
          // Try to get title from multiple sources (priority order):
          // 1. Image alt/aria-label (if link contains image)
          // 2. Anchor text
          // 3. Heading inside link
          // 4. Heading near link (in block)
          let title = "";
          
          // First, try img alt/aria-label (highest priority for DYPA pages)
          const imgEl = linkEl.find("img").first();
          if (imgEl.length) {
            title = imgEl.attr("alt") || imgEl.attr("aria-label") || imgEl.attr("title") || "";
          }
          
          // If no img title, try anchor text
          if (!title || title.length < 5) {
            title = linkEl.text().trim();
          }
          
          // If still no title, try heading inside link
          if (!title || title.length < 5) {
            const headingEl = linkEl.find("h1, h2, h3, h4, h5, h6, .title, [class*='title']").first();
            if (headingEl.length) {
              title = headingEl.text().trim();
            }
          }
          
          // If still no title, try heading near link (in parent block)
          if (!title || title.length < 5) {
            const headingEl = $block.find("h1, h2, h3, h4, h5, h6, .title, [class*='title']").first();
            if (headingEl.length) {
              title = headingEl.text().trim();
            }
          }
          
          // Skip if still no valid title
          if (!title || title.length < 5) return;
          
          const url = href.startsWith("http")
            ? href
            : new URL(href, finalUrl || source.url).toString();
          
          try {
            const u = new URL(url);
            if (u.hostname !== baseHost && u.hostname !== `www.${baseHost}`) return;
            
            const canonical = `${u.hostname}${u.pathname}`;
            // Get content from block, or from link's parent/siblings
            let content = $block.text().trim();
            if (!content || content.length < 50) {
              // Try to get content from link's parent or nearby elements
              const parentContent = linkEl.parent().text().trim();
              const siblingContent = linkEl.siblings().text().trim();
              content = parentContent || siblingContent || title;
            }
            
            items.push({
              title: title.trim(),
              content: content.substring(0, 2000), // Limit content
              url: u.toString(),
              publishedAt: new Date(),
              metadata: { canonical, isOpenProgram: true, titleSource: imgEl.length ? "img-alt" : "anchor-text" },
            });
          } catch {
            return;
          }
        });
        
        // Fallback: find links with "Ανοιχτό" or "πρόγραμμα" in nearby text
        if (items.length === 0) {
          $("a").each((_, el) => {
            const $el = $(el);
            const text = $el.text().trim();
            const href = $el.attr("href");
            if (!text || !href) return;
            
            // Check if link or nearby text contains "ανοιχτό" or "πρόγραμμα"
            const parentText = $el.parent().text().toLowerCase();
            const hasOpenProgram = text.toLowerCase().includes("ανοιχτό") ||
                                  text.toLowerCase().includes("πρόγραμμα") ||
                                  parentText.includes("ανοιχτό");
            
            if (!hasOpenProgram) return;
            
            const url = href.startsWith("http")
              ? href
              : new URL(href, finalUrl || source.url).toString();
            
            try {
              const u = new URL(url);
              if (u.hostname !== baseHost && u.hostname !== `www.${baseHost}`) return;
              if (u.pathname === "/" || u.pathname.split("/").filter(Boolean).length < 1) return;
              
              const canonical = `${u.hostname}${u.pathname}`;
              items.push({
                title: text,
                content: text,
                url: u.toString(),
                publishedAt: new Date(),
                metadata: { canonical, isOpenProgram: true },
              });
            } catch {
              return;
            }
          });
        }
      }
      
      // Helper to clean text from Cheerio element
      function cleanCheerioText($el: any): string {
        const clone = $el.clone();
        clone.find("script, style, noscript, iframe, svg, meta, link").remove();
        return clone.text().replace(/\s+/g, " ").trim();
      }

      // Regular listing: find links ONLY in main content (ignore header/footer/nav)
      // Try to find main content container first
      const mainContent = $("main, article, [role='main'], .content, .main-content, #content, .main, [class*='content']").first();
      const searchContainer = mainContent.length > 0 ? mainContent : $("body");

      const isBigPortal =
        isEskaEsPa ||
        isOpekepe ||
        isMindev ||
        isEpendyseis ||
        isDiavgeiaHtml;

      searchContainer.find("a").each((_, el) => {
        const $el = $(el);
        const href = $el.attr("href");
        const text = cleanCheerioText($el); // Use cleaner
        if (!href || !text) return;

        // Skip if link is in header/footer/nav
        const parent = $el.parents(
          "header, footer, nav, [role='navigation'], .header, .footer, .navigation, [class*='header'], [class*='footer'], [class*='nav']"
        );
        if (parent.length > 0) return;

        const lowerText = text.toLowerCase();
        const lowerHref = href.toLowerCase();

        // Skip blocklisted items (menu/FAQ/guides)
        if (blocklistKeywords.some((kw) => lowerText.includes(kw) || lowerHref.includes(kw))) {
          return;
        }

        // Domain-specific keyword filters for large portals
        if (isBigPortal) {
          let requiredKeywords: string[] = [];
          if (isEskaEsPa) {
            requiredKeywords = [
              "πρόγραμμα",
              "προγράμματα",
              "προκηρύξη",
              "προκήρυξη",
              "προκηρυξη",
              "proclamation",
              "espa",
            ];
          } else if (isOpekepe) {
            requiredKeywords = [
              "ενίσχυση",
              "ενισχυση",
              "επιδότηση",
              "επιδότησης",
              "επιδοτηση",
              "επιδότησης",
              "καπ",
              "αγρότες",
              "αγροτες",
              "πρόσκληση",
              "προσκληση",
            ];
          } else if (isMindev || isEpendyseis) {
            requiredKeywords = [
              "αναπτυξιακός",
              "αναπτυξιακος",
              "επενδυση",
              "επένδυση",
              "επενδυτικ",
              "πρόγραμμα",
              "προγραμμα",
              "προκήρυξη",
              "προκηρυξη",
            ];
          } else if (isDiavgeiaHtml) {
            requiredKeywords = [
              "επίδομα",
              "επιδότηση",
              "epidoma",
              "epidotisi",
              "voucher",
              "pass",
              "youth pass",
              "tourism4all",
            ];
          }

          if (requiredKeywords.length > 0) {
            const hasKeyword = requiredKeywords.some(
              (kw) => lowerText.includes(kw) || lowerHref.includes(kw)
            );
            if (!hasKeyword) {
              return;
            }
          }
        }

        const url = href.startsWith("http")
          ? href
          : new URL(href, finalUrl || source.url).toString();
        try {
          const u = new URL(url);
          // allow only same-domain links (service pages)
          if (u.hostname !== baseHost && u.hostname !== `www.${baseHost}`) return;
          // avoid navigation/root
          if (
            u.pathname === "/" ||
            u.pathname.split("/").filter(Boolean).length < 1
          ) {
            return;
          }

          // Skip if URL contains blocklist keywords
          if (blocklistKeywords.some((kw) => u.pathname.toLowerCase().includes(kw))) {
            return;
          }

          const canonical = `${u.hostname}${u.pathname}`;

          // For content, try to find a parent paragraph or description
          // But cleaning it properly
          let content = text;
          const parentBlock = $el.closest("p, li, div.card, article");
          if (parentBlock.length > 0) {
            const cleanParent = cleanCheerioText(parentBlock);
            if (cleanParent.length > text.length && cleanParent.length < 500) {
              content = cleanParent;
            }
          }

          items.push({
            title: text,
            content: content,
            url: u.toString(),
            publishedAt: new Date(),
            metadata: { canonical },
          });
        } catch {
          return;
        }
      });

      const seen = new Set<string>();
      const deduped: any[] = [];
      for (const item of items) {
        const canonical = item.metadata?.canonical || item.url;
        if (seen.has(canonical)) continue;
        seen.add(canonical);
        deduped.push(item);
      }
      return deduped;
    } catch (error: any) {
      console.error(`Error fetching HTML listing from ${source.url}:`, error);
      if (error.response) {
        source.lastHttpStatus = error.response.status;
        source.lastFinalUrl = source.url;
        source.lastContentType = error.response.headers['content-type'] || '';
        source.lastBytes = 0;
        source.lastError = error.message || String(error);
      } else {
        source.lastError = error.message || String(error);
      }
      throw error;
    }
  }

  async fetchSinglePage(source: any, reporter?: IngestionReporter, sourceId?: string): Promise<any[]> {
    try {
      const headers = getHeadersForSourceType("single_page");
      const { data, finalUrl, statusCode, contentType, contentLength, is404 } = await fetchWithRetry(source.url, {
        headers: { ...headers, ...(source.config?.headers || {}) },
        responseType: "text",
        timeout: SOURCE_FETCH_TIMEOUT_MS,
      });

      // Store fetch metadata
      source.lastHttpStatus = statusCode;
      source.lastFinalUrl = finalUrl;
      source.lastContentType = contentType || '';
      source.lastBytes = contentLength || 0;
      source.lastError = undefined;

      // Save raw response in debug mode
      if (reporter && sourceId) {
        await reporter.saveRawResponse(sourceId, source.name, source.lastContentType, data);
      }

      if (is404 || statusCode === 404) {
        throw new Error(`HTTP 404: Single page returned 404 - ${source.url}`);
      }

      const $ = cheerio.load(data);
      const text = $("body").text().trim();
      const canonical =
        new URL(source.url).hostname + new URL(source.url).pathname;
      return [
        {
          title: $("title").text().trim() || source.name || source.url,
          content: text.substring(0, 2000),
          url: source.url,
          publishedAt: new Date(),
          metadata: { canonical },
        },
      ];
    } catch (error: any) {
      console.error(`Error fetching single page from ${source.url}:`, error);
      if (error.response) {
        source.lastHttpStatus = error.response.status;
        source.lastFinalUrl = source.url;
        source.lastContentType = error.response.headers['content-type'] || '';
        source.lastBytes = 0;
        source.lastError = error.message || String(error);
      } else {
        source.lastError = error.message || String(error);
      }
      if (error.response?.status === 404) {
        throw new Error(`HTTP 404: Single page returned 404 - ${source.url}`);
      }
      throw error;
    }
  }

  async fetchPageBody(url: string, headers: any = {}): Promise<string> {
    try {
      // 1. Skip Binary Files based on Extension (Fastest Check)
      const binaryExtensions = [
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', 
        '.zip', '.rar', '.7z', '.tar', '.gz', 
        '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.mp4', '.mp3'
      ];
      
      const lowerUrl = url.toLowerCase();
      // Check if URL ends with extension or contains extension before query params
      const hasBinaryExt = binaryExtensions.some(ext => {
         return lowerUrl.endsWith(ext) || lowerUrl.includes(ext + '?') || lowerUrl.includes(ext + '#');
      });

      if (hasBinaryExt) {
        console.log(`   ⏭️  Skipping deep fetch for binary file type: ${url}`);
        return "";
      }

      // Small delay to be polite
      await sleep(500);

      const fetchOpts = {
        headers: { ...DEFAULT_HEADERS, ...headers },
        timeout: SOURCE_FETCH_TIMEOUT_MS,
        maxContentLength: 15 * 1024 * 1024,
        maxBodyLength: 15 * 1024 * 1024,
        validateStatus: (s: number) => s >= 200 && s < 600,
      };

      let fetchUrl = url;
      let response = await axios.get(fetchUrl, fetchOpts);

      if (response.status === 403) {
        const alt = alternateGovGrUrlIfEnglish(fetchUrl);
        if (alt) {
          const second = await axios.get(alt, fetchOpts);
          if (second.status < 400) {
            response = second;
            fetchUrl = alt;
          }
        }
      }

      if (response.status >= 400) {
        throw new Error(`Request failed with status code ${response.status}`);
      }

      // 2. Skip based on Content-Type header (Reliable Check)
      const contentType = response.headers['content-type'] || '';
      if (
        contentType.includes('application/pdf') ||
        contentType.includes('application/msword') ||
        contentType.includes('application/vnd') ||
        contentType.includes('application/zip') ||
        contentType.includes('image/') ||
        contentType.includes('audio/') ||
        contentType.includes('video/')
      ) {
         console.log(`   ⏭️  Skipping deep fetch for non-HTML content-type: ${contentType}`);
         return "";
      }

      const $ = cheerio.load(response.data);

      // Remove unwanted elements - Extended list for Liferay/DYPA noise
      $(
        "script, style, nav, header, footer, iframe, noscript, " +
        ".cookie-banner, .popup, .sidebar, .menu, .navigation, .ads, .social-share, " +
        ".breadcrumb, .breadcrumbs, .map-container, .filters, .facets, " +
        ".portlet-topper, .portlet-title, .lfr-meta-actions, " +
        ".taglib-header, .search-form, .related-assets"
      ).remove();

      // Specific cleanup for DYPA regions/filters sidebar if it leaks into body
      // Identifies the container with the regions list
      $(".layout-column-2, .span4, .col-md-4, .col-lg-4").remove(); // Remove sidebars in grid layouts

      // PRE-PROCESSING: Inject spaces to prevent word concatenation
      // Replace <br> with space
      $('br').replaceWith(' ');
      // Append space after block elements so "</div><div>" becomes " " instead of ""
      $('p, div, li, tr, h1, h2, h3, h4, h5, h6').after(' ');
      
      // Try to find main content container - Prioritize Liferay article
      let content = "";
      const selectors = [
        ".journal-content-article", // Liferay specific (DYPA)
        "article",
        "[role='main']",
        ".main-content",
        ".post-content",
        ".entry-content",
        "#main",
        "#content",
        ".content",
      ];

      for (const selector of selectors) {
        const el = $(selector);
        if (el.length > 0) {
          // If we found multiple, join them (sometimes content is split)
          if (el.length > 1) {
             content = el.map((i, e) => $(e).text()).get().join(" ");
          } else {
             content = el.text();
          }
          break;
        }
      }

      // Fallback to body if no main container found
      if (!content) {
        content = $("body").text();
      }

      // Clean up whitespace and typical garbage text
      let cleanContent = content.replace(/\s+/g, " ").trim();
      
      // Remove specific garbage patterns seen in DYPA
      // Removing the "Regions" block if it was captured
      const regionsGarbage = /Θράκη\s*Κεντρική Μακεδονία\s*Δυτική Μακεδονία/i;
      if (regionsGarbage.test(cleanContent)) {
         // This is likely a page where we captured the sidebar. 
         // Try to strip it out or fail gracefully?
         // For now, let's try to remove that specific block if it's distinct
         cleanContent = cleanContent.replace(/Θράκη\s*Κεντρική Μακεδονία.*?Ολόκληρη η Χώρα/gi, "");
      }

      return cleanContent;
    } catch (error: any) {
      console.warn(`⚠️ Deep fetch failed for ${url}: ${error.message}`);
      return "";
    }
  }

  async processSource(sourceId: string, reporter?: IngestionReporter): Promise<{ processedCount: number; skipReasons: Record<string, number> }> {
    const source = await Source.findById(sourceId);
    if (!source || !source.enabled) {
      return { processedCount: 0, skipReasons: {} };
    }

    // Source health check and URL fix
    let sourceUrl = source.url;
    const healthCheck = await checkSourceHealth(sourceUrl, source.type);
    
    if (healthCheck.replacementUrl) {
      console.log(`🔧 Source ${source.name}: URL fixed: ${sourceUrl} → ${healthCheck.replacementUrl}`);
      sourceUrl = healthCheck.replacementUrl;
      // Update source URL in DB
      source.url = healthCheck.replacementUrl;
      await source.save();
    }
    
    // Fix endpoint URL if needed
    sourceUrl = fixEndpointUrl(sourceUrl, source.type);
    if (sourceUrl !== source.url) {
      console.log(`🔧 Source ${source.name}: Endpoint fixed: ${source.url} → ${sourceUrl}`);
      source.url = sourceUrl;
      await source.save();
    }

    let items: any[] = [];
    let fetchError: Error | null = null;

    try {
      // Use fixed URL
      const sourceWithFixedUrl = { ...source.toObject(), url: sourceUrl };
      
      if (source.type === "rss") {
        items = await this.fetchRSS(sourceWithFixedUrl, reporter, sourceId);
      } else if (source.type === "api") {
        items = await this.fetchAPI(sourceWithFixedUrl, reporter, sourceId);
      } else if (source.type === "html_catalog") {
        items = await this.fetchHTMLCatalog(sourceWithFixedUrl, reporter, sourceId);
      } else if (source.type === "html_listing") {
        items = await this.fetchHTMLListing(sourceWithFixedUrl, reporter, sourceId);
      } else if (source.type === "single_page") {
        items = await this.fetchSinglePage(sourceWithFixedUrl, reporter, sourceId);
      } else {
        return { processedCount: 0, skipReasons: {} };
      }
    } catch (error: any) {
      fetchError = error;
      console.error(`❌ Error fetching source ${source.name} (${source.url}):`, error.message);

      // Diavgeia fallback only runs here when the *whole source fetch* throws (e.g. HTTP error
      // on the listing). It does not run for per-item "deep fetch" 403s (ASEP nodes) — those
      // are handled separately; the standalone "Διαύγεια API / RSS" sources are the main feed.
      const isCritical = source.name.toUpperCase().includes("ESPA") || 
                         source.name.toUpperCase().includes("ΕΣΠΑ") ||
                         source.name.toUpperCase().includes("ALIEIA") ||
                         source.name.toLowerCase().includes("ανταγωνιστικότητα");

      if (isCritical && !items.length) {
        console.log(`   🔦 [Fallback] Attempting Diavgeia search for critical source: ${source.name}...`);
        try {
          // Use searchDiavgeia to find recent decisions (we need more than 1, so let's try 3)
          // Note: we might need to modify searchDiavgeia to return multiple items
          const searchTerm = source.name.toLowerCase().includes("espa") || source.name.toLowerCase().includes("εσπα") 
            ? "subject:\"ΠΡΟΚΗΡΥΞΗ ΕΣΠΑ\"" 
            : `subject:\"ΠΡΟΚΗΡΥΞΗ ${source.name.substring(0, 20)}\"`;
          
          const fallbackData = await searchDiavgeia(searchTerm);
          if (fallbackData) {
            console.log(`   ✅ [Fallback] Found match in Diavgeia for ${source.name}: ${fallbackData.url}`);
            items.push({
              title: `[DIAVGEIA FALLBACK] ${source.name} - Πρόσφατη Απόφαση`,
              url: fallbackData.url,
              content: fallbackData.text,
              pubDate: new Date().toISOString(),
              sourceName: `${source.name} (via Diavgeia)`,
            });
          }
        } catch (fallbackErr) {
          console.error(`   ❌ [Fallback] Diavgeia search failed:`, fallbackErr instanceof Error ? fallbackErr.message : fallbackErr);
        }
      }

      // Track consecutive failures
      source.consecutiveFailures = (source.consecutiveFailures || 0) + 1;
      source.lastError = error.message || String(error);
      
      // Auto-disable after 3 consecutive failures
      if (source.consecutiveFailures >= 3) {
        console.warn(`⚠️  Auto-disabling source after ${source.consecutiveFailures} consecutive failures: ${source.name}`);
        source.enabled = false;
        await source.save();
        if (reporter) {
          reporter.trackError(sourceId, `Auto-disabled after ${source.consecutiveFailures} failures: ${error.message}`);
        }
        throw new Error(`Auto-disabled: ${source.consecutiveFailures} consecutive failures`);
      }
      
      // If source returns 400/404/500, increment failures and throw
      if (error.response?.status === 400 || error.response?.status === 404 || error.response?.status >= 500) {
        await source.save();
        // Throw error so it's caught as failed in processAllEnabledSources
        throw new Error(`HTTP ${error.response?.status}: ${error.message || 'Request failed'}`);
      }
      
      // For network/timeout errors, save and throw
      if (!error.response) {
        await source.save();
        throw new Error(`Network error: ${error.message || 'Failed to fetch'}`);
      }
      
      // For other errors (e.g., parsing), save and throw
      await source.save();
      throw new Error(`Processing error: ${error.message || 'Unknown error'}`);
    }

    let processedCount = 0;
    let itemsKept = 0; // Items that passed filters and were processed
    
    // Track skip reasons
    const skipReasons: Record<string, number> = {
      duplicate: 0,
      duplicateTitle: 0, // New: duplicate title check
      contentTooShort: 0,
      genericTitle: 0,
      blockedByHeuristics: 0,
      rejected: 0,
      draft: 0,
      archived: 0,
      error: 0,
    };

    // Store fetch metadata and items extracted count
    source.lastItemsExtracted = items.length;
    await source.save(); // Save fetch metadata immediately

    // Track extracted count
    if (reporter) {
      reporter.trackExtracted(sourceId, items.length);
    }

    const canonicalizeUrl = (url: string): string => {
      try {
        const u = new URL(url);
        // strip query/hash and trailing slash
        let pathname = u.pathname || "/";
        if (pathname.endsWith("/") && pathname !== "/") {
          pathname = pathname.slice(0, -1);
        }
        return `${u.hostname}${pathname}`;
      } catch {
        return url;
      }
    };

    const isGenericTitle = (title: string): boolean => {
      const t = title.trim().toLowerCase();
      if (!t || t.length < 3) return true;
      const genericTitles = [
        "home",
        "welcome",
      ];
      return genericTitles.some((g) => t === g);
    };

    const isBlockedBySourceHeuristics = (source: any, item: any): { blocked: boolean; reason?: string } => {
      try {
        const u = new URL(item.url);
        const hostname = u.hostname.toLowerCase();
        const pathname = u.pathname.toLowerCase();

        const title = (item.title || "").toLowerCase();
        const urlStr = item.url.toLowerCase();
        const content = ((item.content || "").toLowerCase()).substring(0, 500); // Check first 500 chars

        // Vouchers Catalog rules
        if (hostname.endsWith("vouchers.gov.gr")) {
          if (pathname === "/" || pathname === "") {
            return { blocked: true, reason: "vouchers: root path" };
          }
          const segments = pathname.split("/").filter(Boolean);
          if (segments.length !== 1) {
            return { blocked: true, reason: `vouchers: path has ${segments.length} segments (expected 1)` };
          }
          const denyKeywords = [
            "privacy",
            "cookies",
            "terms",
            "contact",
            "sitemap",
            "politiki",
            "όροι",
            "επικοινωνια",
          ];
          const matchedKeyword = denyKeywords.find(
            (kw) => pathname.includes(kw) || title.includes(kw)
          );
          if (matchedKeyword) {
            return { blocked: true, reason: `vouchers: denied keyword "${matchedKeyword}"` };
          }
        }

        // gov.gr catalogs - allow only service detail pages, deny navigation/info pages
        if (hostname.endsWith("gov.gr")) {
          // Allow keywords that indicate legitimate opportunities
          const allowKeywords = [
            "επίδομα",
            "επιδομα",
            "voucher",
            "pass",
            "πρόγραμμα",
            "προγραμμα",
            "πρόσκληση",
            "προσκληση",
            "αιτήσεις",
            "αιτησεις",
            "έναρξη",
            "εναρξη",
            "παράταση",
            "παραταση",
            "πληρωμή",
            "πληρωμη",
            "βόνους",
            "μπόνους",
            "bonus",
            "επιταγή",
            "επιταγη",
            "αποτελέσματα",
            "αποτελεσματα",
          ];
          const hasAllowKeyword = allowKeywords.some(
            (kw) => title.includes(kw) || urlStr.includes(kw) || content.includes(kw)
          );
          
          if (hasAllowKeyword) {
            return { blocked: false }; // Allow legitimate opportunities
          }
          
          const denyKeywords = [
            "πολιτική",
            "πολιτικη",
            "δήλωση",
            "δηλωση",
            "συχνές",
            "συχνες",
            "στατιστικά",
            "στατιστικα",
            "κατάλογος",
            "καταλογος",
            "δελτία",
            "δελτια",
            "faq",
          ];
          const matchedKeyword = denyKeywords.find(
            (kw) =>
              title.includes(kw) ||
              urlStr.includes(encodeURI(kw)) ||
              urlStr.includes(kw)
          );
          if (matchedKeyword) {
            return { blocked: true, reason: `gov.gr: denied keyword "${matchedKeyword}"` };
          }
        }

        // e-efka / opeka / dypa / stegasi - avoid listing/menu pages
        const programHosts = [
          "e-efka.gov.gr",
          "efka.gov.gr",
          "dypa.gov.gr",
          "opeka.gr",
          "stegasi.gov.gr",
        ];
        if (
          programHosts.some((h) => hostname === h || hostname === `www.${h}`)
        ) {
          const segments = pathname.split("/").filter(Boolean);
          
          // Special handling for dypa.gov.gr: allow 1-segment slugs (valid articles)
          // OVERRIDE: Disable "path too short" rule for dypa.gov.gr (WordPress slugs are 1 segment)
          if (hostname.includes("dypa.gov.gr")) {
            // Block root, language paths, search, node paths, hash-only, query-only
            if (
              pathname === "/" || 
              pathname === "" || 
              pathname === "/#" || 
              pathname === "/el" || 
              pathname === "/en" ||
              pathname === "/search" ||
              pathname.startsWith("/search?") ||
              pathname.startsWith("/node/") ||
              (pathname === "/#" && !u.search) ||
              (u.search && (!pathname || pathname === "/"))
            ) {
              return { blocked: true, reason: `dypa.gov.gr: root/menu/search/node path` };
            }
            
            // Block known hub pages without content (denylist)
            const hubPagesDenylist = [
              "arxiki", "home", "anakoinoseis", "nea", "news", "search", 
              "el", "en", "menu", "sitemap", "contact", "epikoinonia"
            ];
            if (segments.length === 1 && hubPagesDenylist.includes(segments[0].toLowerCase())) {
              return { blocked: true, reason: `dypa.gov.gr: hub page "${segments[0]}"` };
            }
            
            // OVERRIDE: Allow ALL 1-segment paths for dypa.gov.gr (WordPress slugs are valid)
            // Only block if it's in the denylist (already checked above)
            if (segments.length === 1) {
              return { blocked: false }; // Allow all 1-segment paths (WordPress slugs)
            }
            
            // Allow multi-segment paths for active employment policies and other valid paths
            if (pathname.startsWith("/active-employment-policies/")) {
              return { blocked: false }; // Allow active employment policies paths
            }
            
            // Allow multi-segment paths by default (they're likely valid article/category paths)
            if (segments.length > 1) {
              return { blocked: false }; // Allow multi-segment paths
            }
            
            // Default: allow (shouldn't reach here, but safety fallback)
            return { blocked: false };
          }
          
          // For other hosts: block very short paths (root only)
          if (pathname === "/" || pathname === "" || segments.length === 0) {
            return { blocked: true, reason: `${hostname}: root path` };
          }
          // Allow keywords that indicate legitimate opportunities
          const allowKeywords = [
            "αποτελέσματα",
            "αποτελεσματα",
            "προσωρινά αποτελέσματα",
            "προσωρινα αποτελεσματα",
            "πρόσκληση",
            "προσκληση",
            "προκήρυξη",
            "προκηρυξη",
            "αιτήσεις",
            "αιτησεις",
            "έναρξη",
            "εναρξη",
            "παράταση",
            "παραταση",
            "πληρωμή",
            "πληρωμη",
            "voucher",
            "pass",
            "επίδομα",
            "επιδομα",
            "βόνους",
            "μπόνους",
            "bonus",
            "επιταγή",
            "επιταγη",
            "πρόγραμμα",
            "προγραμμα",
          ];
          
          // Don't block if title/content contains allow keywords
          const hasAllowKeyword = allowKeywords.some(
            (kw) => title.includes(kw) || content.includes(kw) || pathname.includes(kw)
          );
          if (hasAllowKeyword) {
            return { blocked: false }; // Allow it
          }
          
          const listingKeywords = [
            "faq",
            "politiki",
            "πολιτικη",
            "δήλωση",
            "δηλωση",
            "στατιστικ",
            "καταλογος",
            "catalog",
            "menu",
            "links",
          ];
          const matchedKeyword = listingKeywords.find(
            (kw) => pathname.includes(kw) || title.includes(kw)
          );
          if (matchedKeyword) {
            return { blocked: true, reason: `${hostname}: listing keyword "${matchedKeyword}"` };
          }
        }
      } catch {
        return { blocked: false };
      }
      
      return { blocked: false };
    };

    const classifyKind = (
      item: any
    ): "benefit" | "voucher_pass" | "service_info" => {
      const url = (item.url || "").toLowerCase();
      const title = (item.title || "").toLowerCase();
      const content = (item.content || "").toLowerCase();
      const pathname = (() => {
        try {
          return new URL(item.url || "").pathname.toLowerCase();
        } catch {
          return "";
        }
      })();

      // Blocklist titles/URLs that are clearly not opportunities
      const serviceInfoKeywords = [
        "πολιτική",
        "πολιτικη",
        "δήλωση",
        "δηλωση",
        "συχνές",
        "συχνες",
        "στατιστικά",
        "στατιστικα",
        "κατάλογος",
        "καταλογος",
        "δελτία",
        "δελτια",
        "υπηρεσίες",
        "υπηρεσιες",
        "ηλεκτρονικές υπηρεσίες",
        "ηλεκτρονικες υπηρεσιες",
        "κώδικας",
        "κωδικας",
        "επικοινωνία",
        "επικοινωνια",
        "site map",
        "sitemap",
        "cookies",
        "privacy",
        "terms",
      ];
      if (
        serviceInfoKeywords.some(
          (kw) =>
            title.includes(kw) ||
            content.includes(kw) ||
            pathname.includes(kw.replace(" ", "-")) ||
            url.includes(kw.replace(" ", "-"))
        )
      ) {
        return "service_info";
      }

      // Vouchers catalog / pages
      if (url.includes("vouchers.gov.gr")) {
        if (url.includes("youthpass") || title.includes("youthpass")) {
          return "voucher_pass";
        }
        if (url.includes("pass")) {
          return "voucher_pass";
        }
        if (url.includes("tourism4all")) {
          return "voucher_pass";
        }
        // default vouchers.gov.gr entries που φαίνονται σαν δράσεις
        return "voucher_pass";
      }

      // Generic gov.gr / dypa / opeka / efka benefit-like pages
      if (
        url.includes("gov.gr") ||
        url.includes("dypa.gov.gr") ||
        url.includes("opeka.gr") ||
        url.includes("efka.gov.gr") ||
        url.includes("e-efka.gov.gr") ||
        url.includes("stegasi.gov.gr")
      ) {
        if (title.includes("voucher") || url.includes("voucher"))
          return "voucher_pass";
        // gov.gr benefit-like σελίδες χωρίς ξεκάθαρο voucher -> benefit
        return "benefit";
      }

      // Fallbacks: αν φαίνεται σαν υπηρεσιακή σελίδα χωρίς προφανές benefit
      if (url.split("/").filter(Boolean).length > 1) {
        return "service_info";
      }

      return "benefit";
    };

    // DEDUPLICATION: Filter items by unique URL to avoid double processing
    const uniqueItemsMap = new Map();
    for (const item of items) {
      if (item.url) {
        uniqueItemsMap.set(item.url, item);
      }
    }
    const uniqueItems = Array.from(uniqueItemsMap.values());
    
    if (items.length > uniqueItems.length) {
      console.log(`   ℹ️  Deduplicated: ${items.length} -> ${uniqueItems.length} items (removed duplicates within same run)`);
    }

    // Item-level progress tracking
    const itemProgress = new ProgressTracker({
      label: `Items from ${source.name}`,
      total: uniqueItems.length,
      logEvery: Math.max(1, Math.floor(uniqueItems.length / 10)), // Log ~10 progress updates
      showItems: true,
    });
    itemProgress.start();

    for (let itemIdx = 0; itemIdx < uniqueItems.length; itemIdx++) {
      const item = uniqueItems[itemIdx];
      const canonical =
        item.metadata?.canonical || canonicalizeUrl(item.url || source.url);
      const hash = generateHash(canonical);

      // Check if already exists - upsert instead of skip
      // Check if already exists by hash
      const existingRawItem = await RawItem.findOne({ hash });

      // Min content filter: apply ONLY to body/summary, NOT title
      // Coerce to string: some APIs (e.g., MITOS/digigov) return objects like { el: "...", en: "..." }
      const rawTitle = item.title;
      const rawContent = item.content;
      let content = (typeof rawContent === "string" ? rawContent : typeof rawContent === "object" && rawContent ? (rawContent.el || rawContent.en || JSON.stringify(rawContent)) : "").trim();
      const title = (typeof rawTitle === "string" ? rawTitle : typeof rawTitle === "object" && rawTitle ? (rawTitle.el || rawTitle.en || rawTitle.name || JSON.stringify(rawTitle)) : "").trim();

      // Deep Fetch: If content is too short AND we don't have a better version in DB
      // Skip for Diavgeia (metadata based) and if URL is missing
      const isDiavgeiaCheck = source.url.includes("diavgeia.gov.gr");
      
      // Only deep fetch if we don't have an existing item OR the existing item also has short content
      const shouldDeepFetch = !isDiavgeiaCheck && 
                              content.length < 500 && 
                              item.url && 
                              item.url.startsWith("http") &&
                              (!existingRawItem || (existingRawItem.content && existingRawItem.content.length < 500));

      if (shouldDeepFetch) {
         console.log(`   🤿 Deep Fetching: Content short (${content.length} chars) - fetching full page from ${item.url}...`);
         try {
            const fullBody = await this.fetchPageBody(item.url);
            if (fullBody && fullBody.length > content.length) {
              console.log(`   ✅ Deep Fetch Success: ${content.length} -> ${fullBody.length} chars`);
              item.content = fullBody;
              content = fullBody; // Update local variable for subsequent checks
            }
         } catch (err: any) {
            console.warn(`   ⚠️ Deep Fetch Error: ${err.message}`);
         }
      } 
      
      // --- CROSS-REFERENCE WITH DIAVGEIA ---
      const sourceLower = source.name?.toLowerCase() || "";
      const titleLower = item.title?.toLowerCase() || "";
      const isAsepSource = sourceLower.includes("asep") || sourceLower.includes("ασεπ");
      const isDypaSource = sourceLower.includes("δυνα") || sourceLower.includes("dypa") || sourceLower.includes("oaed") || sourceLower.includes("οαεδ");
      
      const asepCodeMatch = item.title?.match(/(\d+[ΚΓΒΠΔ]\/\d{4})/i);
      
      if (isAsepSource && asepCodeMatch) {
         console.log(`   🔎 Cross-referencing ASEP ${asepCodeMatch[1]} with Diavgeia...`);
         const diavgeiaData = await crossReferenceAsepWithDiavgeia(item.title);
         if (diavgeiaData) {
            console.log(`   ✅ Diavgeia cross-reference success for ASEP ${asepCodeMatch[1]}`);
            const combinedContent = `${content}\n\n[ΔΙΑΣΤΑΥΡΩΣΗ ΑΠΟ ΔΙΑΥΓΕΙΑ]:\n${diavgeiaData.url}\n${diavgeiaData.text}`;
            item.content = combinedContent;
            content = combinedContent;
         }
      } else if (isDypaSource && (titleLower.includes("πρόγραμμα") || titleLower.includes("προγραμμα"))) {
         // Generic DYPA cross-reference for programs
         // Try searching for the first 50 chars of the title as a "Public Invitation" (Δημόσια Πρόσκληση)
         const searchTitle = item.title.replace(/[«»"]/g, '').substring(0, 100).trim();
         console.log(`   🔎 Cross-referencing DYPA program with Diavgeia: "${searchTitle}"...`);
         
         const diavgeiaData = await searchDiavgeia(`subject:"Πρόσκληση" AND subject:"ΔΥΠΑ" AND subject:"${searchTitle.substring(0, 40)}"`);
         if (diavgeiaData) {
            console.log(`   ✅ Diavgeia cross-reference success for DYPA program`);
            const combinedContent = `${content}\n\n[ΔΙΑΣΤΑΥΡΩΣΗ ΑΠΟ ΔΙΑΥΓΕΙΑ]:\n${diavgeiaData.url}\n${diavgeiaData.text}`;
            item.content = combinedContent;
            content = combinedContent;
         }
      } else if (item.title && item.title.length > 20) {
         // FINAL FALLBACK: For any source, try to find a decision in Diavgeia if title is specific enough
         const searchTitle = item.title.replace(/[«»"]/g, '').substring(0, 60).trim();
         if (searchTitle.length > 30) {
            console.log(`   🔎 Generic cross-referencing with Diavgeia: "${searchTitle}"...`);
            const diavgeiaData = await searchDiavgeia(`subject:"${searchTitle}"`);
            if (diavgeiaData) {
               console.log(`   ✅ Generic Diavgeia cross-reference success for: ${searchTitle}`);
               const combinedContent = `${content}\n\n[ΔΙΑΣΤΑΥΡΩΣΗ ΑΠΟ ΔΙΑΥΓΕΙΑ]:\n${diavgeiaData.url}\n${diavgeiaData.text}`;
               item.content = combinedContent;
               content = combinedContent;
            }
         }
      }
      // --- END CROSS-REFERENCE ---
      
      if (isDiavgeiaCheck && item.metadata?.ada) {
         // DIAVGEIA TIER 1: Fetch PDF text directly using ADA
         if (!existingRawItem || (existingRawItem.content && existingRawItem.content.length < 500)) {
           console.log(`   🏛️ Diavgeia Deep Fetching: Extracting PDF text for ADA ${item.metadata.ada}...`);
           const pdfText = await extractDiavgeiaText(item.metadata.ada);
           if (pdfText && pdfText.length > 50) {
             console.log(`   ✅ Diavgeia PDF Success: Extracted ${pdfText.length} chars`);
             // Combine metadata summary and PDF text
             const fullContent = `${content}\n\n[PDF ΠΕΡΙΕΧΟΜΕΝΟ]:\n${pdfText}`;
             item.content = fullContent;
             content = fullContent;
           }
         } else if (existingRawItem && existingRawItem.content) {
           item.content = existingRawItem.content;
           content = existingRawItem.content;
           console.log(`   ℹ️  Preserving existing Diavgeia PDF content (${content.length} chars)`);
         }
      } else if (existingRawItem && existingRawItem.content && existingRawItem.content.length > content.length) {
         // Keep existing longer content if we are just updating metadata
         item.content = existingRawItem.content;
         content = existingRawItem.content;
         console.log(`   ℹ️  Preserving existing content (${content.length} chars)`);
      }
      
      // Skip generic titles
      if (isGenericTitle(title)) {
        skipReasons.genericTitle++;
        console.log(`   ⏭️  SKIP: Generic title`);
        if (reporter) {
          reporter.trackSkipped(sourceId, 'genericTitle', title, item.url, content.length, source.type);
        }
        continue;
      }
      
      // Skip if content (body/summary) is too short (per-source thresholds)
      const isDiavgeia = source.url.includes("diavgeia.gov.gr");
      const isRSS = source.type === "rss";
      const isAPI = source.type === "api";
      
      // Per-source minimum content length
      let minContentLength = 50; // Default
      if (isDiavgeia) {
        minContentLength = 0; // Διαύγεια: metadata-based, no body required
      } else if (isRSS) {
        minContentLength = 20; // RSS: allow short descriptions
      } else if (isAPI && isDiavgeia) {
        minContentLength = 0; // Διαύγεια API: metadata-based
      }
      
      // Skip only if content is too short AND we don't have title+url
      if (content.length < minContentLength) {
        // Allow if we have title + url (for RSS/API metadata-based items)
        if (title.length < 10 || !item.url) {
          skipReasons.contentTooShort++;
          console.log(`   ⏭️  SKIP: Content body too short (${content.length} chars, min ${minContentLength}) - title: "${title.substring(0, 50)}"`);
          if (reporter) {
            reporter.trackSkipped(sourceId, 'contentTooShort', title, item.url, content.length, source.type);
          }
          continue;
        }
        // For RSS/API: allow with title+url even if content is short
        console.log(`   ℹ️  Allowing short content (${content.length} chars) - has title+url: "${title.substring(0, 50)}"`);
      }

      // Source-specific allow/deny filters
      const heuristicResult = isBlockedBySourceHeuristics(source, item);
      if (heuristicResult.blocked) {
        skipReasons.blockedByHeuristics++;
        console.log(`   ⏭️  SKIP: Blocked by source heuristics - ${heuristicResult.reason || 'unknown reason'}`);
        if (reporter) {
          reporter.trackSkipped(sourceId, 'blockedByHeuristics', title, item.url, content.length, source.type);
        }
        continue;
      }

      // Prevent duplicates from RSS/Discovery: Check for duplicate title before creating RawItem
      // Exclude current item (by hash) if it exists
      const duplicateQuery = { 
        title: item.title, 
        ...(existingRawItem ? { _id: { $ne: existingRawItem._id } } : {}) 
      };
      const existingByTitle = await RawItem.findOne(duplicateQuery);
      
      if (existingByTitle) {
        skipReasons.duplicateTitle = (skipReasons.duplicateTitle || 0) + 1;
        console.log(`   ⏭️  SKIP: Skipping duplicate title - "${item.title.substring(0, 50)}"`);
        if (reporter) {
          reporter.trackSkipped(sourceId, 'duplicateTitle', item.title, item.url, item.content?.length || 0, source.type);
        }
        continue;
      }

      // Save raw item (upsert if exists)
      let rawItem = existingRawItem;
      const isDuplicate = !!rawItem;
      if (rawItem) {
        // OPTIMIZATION: Only update and reprocess if content materially changed
        const contentChanged = rawItem.content !== item.content;
        const titleChanged = rawItem.title !== item.title;
        
        if (!contentChanged && !titleChanged) {
          console.log(`   ⏭️  SKIP: Content unchanged for "${title.substring(0, 50)}"`);
          if (reporter) reporter.trackSkipped(sourceId, 'unchanged', title, item.url, content.length, source.type);
          continue;
        }

        // Update existing
        rawItem.title = item.title;
        rawItem.content = item.content;
        rawItem.url = item.url;
        rawItem.publishedAt = item.publishedAt;
        rawItem.metadata = item.metadata || {};
        rawItem.processed = false; // Reprocess only if changed
        rawItem.updatedAt = new Date();
        await rawItem.save();
        console.log(`   🔄 UPDATED existing raw item (content changed)`);
      } else {
        // Create new
        rawItem = await RawItem.create({
          sourceId: source._id,
          hash,
          title: item.title,
          content: item.content,
          url: item.url,
          publishedAt: item.publishedAt,
          metadata: item.metadata || {},
          processed: false,
        });
      }

      // Track kept item (passed filters)
      if (reporter) {
        reporter.trackKept(sourceId);
      }
      itemsKept++;

      // Clean and validate using the Cleaner
      try {
        const now = new Date().toISOString();
        const cleanerInput: CleanerInput = {
          nowIso: now,
          source: source.name || "",
          sourceUrl: source.url || "",
          itemUrl: item.url || "",
          rawTitle: item.title || "",
          rawContent: item.content || "",
          rawFetchedAtIso: new Date().toISOString(),
          rawHtmlHints: item.metadata,
        };

        const cleaned = cleanAndValidate(cleanerInput);

        // Determine current source priority (1=API, 2=RSS, 3=HTML)
        const currentSourcePriority = source.type === "api" ? 1 : source.type === "rss" ? 2 : 3;

        // DEDUPLICATION OPTIMIZATION: Check if opportunity already exists BEFORE AI calls
        const alreadyExists = await Opportunity.findOne({
          officialUrl: cleaned.officialUrl,
          deletedAt: null,
        });

        if (alreadyExists) {
           const existingPriority = alreadyExists.sourcePriority || 3;
           
           if (currentSourcePriority >= existingPriority) {
             console.log(`   ⏭️  SKIP: Opportunity already exists (skipping AI) - Priority: ${existingPriority} vs Current: ${currentSourcePriority} - ${cleaned.officialUrl}`);
             // Mark raw item as processed since we found the opportunity
             rawItem.processed = true;
             rawItem.updatedAt = new Date();
             await rawItem.save();
             continue; 
           } else {
             console.log(`   ⭐ UPGRADE: Found better source priority (${currentSourcePriority} < ${existingPriority}) for ${cleaned.officialUrl}. Updating...`);
             // We don't continue; we let it process and later we will UPDATE alreadyExists instead of creating a new one.
           }
        }

        // AI-ASSISTED STATUS DETERMINATION: If cleaner returned 'unknown' status, try AI
        // OPTIMIZATION: Skip AI if status is rejected (e.g. service_info) to save tokens/time
        // Check for Groq API key
        const hasAiKey = !!config.groq.apiKey;
        
        if (cleaned.applicationStatus === "unknown" && cleaned.status !== "rejected" && hasAiKey) {
          console.log("   🤖 AI Status Check: Cleaner returned 'unknown', calling AI (Groq)...");
          
          // Throttle AI requests to reduce 429s on shared/free limits.
          console.log(`   ⏳ Throttling AI status request (${AI_THROTTLE_DELAY_MS}ms)...`);
          await sleep(AI_THROTTLE_DELAY_MS);
          
          try {
            const statusKey = `${(item.url || canonical) || ""}::${(item.title || "").substring(0, 120)}`;
            let aiStatus = aiStatusCache.get(statusKey);
            if (!aiStatus) {
              aiStatus = await extractApplicationStatus(
                item.title || "",
                item.content || "",
                item.url
              );
              aiStatusCache.set(statusKey, aiStatus);
              reporter?.trackAIStatusCall(true);
            } else {
              console.log("   🤖 AI Status Cache hit");
            }
            
            // If AI is confident enough, use its determination
            if (aiStatus.status !== "unknown" && aiStatus.confidence >= 0.7) {
              console.log(`   ✅ AI Override: ${cleaned.applicationStatus} → ${aiStatus.status} (${Math.round(aiStatus.confidence * 100)}%)`);
              cleaned.applicationStatus = aiStatus.status;
              
              // Also extract dates if AI found them
              if (aiStatus.deadlineAt && !cleaned.deadlineAt) {
                cleaned.deadlineAt = aiStatus.deadlineAt;
                console.log(`   📅 AI Date: deadline=${aiStatus.deadlineAt}`);
              }
              if (aiStatus.startAt && !cleaned.applicationStartAt) {
                cleaned.applicationStartAt = aiStatus.startAt;
                console.log(`   📅 AI Date: start=${aiStatus.startAt}`);
              }
              
              // Update status if it was draft due to unknown applicationStatus
              if (cleaned.status === "draft" && ["open", "upcoming"].includes(aiStatus.status)) {
                cleaned.status = "published";
                console.log("   🔓 AI upgraded status: draft → published (AI confirmed open/upcoming)");
              }
            } else {
              console.log(`   ℹ️ AI returned: ${aiStatus.status} (${Math.round(aiStatus.confidence * 100)}%) - keeping unknown`);
            }
          } catch (aiError: any) {
            console.log(`   ⚠️ AI Status failed: ${aiError.message?.substring(0, 50) || 'Unknown error'}`);
            reporter?.trackAIStatusCall(false);
          }
        }

        // Extract eligibility rules + high-quality summary using AI extractor
        // Throttle AI extraction requests to reduce 429s on shared/free limits.
        // OPTIMIZATION: Skip eligibility extraction if item is rejected
        let extracted: any = { confidence: 0, criteriaRulesJson: {}, criteriaJson: {}, summary: "" }; // Initialize extracted with safe defaults
        if (config.groq.apiKey && cleaned.status !== "rejected") {
          console.log(`   ⏳ Throttling AI extraction request (${AI_THROTTLE_DELAY_MS}ms)...`);
          await sleep(AI_THROTTLE_DELAY_MS);
          
          try {
            const extractKey = `${(item.url || canonical) || ""}::${(item.title || "").substring(0, 120)}`;
            let cachedExtract = aiExtractCache.get(extractKey);
            if (!cachedExtract) {
              cachedExtract = await extractOpportunity(
                item.title + "\n\n" + item.content
              );
              aiExtractCache.set(extractKey, cachedExtract);
              reporter?.trackAIExtractCall(true);
            } else {
              console.log("   🤖 AI Extractor Cache hit");
            }
            extracted = cachedExtract;
          } catch (aiError: any) {
            console.log(`   ⚠️ AI Eligibility failed: ${aiError.message?.substring(0, 50) || 'Unknown error'}`);
            reporter?.trackAIExtractCall(false);
          }
        }

        // If AI produced a good short summary, prefer it over the heuristic cleanSummary output.
        if (extracted.summary && typeof extracted.summary === "string") {
          const aiSummary = extracted.summary.trim();
          if (aiSummary.length >= 40) {
            // Hard cap to keep previews compact
            cleaned.summary = aiSummary.length > 320 ? aiSummary.substring(0, 317).trimEnd() + "…" : aiSummary;
          }
        }

        // AI FILTER: Reject irrelevant news/announcements (e.g. app launches, press releases)
        if (extracted.isIrrelevant) {
          cleaned.status = "rejected";
          if (!cleaned.evidence) {
            cleaned.evidence = { notes: [], statusSignals: [], dateSignals: [] };
          }
          cleaned.evidence.notes = [...(cleaned.evidence.notes || []), "Απορρίφθηκε από AI ως άσχετο νέο"];
          console.log(`   ⛔ AI Filter: Χαρακτηρίστηκε ως άσχετο νέο (παράβλεψη)`);
        }

        // AUTO-PUBLISH TRUSTED SOURCES: Check if source is trusted and confidence is sufficient
        const sourceName = source.name || "";
        const isTrustedSource = 
          sourceName.includes("ΔΥΠΑ") || 
          sourceName.includes("DYPA") || 
          sourceName.includes("ASEP") || 
          sourceName.includes("ΑΣΕΠ") || 
          sourceName.includes("Gov") || 
          sourceName.includes("Vouchers") ||
          sourceName.toLowerCase().includes("asep") ||
          sourceName.toLowerCase().includes("dypa");
        
        // Auto-publish trusted sources with sufficient confidence
        if (isTrustedSource && (extracted.confidence > 0.6 || cleaned.confidence > 0.6)) {
          if (cleaned.status === "draft") {
            console.log(`   🔓 AUTO-PUBLISH: Trusted source "${sourceName}" with confidence ${Math.max(extracted.confidence, cleaned.confidence)} - overriding draft status`);
            cleaned.status = "published";
            
            // If dates are unknown, set default expiration to 2 months in the future
            if (!cleaned.deadlineAt && !cleaned.applicationEndAt) {
              const twoMonthsFromNow = new Date();
              twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);
              cleaned.applicationEndAt = twoMonthsFromNow.toISOString();
              console.log(`   📅 AUTO-DATE: Set default expiration to 2 months from now (${twoMonthsFromNow.toISOString().split('T')[0]})`);
            }
          }
        }

        // Log cleaning result
        console.log(`   🧹 CLEANED: kind=${cleaned.kind}, type=${cleaned.type}, status=${cleaned.status}, applicationStatus=${cleaned.applicationStatus}`);
        if (cleaned.status === "rejected") {
          console.log(`   ❌ REJECTED: ${cleaned.evidence?.notes?.join("; ") || "No reason provided"}`);
        } else if (cleaned.status === "draft") {
          console.log(`   📝 DRAFT: ${cleaned.evidence?.notes?.join("; ") || "No reason provided"}`);
        } else if (cleaned.status === "archived") {
          console.log(`   📦 ARCHIVED: ${cleaned.evidence?.notes?.join("; ") || "No reason provided"}`);
        }

        // If rejected, skip opportunity creation
        if (cleaned.status === "rejected") {
          skipReasons.rejected++;
          rawItem.processed = true;
          await rawItem.save();
          if (reporter) {
            reporter.trackSkipped(sourceId, 'rejected', item.title, item.url, item.content.length, source.type, cleaned.kind, cleaned.status);
          }
          continue;
        }
        
        // Track draft/archived status (only if not auto-published)
        if (cleaned.status === "draft") {
          skipReasons.draft++;
          if (reporter) {
            reporter.trackSkipped(sourceId, 'draft', item.title, item.url, item.content.length, source.type, cleaned.kind, cleaned.status);
          }
        } else if (cleaned.status === "archived") {
          skipReasons.archived++;
          if (reporter) {
            reporter.trackSkipped(sourceId, 'archived', item.title, item.url, item.content.length, source.type, cleaned.kind, cleaned.status);
          }
        }

        // Extract eligibility rules using AI extractor (for criteria only)
        // Note: extracted is already fetched above for auto-publish check, so we reuse it here

        // Merge eligibility rules from extractor and cleaner
        let criteriaRulesJson = extracted.criteriaRulesJson || {};
        
        // Add requirementsNormalized from cleaner if available
        if (cleaned.requirementsNormalized) {
          criteriaRulesJson.requirementsNormalized = cleaned.requirementsNormalized;
        }
        
        // Add requirementsSummaryBullets if available
        if (cleaned.requirementsSummaryBullets && cleaned.requirementsSummaryBullets.length > 0) {
          criteriaRulesJson.requirementsSummaryBullets = cleaned.requirementsSummaryBullets;
        }
        
        let criteriaUnknown = cleaned.criteriaUnknown ?? extracted.criteriaUnknown ?? false;

        const hasRules =
          criteriaRulesJson && Object.keys(criteriaRulesJson || {}).length > 0;

        if (!hasRules || (extracted.confidence ?? 0) < 0.75) {
          // Keep requirementsNormalized even if other rules are missing
          if (cleaned.requirementsNormalized) {
            criteriaRulesJson = { requirementsNormalized: cleaned.requirementsNormalized };
            if (cleaned.requirementsSummaryBullets) {
              criteriaRulesJson.requirementsSummaryBullets = cleaned.requirementsSummaryBullets;
            }
            criteriaUnknown = false; // We have some requirements
          } else {
            criteriaRulesJson = {};
            criteriaUnknown = true;
          }
        }

        // Parse dates from cleaned output using unified parser (never Invalid Date)
        // FALLBACK: Use AI extracted dates if regex cleaner failed
        const parsedCleanedDeadline = cleaned.deadlineAt ? parseDate(cleaned.deadlineAt).date : null;
        const fallbackDeadline = extracted.deadlineAt ? new Date(extracted.deadlineAt) : undefined;
        const deadlineAt = parsedCleanedDeadline
          ? normalizeDate(parsedCleanedDeadline) || fallbackDeadline
          : fallbackDeadline;

        const parsedCleanedStart = cleaned.startAt ? parseDate(cleaned.startAt).date : null;
        const fallbackStart = extracted.startAt ? new Date(extracted.startAt) : undefined;
        const startAt = parsedCleanedStart
          ? normalizeDate(parsedCleanedStart) || fallbackStart
          : fallbackStart;

        const announcedAt = cleaned.announcedAt
          ? normalizeDate(parseDate(cleaned.announcedAt).date) || new Date()
          : new Date(); // Use current time if not provided
        const applicationStartAt = cleaned.applicationStartAt
          ? normalizeDate(parseDate(cleaned.applicationStartAt).date) || startAt
          : startAt; // Fallback to startAt
        const applicationEndAt = cleaned.applicationEndAt
          ? normalizeDate(parseDate(cleaned.applicationEndAt).date) || deadlineAt
          : deadlineAt; // Fallback to deadlineAt

        // STRICT DATE CHECK: If deadline is in the past, force status to closed
        if (applicationEndAt && new Date(applicationEndAt) < new Date()) {
           cleaned.applicationStatus = "closed";
           if (!cleaned.evidence) cleaned.evidence = { notes: [], statusSignals: [], dateSignals: [] };
           cleaned.evidence.notes?.push("System forced closed: Deadline in past");
           console.log(`   🔒 System Override: Deadline ${applicationEndAt} is past -> forcing closed status`);
        }

        // Use tags from cleaner if available, otherwise from extractor
        const tags = cleaned.tags.length > 0 ? cleaned.tags : (extracted.tags || []);

        // DEDUPLICATION: Check if opportunity already exists by officialUrl
        const existingOpp = await Opportunity.findOne({
          officialUrl: cleaned.officialUrl,
          deletedAt: null,
        });

        // ASEP-specific kind override: If ASEP source and title contains news keywords, set kind to 'news'
        let finalKind = cleaned.kind;
        let finalSummary = cleaned.summary;
        
        // Use summary from extractor if it's better (e.g., ASEP "no description" fix)
        if (extracted.summary && extracted.summary.trim().length > 0 && 
            (cleaned.summary.trim().length === 0 || cleaned.summary.toLowerCase().includes("no description"))) {
          finalSummary = extracted.summary;
        }
        
        // ASEP kind detection: If ASEP source and title contains news keywords, override kind
        const lowerTitle = cleaned.title.toLowerCase();
        const isAsepSource = sourceName.toLowerCase().includes("asep") || sourceName.toLowerCase().includes("ασεπ");
        if (isAsepSource) {
          // News-like keywords: results, tables, lottery, objections
          if (
            lowerTitle.includes("αποτελέσματα") ||
            lowerTitle.includes("αποτελεσματα") ||
            lowerTitle.includes("πίνακες") ||
            lowerTitle.includes("πινακες") ||
            lowerTitle.includes("κληρωτίδα") ||
            lowerTitle.includes("κληρωτιδα") ||
            lowerTitle.includes("ενστάσεις") ||
            lowerTitle.includes("ενστασεις")
          ) {
            finalKind = "news";
            console.log(`   📰 ASEP NEWS: Overriding kind to 'news' for ASEP results/announcements`);
          }
        }
        
        // Note: 'results', 'expired', and 'news' are now valid applicationStatus enum values
        // No mapping needed

        if (existingOpp) {
          // Update existing opportunity (don't create duplicate)
          // Always upgrade priority if the current source is better or equal
          if (currentSourcePriority <= (existingOpp.sourcePriority || 3)) {
             existingOpp.sourceType = source.type;
             existingOpp.sourcePriority = currentSourcePriority;
             existingOpp.source = cleaned.source;
          }
          
          existingOpp.title = cleaned.title;
          existingOpp.summary = finalSummary;
          existingOpp.kind = finalKind;
          existingOpp.type = cleaned.type;
          existingOpp.deadlineAt = deadlineAt;
          existingOpp.startAt = startAt;
          existingOpp.announcedAt = announcedAt;
          existingOpp.applicationStartAt = applicationStartAt;
          existingOpp.applicationEndAt = applicationEndAt;
          existingOpp.tags = tags;
          existingOpp.status = cleaned.status;
          existingOpp.confidence = cleaned.confidence;
          existingOpp.criteriaUnknown = cleaned.criteriaUnknown;
          // Update applicationStatus field
          (existingOpp as any).applicationStatus = cleaned.applicationStatus;
          existingOpp.updatedAt = new Date();
          await existingOpp.save();
          console.log(`   ✅ UPDATED existing opportunity (status=${cleaned.status})`);
        } else {
          // Create new opportunity
        // Store applicationStatus in model field
        await Opportunity.create({
          type: cleaned.type,
          kind: finalKind,
          title: cleaned.title,
          summary: finalSummary,
          officialUrl: cleaned.officialUrl,
          source: cleaned.source,
          sourceType: source.type,
          sourcePriority: currentSourcePriority,
          publishedAt: item.publishedAt,
          deadlineAt,
          startAt,
          announcedAt,
          applicationStartAt,
          applicationEndAt,
          tags,
          region: extracted.region,
          criteriaJson: extracted.criteriaJson || {},
          criteriaRulesJson,
          criteriaUnknown: cleaned.criteriaUnknown,
          confidence: cleaned.confidence,
          applicationStatus: cleaned.applicationStatus,
          status: cleaned.status,
        });
        console.log(`   ✅ CREATED new opportunity (status=${cleaned.status})`);
        }

        rawItem.processed = true;
        await rawItem.save();
        processedCount++;
        
        // Track published/updated with status
        if (reporter) {
          if (isDuplicate) {
            reporter.trackUpdated(sourceId);
            // Also track status for updated items
            reporter.trackPublished(sourceId, cleaned.status, cleaned.applicationStatus);
          } else {
            reporter.trackPublished(sourceId, cleaned.status, cleaned.applicationStatus);
          }
        }
      } catch (error: any) {
        skipReasons.error++;
        console.error(`Error processing raw item ${rawItem._id}:`, error);
        if (reporter) {
          reporter.trackSkipped(sourceId, 'error', item.title, item.url, item.content.length, source.type);
          reporter.trackError(sourceId, error.message || String(error));
        }
      }

      // Tick item progress
      itemProgress.tick(item.title?.substring(0, 50));
    }

    // Finish item progress
    const totalSkippedForSummary = Object.values(skipReasons).reduce((sum, count) => sum + count, 0);
    itemProgress.finish({
      "Published": processedCount,
      "Kept": itemsKept,
      "Skipped": totalSkippedForSummary,
    });

    // Update source with processing stats
    source.lastFetchedAt = new Date();
    source.lastItemsKept = itemsKept;
    source.lastItemsPublished = processedCount;
    source.lastSuccessAt = new Date();
    source.consecutiveFailures = 0; // Reset failures on success
    source.lastError = undefined;
    await source.save();

    // Log source health summary
    console.log(`\n📊 ${source.name} SUMMARY:`);
    console.log(`   Extracted: ${source.lastItemsExtracted || 0} items`);
    console.log(`   Kept (passed filters): ${itemsKept} items`);
    console.log(`   Published: ${processedCount} items`);
    console.log(`   HTTP Status: ${source.lastHttpStatus || 'N/A'}`);
    console.log(`   Content-Type: ${source.lastContentType || 'N/A'}`);
    console.log(`   Bytes: ${source.lastBytes || 0}`);
    
    // Show skip reasons breakdown
    const totalSkipped = Object.values(skipReasons).reduce((sum, count) => sum + count, 0);
    if (totalSkipped > 0) {
      console.log(`\n   ⏭️  SKIPPED ITEMS (${totalSkipped} total):`);
      if (skipReasons.duplicate > 0) {
        console.log(`      • Duplicate: ${skipReasons.duplicate}`);
      }
      if (skipReasons.contentTooShort > 0) {
        console.log(`      • Content too short: ${skipReasons.contentTooShort}`);
      }
      if (skipReasons.genericTitle > 0) {
        console.log(`      • Generic title: ${skipReasons.genericTitle}`);
      }
      if (skipReasons.blockedByHeuristics > 0) {
        console.log(`      • Blocked by heuristics: ${skipReasons.blockedByHeuristics}`);
      }
      if (skipReasons.rejected > 0) {
        console.log(`      • Rejected (service_info/invalid): ${skipReasons.rejected}`);
      }
      if (skipReasons.draft > 0) {
        console.log(`      • Draft (unknown status/no dates): ${skipReasons.draft}`);
      }
      if (skipReasons.archived > 0) {
        console.log(`      • Archived (closed/expired): ${skipReasons.archived}`);
      }
      if (skipReasons.error > 0) {
        console.log(`      • Processing error: ${skipReasons.error}`);
      }
    }
    
    if (source.lastError) {
      console.log(`   ⚠️  Error: ${source.lastError}`);
    }
    if (itemsKept > processedCount) {
      const notPublished = itemsKept - processedCount;
      console.log(`   ⚠️  ${notPublished} items kept but not published (see skip reasons above)`);
    }

    return { processedCount, skipReasons };
  }

  async processAllEnabledSources(): Promise<{ count: number; durationMs: number; failedCount: number }> {
    // Initialize reporter
    const debugMode = config.ingestion?.debug || false;
    const reporter = new IngestionReporter(debugMode);
    
    const sources = await Source.find({ enabled: true }).sort({ name: 1 });
    let totalProcessed = 0;
    const successfulSources: Array<{ name: string; itemsProcessed: number }> = [];
    const failedSources: Array<{ name: string; error: string }> = [];
    const emptySources: Array<{ name: string; reason: string }> = [];
    
    // Aggregate skip reasons from all sources
    const allSkipReasons: Record<string, { source: string; reasons: Record<string, number> }> = {};

    for (const source of sources) {
      const sourceStartTime = Date.now();
      try {
        const result = await this.processSource(source._id.toString(), reporter);
        const sourceDuration = Date.now() - sourceStartTime;
        reporter.setSourceDuration(source._id.toString(), sourceDuration);
        totalProcessed += result.processedCount;
        
        // Store skip reasons for this source
        if (Object.values(result.skipReasons).some(count => count > 0)) {
          allSkipReasons[source.name] = {
            source: source.name,
            reasons: result.skipReasons,
          };
        }
        
        if (result.processedCount > 0) {
          successfulSources.push({ name: source.name, itemsProcessed: result.processedCount });
        } else {
          // Source processed 0 items - might be empty or no new items
          emptySources.push({ 
            name: source.name, 
            reason: source.lastFetchedAt ? "No new items" : "Empty or no items found" 
          });
        }
      } catch (error: any) {
        const sourceDuration = Date.now() - sourceStartTime;
        reporter.setSourceDuration(source._id.toString(), sourceDuration);
        const errorMsg = error.message || String(error);
        console.error(`❌ Error processing source ${source.name}:`, errorMsg);
        failedSources.push({ name: source.name, error: errorMsg });
        reporter.trackError(source._id.toString(), errorMsg);
        
        // If critical error, disable source
        if (error.response?.status === 400 || error.response?.status === 404) {
          console.warn(`⚠️  Disabling source due to API error: ${source.name}`);
          source.enabled = false;
          await source.save();
        }
      }
    }

    // Summary logging
    console.log("\n" + "=".repeat(60));
    console.log("📊 INGESTION SUMMARY");
    console.log("=".repeat(60));
    console.log(`✅ Successful sources: ${successfulSources.length}/${sources.length}`);
    if (successfulSources.length > 0) {
      console.log("\n✅ Successful sources:");
      successfulSources.forEach((s) => {
        console.log(`   • ${s.name}: ${s.itemsProcessed} items processed`);
      });
    }
    
    if (emptySources.length > 0) {
      console.log(`\nℹ️  Empty/No new items: ${emptySources.length} sources`);
      emptySources.forEach((s) => {
        console.log(`   • ${s.name}: ${s.reason}`);
      });
    }
    
    if (failedSources.length > 0) {
      console.log(`\n❌ Failed sources: ${failedSources.length} sources`);
      failedSources.forEach((s) => {
        const errorPreview = s.error.length > 150 ? s.error.substring(0, 150) + "..." : s.error;
        console.log(`   • ${s.name}: ${errorPreview}`);
      });
    }
    
    console.log(`\n📦 Total items processed: ${totalProcessed}`);
    console.log("=".repeat(60) + "\n");

    // Generate report
    const reportPath = await reporter.generateReport();
    console.log(`📊 Report saved to: ${reportPath}`);

    const totalDurationMs = Date.now() - reporter.getStartTime();

    return { 
      count: totalProcessed, 
      durationMs: totalDurationMs,
      failedCount: failedSources.length 
    };
  }
}
