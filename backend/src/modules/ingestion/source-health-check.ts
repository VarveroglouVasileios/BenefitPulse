import axios from "axios";
import * as cheerio from "cheerio";

export interface HealthCheckResult {
  healthy: boolean;
  finalUrl?: string;
  statusCode?: number;
  replacementUrl?: string;
  reason?: string;
}

/**
 * Source Health Check with auto-rewrite rules
 * Checks if source URL is accessible and applies rewrite rules if needed
 */
export async function checkSourceHealth(
  url: string,
  sourceType: string
): Promise<HealthCheckResult> {
  try {
    // First, try original URL
    const response = await axios.head(url, {
      maxRedirects: 5,
      validateStatus: (status) => status < 500,
      timeout: 10000,
    });

    if (response.status === 200) {
      return {
        healthy: true,
        finalUrl: response.request?.responseURL || url,
        statusCode: 200,
      };
    }

    // If 404, try rewrite rules
    if (response.status === 404) {
      const rewritten = await tryRewriteRules(url, sourceType);
      if (rewritten) {
        return rewritten;
      }
    }

    return {
      healthy: false,
      statusCode: response.status,
      reason: `HTTP ${response.status}`,
    };
  } catch (error: any) {
    if (error.response?.status === 404) {
      // Try rewrite rules
      const rewritten = await tryRewriteRules(url, sourceType);
      if (rewritten) {
        return rewritten;
      }
    }

    return {
      healthy: false,
      reason: error.message || "Network error",
    };
  }
}

/**
 * Apply rewrite rules for broken URLs
 */
async function tryRewriteRules(
  url: string,
  sourceType: string
): Promise<HealthCheckResult | null> {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname;

    // Rule 1: Prosvasis /el/ removal
    if (
      hostname.includes("prosvasis.dypa.gov.gr") &&
      pathname.startsWith("/el/")
    ) {
      const newPath = pathname.replace("/el/", "/");
      const newUrl = `${urlObj.protocol}//${hostname}${newPath}${urlObj.search}`;

      try {
        const testResponse = await axios.head(newUrl, {
          maxRedirects: 5,
          validateStatus: (status) => status < 500,
          timeout: 10000,
        });

        if (testResponse.status === 200) {
          return {
            healthy: true,
            finalUrl: testResponse.request?.responseURL || newUrl,
            statusCode: 200,
            replacementUrl: newUrl,
            reason: "Removed /el/ prefix",
          };
        }
      } catch {
        // Continue to next rule
      }
    }

    // Rule 2: Gov.gr transliteration fixes
    if (hostname.includes("gov.gr")) {
      const fixes = [
        { from: "ugeia-", to: "ygeia-" },
        { from: "epidoteseis", to: "epidotiseis" },
      ];

      for (const fix of fixes) {
        if (pathname.includes(fix.from)) {
          const newPath = pathname.replace(fix.from, fix.to);
          const newUrl = `${urlObj.protocol}//${hostname}${newPath}${urlObj.search}`;

          try {
            const testResponse = await axios.head(newUrl, {
              maxRedirects: 5,
              validateStatus: (status) => status < 500,
              timeout: 10000,
            });

            if (testResponse.status === 200) {
              return {
                healthy: true,
                finalUrl: testResponse.request?.responseURL || newUrl,
                statusCode: 200,
                replacementUrl: newUrl,
                reason: `Fixed transliteration: ${fix.from} -> ${fix.to}`,
              };
            }
          } catch {
            // Continue to next fix
          }
        }
      }
    }

    // Rule 3: AADE myΘέρμανση - try Greek path
    if (hostname.includes("aade.gr") && pathname.includes("/en/mythermansi")) {
      const newPath = pathname.replace("/en/mythermansi", "/mythermansi");
      const newUrl = `${urlObj.protocol}//${hostname}${newPath}${urlObj.search}`;

      try {
        const testResponse = await axios.head(newUrl, {
          maxRedirects: 5,
          validateStatus: (status) => status < 500,
          timeout: 10000,
        });

        if (testResponse.status === 200) {
          return {
            healthy: true,
            finalUrl: testResponse.request?.responseURL || newUrl,
            statusCode: 200,
            replacementUrl: newUrl,
            reason: "Changed from /en/ to Greek path",
          };
        }
      } catch {
        // Continue
      }
    }

    // Rule 4: e-ΕΦΚΑ - try efka.gov.gr
    if (hostname === "www.e-efka.gov.gr") {
      const newHostname = "www.efka.gov.gr";
      const newUrl = `${urlObj.protocol}//${newHostname}${pathname}${urlObj.search}`;

      try {
        const testResponse = await axios.head(newUrl, {
          maxRedirects: 5,
          validateStatus: (status) => status < 500,
          timeout: 10000,
        });

        if (testResponse.status === 200) {
          return {
            healthy: true,
            finalUrl: testResponse.request?.responseURL || newUrl,
            statusCode: 200,
            replacementUrl: newUrl,
            reason: "Changed from e-efka.gov.gr to efka.gov.gr",
          };
        }
      } catch {
        // Continue
      }
    }

    // Rule 5: OPEKA - try www.opeka.gr
    if (hostname === "opeka.gr") {
      const newHostname = "www.opeka.gr";
      const newUrl = `${urlObj.protocol}//${newHostname}${pathname}${urlObj.search}`;

      try {
        const testResponse = await axios.head(newUrl, {
          maxRedirects: 5,
          validateStatus: (status) => status < 500,
          timeout: 10000,
        });

        if (testResponse.status === 200) {
          return {
            healthy: true,
            finalUrl: testResponse.request?.responseURL || newUrl,
            statusCode: 200,
            replacementUrl: newUrl,
            reason: "Changed from opeka.gr to www.opeka.gr",
          };
        }
      } catch {
        // Continue
      }
    }

    // Rule 6: Stegastiko - try without /index
    if (
      hostname.includes("stegastiko.minedu.gov.gr") &&
      pathname.endsWith("/index")
    ) {
      const newPath = pathname.replace("/index", "/");
      const newUrl = `${urlObj.protocol}//${hostname}${newPath}${urlObj.search}`;

      try {
        const testResponse = await axios.head(newUrl, {
          maxRedirects: 5,
          validateStatus: (status) => status < 500,
          timeout: 10000,
        });

        if (testResponse.status === 200) {
          return {
            healthy: true,
            finalUrl: testResponse.request?.responseURL || newUrl,
            statusCode: 200,
            replacementUrl: newUrl,
            reason: "Removed /index suffix",
          };
        }
      } catch {
        // Continue
      }
    }

    return null; // No rewrite rule matched
  } catch {
    return null;
  }
}

