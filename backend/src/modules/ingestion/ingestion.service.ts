import Parser from "rss-parser";
import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import * as cheerio from "cheerio";
import { Source } from "../../models/source.model";
import { RawItem } from "../../models/rawItem.model";
import { Opportunity } from "../../models/opportunity.model";
import { generateHash } from "../../utils/normalize";
import { config } from "../../config/env";
import { extractOpportunity } from "./extractor";
import { cleanAndValidate, CleanerInput } from "./cleaner";
import { checkSourceHealth, fixEndpointUrl } from "./source-health-check";
import { IngestionReporter } from "./ingestion-reporter";
import { parseDate, normalizeDate } from "../../utils/date-parser";

const rssParser = new Parser({
  customFields: {
    item: ["category"],
  },
});

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
};

// Headers per source type
function getHeadersForSourceType(sourceType: string): Record<string, string> {
  const baseHeaders = {
    "User-Agent": DEFAULT_HEADERS["User-Agent"],
  };

  if (sourceType === "rss") {
    return {
      ...baseHeaders,
      Accept: "application/rss+xml,application/xml;q=0.9,text/xml;q=0.9,*/*;q=0.8",
    };
  } else if (sourceType === "api") {
    return {
      ...baseHeaders,
      Accept: "application/json,*/*;q=0.8",
    };
  } else {
    // html_listing, html_catalog, single_page
    return {
      ...baseHeaders,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "el-GR,el;q=0.9,en;q=0.8",
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
    const response = await axios.get(url, {
      ...options,
      maxRedirects: 5,
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
    } else if (typeof response.data === 'string') {
      const lowerData = response.data.toLowerCase();
      is404 = lowerData.includes("δεν ήταν δυνατή η εύρεση") ||
              lowerData.includes("404") ||
              lowerData.includes("not found") ||
              lowerData.includes("page not found");
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
      const { data, finalUrl, statusCode, is404, contentType, contentLength } = await fetchWithRedirects(source.url, {
        headers: { ...headers, ...(source.config?.headers || {}) },
        responseType: "text",
        timeout: 15000,
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
      const response = await axios.get(source.url, {
        headers: { ...headers, ...(source.config?.headers || {}) },
        params: source.config?.params || {},
        timeout: 15000,
      });

      // Store fetch metadata
      source.lastHttpStatus = response.status;
      source.lastFinalUrl = response.request?.responseURL || source.url;
      source.lastContentType = response.headers['content-type'] || '';
      source.lastBytes = response.headers['content-length'] 
        ? parseInt(response.headers['content-length'], 10) 
        : (typeof response.data === 'string' ? response.data.length : JSON.stringify(response.data).length);
      source.lastError = undefined;

      // Save raw response in debug mode
      if (reporter && sourceId) {
        const rawData = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        await reporter.saveRawResponse(sourceId, source.name, source.lastContentType, rawData);
      }

      // Handle different API response formats
      let items: any[] = [];
      
      // Διαύγεια API format: response.data.response.docs
      if (response.data?.response?.docs) {
        items = response.data.response.docs;
      } else if (Array.isArray(response.data)) {
        items = response.data;
      } else if (response.data?.data) {
        items = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
      } else if (response.data?.decisions) {
        items = Array.isArray(response.data.decisions) ? response.data.decisions : [response.data.decisions];
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
        
        return {
          title: item.title || item.name || item.subject || "",
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
      const response = await axios.get(source.url, {
        headers: { ...headers, ...(source.config?.headers || {}) },
        responseType: "text",
        timeout: 15000,
      });

      // Store fetch metadata
      source.lastHttpStatus = response.status;
      source.lastFinalUrl = response.request?.responseURL || source.url;
      source.lastContentType = response.headers['content-type'] || '';
      source.lastBytes = response.headers['content-length'] 
        ? parseInt(response.headers['content-length'], 10) 
        : (typeof response.data === 'string' ? response.data.length : 0);
      source.lastError = undefined;

      // Save raw response in debug mode
      if (reporter && sourceId) {
        await reporter.saveRawResponse(sourceId, source.name, source.lastContentType, response.data);
      }

      const $ = cheerio.load(response.data);
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
      const { data, finalUrl, statusCode, is404, contentType, contentLength } = await fetchWithRedirects(source.url, {
        headers: { ...headers, ...(source.config?.headers || {}) },
        responseType: "text",
        timeout: 15000,
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
      
      // Regular listing: find links ONLY in main content (ignore header/footer/nav)
      // Try to find main content container first
      const mainContent = $("main, article, [role='main'], .content, .main-content, #content, .main, [class*='content']").first();
      const searchContainer = mainContent.length > 0 ? mainContent : $("body");
      
      searchContainer.find("a").each((_, el) => {
        const $el = $(el);
        const href = $el.attr("href");
        const text = $el.text().trim();
        if (!href || !text) return;
        
        // Skip if link is in header/footer/nav
        const parent = $el.parents("header, footer, nav, [role='navigation'], .header, .footer, .navigation, [class*='header'], [class*='footer'], [class*='nav']");
        if (parent.length > 0) return;
        
        // Skip blocklisted items (menu/FAQ/guides)
        const lowerText = text.toLowerCase();
        const lowerHref = href.toLowerCase();
        if (blocklistKeywords.some((kw) => lowerText.includes(kw) || lowerHref.includes(kw))) {
          return;
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
          )
            return;
          
          // Skip if URL contains blocklist keywords
          if (blocklistKeywords.some((kw) => u.pathname.toLowerCase().includes(kw))) {
            return;
          }

          const canonical = `${u.hostname}${u.pathname}`;
          items.push({
            title: text,
            content: text,
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
      const response = await axios.get(source.url, {
        headers: { ...headers, ...(source.config?.headers || {}) },
        responseType: "text",
        timeout: 15000,
      });

      // Store fetch metadata
      source.lastHttpStatus = response.status;
      source.lastFinalUrl = response.request?.responseURL || source.url;
      source.lastContentType = response.headers['content-type'] || '';
      source.lastBytes = response.headers['content-length'] 
        ? parseInt(response.headers['content-length'], 10) 
        : (typeof response.data === 'string' ? response.data.length : 0);
      source.lastError = undefined;

      // Save raw response in debug mode
      if (reporter && sourceId) {
        await reporter.saveRawResponse(sourceId, source.name, source.lastContentType, response.data);
      }

      const $ = cheerio.load(response.data);
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
      if (!t || t.length < 5) return true;
      const genericTitles = [
        "gov.gr",
        "υπουργείο",
        "υπουργειο",
        "αρχική",
        "home",
        "welcome",
      ];
      return genericTitles.some((g) => t === g || t.startsWith(g + " "));
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

    for (const item of items) {
      const canonical =
        item.metadata?.canonical || canonicalizeUrl(item.url || source.url);
      const hash = generateHash(canonical);

      // Log extracted item
      console.log(`\n📥 EXTRACTED: "${item.title?.substring(0, 60)}..." | URL: ${item.url?.substring(0, 80)}...`);

      // Check if already exists - upsert instead of skip
      const existingRawItem = await RawItem.findOne({ hash });
      if (existingRawItem) {
        // Update existing raw item (upsert)
        existingRawItem.title = item.title;
        existingRawItem.content = item.content;
        existingRawItem.url = item.url;
        existingRawItem.publishedAt = item.publishedAt;
        existingRawItem.metadata = item.metadata || {};
        existingRawItem.updatedAt = new Date();
        await existingRawItem.save();
        console.log(`   🔄 UPDATED existing raw item (will reprocess)`);
        // Continue processing (don't skip) - will update opportunity too
      }

      // Min content filter: apply ONLY to body/summary, NOT title
      const content = (item.content || "").trim();
      const title = (item.title || "").trim();
      
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
      const existingByTitle = await RawItem.findOne({ title: item.title });
      if (existingByTitle) {
        skipReasons.duplicateTitle = (skipReasons.duplicateTitle || 0) + 1;
        console.log(`   ⏭️  SKIP: Skipping duplicate title - "${item.title.substring(0, 50)}"`);
        if (reporter) {
          reporter.trackSkipped(sourceId, 'duplicateTitle', item.title, item.url, item.content?.length || 0, source.type);
        }
        continue;
      }

      // Save raw item (upsert if exists)
      let rawItem = await RawItem.findOne({ hash });
      const isDuplicate = !!rawItem;
      if (rawItem) {
        // Update existing
        rawItem.title = item.title;
        rawItem.content = item.content;
        rawItem.url = item.url;
        rawItem.publishedAt = item.publishedAt;
        rawItem.metadata = item.metadata || {};
        rawItem.processed = false; // Reprocess
        rawItem.updatedAt = new Date();
        await rawItem.save();
        // Don't skip duplicates - reprocess them to update opportunities
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

        // Extract eligibility rules using AI extractor (for criteria and confidence check)
        // THRROTTLING: Wait 20s to respect Gemini Free Tier limits (avoid 429 errors)
        if (process.env.GEMINI_API_KEY) {
          console.log("   ⏳ Throttling AI request (20s)...");
          await new Promise(resolve => setTimeout(resolve, 20000));
        }

        const extracted = await extractOpportunity(
          item.title + "\n\n" + item.content
        );

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
        const deadlineAt = cleaned.deadlineAt
          ? normalizeDate(parseDate(cleaned.deadlineAt).date) || undefined
          : undefined;
        const startAt = cleaned.startAt
          ? normalizeDate(parseDate(cleaned.startAt).date) || undefined
          : undefined;
        const announcedAt = cleaned.announcedAt
          ? normalizeDate(parseDate(cleaned.announcedAt).date) || new Date()
          : new Date(); // Use current time if not provided
        const applicationStartAt = cleaned.applicationStartAt
          ? normalizeDate(parseDate(cleaned.applicationStartAt).date) || startAt
          : startAt; // Fallback to startAt
        const applicationEndAt = cleaned.applicationEndAt
          ? normalizeDate(parseDate(cleaned.applicationEndAt).date) || deadlineAt
          : deadlineAt; // Fallback to deadlineAt

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

        if (existingOpp) {
          // Update existing opportunity (don't create duplicate)
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
    }

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

  async processAllEnabledSources(): Promise<number> {
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

    // Generate and save comprehensive report
    try {
      const reportPath = await reporter.generateReport();
      console.log(`\n📊 Ingestion report saved to: ${reportPath}`);
    } catch (error) {
      console.error(`⚠️  Failed to generate ingestion report:`, error);
    }

    // Save skip reasons to JSON file (legacy, for backwards compatibility)
    if (Object.keys(allSkipReasons).length > 0) {
      try {
        const fs = await import("fs/promises");
        const path = await import("path");
        const skipReasonsFile = path.join(process.cwd(), "skip-reasons.json");
        const skipReasonsData = {
          timestamp: new Date().toISOString(),
          totalSources: sources.length,
          sourcesWithSkips: Object.keys(allSkipReasons).length,
          skipReasons: allSkipReasons,
        };
        await fs.writeFile(skipReasonsFile, JSON.stringify(skipReasonsData, null, 2), "utf-8");
        console.log(`\n💾 Skip reasons saved to: ${skipReasonsFile}`);
      } catch (error) {
        console.error(`⚠️  Failed to save skip reasons to JSON:`, error);
      }
    }

    return totalProcessed;
  }
}