/**
 * Fix specific endpoints based on source type
 */
export function fixEndpointUrl(url: string, sourceType: string): string {
  const urlObj = new URL(url);
  const hostname = urlObj.hostname.toLowerCase();

  // Διαύγεια: Fix to opendata endpoint with proper Lucene query encoding
  if (
    hostname.includes("diavgeia.gov.gr") &&
    urlObj.pathname.includes("/luminapi/api/")
  ) {
    if (
      urlObj.pathname.includes("/decisions/search") ||
      urlObj.pathname.includes("/search")
    ) {
      // Convert to opendata search/export
      let query = urlObj.searchParams.get("q") || "";

      // Fix query encoding: use proper Solr syntax with subject field filter
      // Remove quotes that break Lucene, use proper encoding
      query = query.replace(/"/g, "").replace(/\s+OR\s+/gi, " OR ");

      // If query is empty or doesn't have subject: prefix, use default with subject filter
      if (!query || query.trim() === "" || !query.includes("subject:")) {
        // Use subject field filter for better precision
        query =
          "subject:(επίδομα OR επιδότηση OR voucher OR pass OR youth pass OR tourism4all OR north evia pass OR thessaly-evros pass)";
      }

      const page = urlObj.searchParams.get("page") || "1";
      const pageSize =
        urlObj.searchParams.get("pageSize") ||
        urlObj.searchParams.get("rows") ||
        "50";

      const newUrl = new URL(
        "https://opendata.diavgeia.gov.gr/luminapi/api/search/export"
      );
      // Use encodeURIComponent directly for query (spaces become %20, not +)
      // Don't use searchParams.set as it converts spaces to +
      const encodedQuery = encodeURIComponent(query);
      const start = String((parseInt(page) - 1) * parseInt(pageSize));
      newUrl.search = `q=${encodedQuery}&wt=json&rows=${pageSize}&start=${start}`;

      return newUrl.toString();
    }
  }

  // MITOS: Fix to correct base
  if (
    hostname.includes("mitos.gov.gr") ||
    hostname.includes("digigov.grnet.gr")
  ) {
    if (urlObj.pathname === "/" || urlObj.pathname === "") {
      // Don't use root, return as-is (will need discovery)
      return url;
    }
    // If already has /v1, keep it
    if (!urlObj.pathname.startsWith("/v1")) {
      urlObj.pathname = `/v1${urlObj.pathname}`;
      return urlObj.toString();
    }
  }

  return url; // No fix needed
}
