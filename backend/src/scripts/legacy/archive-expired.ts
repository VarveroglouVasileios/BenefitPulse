/**
 * Archive Expired Opportunities Script
 *
 * Checks all published opportunities and archives those that are expired:
 * - deadlineAt < today
 * - Or content indicates applications are closed
 */

// Polyfill for Node 16 (undici expects Blob/ReadableStream). Remove on Node 18+.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Blob } = require("buffer");
if (!(global as any).Blob) {
  (global as any).Blob = Blob;
}

// Minimal File polyfill using Blob
if (!(global as any).File) {
  class PolyfillFile extends Blob {
    name: string;
    lastModified: number;
    constructor(parts: any[], name: string, options: any = {}) {
      super(parts, options);
      this.name = name;
      this.lastModified = options.lastModified || Date.now();
    }
  }
  (global as any).File = PolyfillFile;
}

// Minimal DOMException polyfill
if (!(global as any).DOMException) {
  class PolyfillDOMException extends Error {
    name: string;
    constructor(message = "", name = "DOMException") {
      super(message);
      this.name = name;
    }
  }
  (global as any).DOMException = PolyfillDOMException;
}
// eslint-disable-next-line @typescript-eslint/no-var-requires
require("web-streams-polyfill/polyfill");

import { connectMongo } from "../db/mongo";
import { Opportunity } from "../models/opportunity.model";
import { RawItem } from "../models/rawItem.model";
import { cleanAndValidate, CleanerInput } from "../modules/ingestion/cleaner";
import axios from "axios";
import * as cheerio from "cheerio";

/**
 * Canonicalize URL for matching
 */
function canonicalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.search = "";
    u.hash = "";
    let pathname = u.pathname;
    if (pathname.endsWith("/") && pathname !== "/") {
      pathname = pathname.slice(0, -1);
    }
    return `${u.protocol}//${u.hostname}${pathname}`;
  } catch {
    return url;
  }
}

/**
 * Check if text contains expired keywords
 */
function hasExpiredKeywords(text: string): boolean {
  const lowerText = text.toLowerCase();
  const expiredKeywords = [
    "ολοκληρώθηκαν",
    "έληξε",
    "έκλεισε",
    "ολοκληρώθηκε",
    "τελείωσε",
    "completed",
    "closed",
    "ended",
    "finished",
    "η πλατφόρμα έκλεισε",
    "η πλατφορμα εκλεισε",
    "ολοκλήρωση αιτήσεων",
    "ολοκληρωση αιτησεων",
  ];
  return expiredKeywords.some((kw) => lowerText.includes(kw));
}

/**
 * Fetch full page content if RawItem content is too short
 */
async function fetchFullPageContent(url: string): Promise<string | null> {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 10000,
    });
    const $ = cheerio.load(response.data);
    // Remove script and style tags
    $("script, style").remove();
    // Get main content
    const content = $("main, article, .content, body").text().trim();
    return content || null;
  } catch (error) {
    console.error(`   ⚠️  Failed to fetch ${url}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

async function archiveExpired() {
  await connectMongo();

  const today = new Date().toISOString();
  const now = new Date();

  console.log(`🔍 Checking for expired opportunities (today: ${today})...`);

  // Find all published opportunities
  const published = await Opportunity.find({
    status: "published",
    deletedAt: null,
  });

  console.log(`📊 Found ${published.length} published opportunities\n`);

  let archivedCount = 0;
  let checkedCount = 0;
  let noRawItemCount = 0;
  let deadlineExpiredCount = 0;
  let summaryExpiredCount = 0;
  let cleanerExpiredCount = 0;

  for (const opp of published) {
    checkedCount++;
    let shouldArchive = false;
    let archiveReason = "";

    // Check 1: deadlineAt < today
    if (opp.deadlineAt && opp.deadlineAt < now) {
      shouldArchive = true;
      archiveReason = `deadline passed (${opp.deadlineAt.toISOString()})`;
      deadlineExpiredCount++;
    }

    // Check 2: Summary/title contains expired keywords
    if (!shouldArchive) {
      const combinedText = `${opp.title} ${opp.summary}`;
      const hasKeywords = hasExpiredKeywords(combinedText);
      
      // Debug logging
      if (checkedCount <= 3) {
        console.log(
          `   🔍 Summary check for "${opp.title.substring(0, 40)}":`
        );
        console.log(`      Summary length: ${opp.summary.length}`);
        console.log(`      Contains expired keywords: ${hasKeywords}`);
        if (hasKeywords) {
          console.log(`      Summary: "${opp.summary.substring(0, 200)}"`);
        }
      }
      
      if (hasKeywords) {
        shouldArchive = true;
        archiveReason = "summary/title contains expired keywords";
        summaryExpiredCount++;
      }
    }

    // Check 3: Try to find raw item and re-validate with Cleaner
    if (!shouldArchive) {
      try {
        // Try exact URL match first
        let rawItem = await RawItem.findOne({
          url: opp.officialUrl,
        }).sort({ createdAt: -1 });

        // If not found, try canonicalized URL
        if (!rawItem) {
          const canonicalUrl = canonicalizeUrl(opp.officialUrl);
          rawItem = await RawItem.findOne({
            url: canonicalUrl,
          }).sort({ createdAt: -1 });
        }

        // If still not found, try partial match (hostname + pathname)
        if (!rawItem) {
          try {
            const urlObj = new URL(opp.officialUrl);
            const pathname = urlObj.pathname;
            rawItem = await RawItem.findOne({
              url: { $regex: pathname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") },
            }).sort({ createdAt: -1 });
          } catch {
            // URL parsing failed, skip
          }
        }

        if (rawItem && rawItem.content) {
          let contentToCheck = rawItem.content;
          
          // If RawItem content is too short (< 500 chars), try to fetch full page
          if (rawItem.content.length < 500 && opp.officialUrl) {
            if (checkedCount <= 3) {
              console.log(
                `   🔄 RawItem content too short (${rawItem.content.length} chars), fetching full page...`
              );
            }
            const fullContent = await fetchFullPageContent(opp.officialUrl);
            if (fullContent && fullContent.length > rawItem.content.length) {
              contentToCheck = fullContent;
              if (checkedCount <= 3) {
                console.log(`   ✅ Fetched full content: ${fullContent.length} chars`);
              }
            }
          }

          // Debug: Check if content contains "ολοκληρώθηκαν"
          const hasCompletedKeyword = contentToCheck.toLowerCase().includes("ολοκληρώθηκαν");
          if (checkedCount <= 3) {
            console.log(
              `   🔍 RawItem found for "${opp.title.substring(0, 40)}":`
            );
            console.log(`      Content length: ${contentToCheck.length}`);
            console.log(`      Contains "ολοκληρώθηκαν": ${hasCompletedKeyword}`);
            if (hasCompletedKeyword) {
              const snippet = contentToCheck
                .toLowerCase()
                .indexOf("ολοκληρώθηκαν");
              console.log(
                `      Snippet: "${contentToCheck.substring(Math.max(0, snippet - 50), snippet + 150)}"`
              );
            }
          }

          // Also check raw content for expired keywords (more comprehensive)
          if (hasExpiredKeywords(contentToCheck)) {
            shouldArchive = true;
            archiveReason = "RawItem content contains expired keywords";
            summaryExpiredCount++;
          } else {
            // Get source URL from opportunity or use a default
            const sourceUrl = opp.source || "";
            
            const cleanerInput: CleanerInput = {
              nowIso: new Date().toISOString(),
              source: opp.source || "unknown",
              sourceUrl: sourceUrl,
              itemUrl: opp.officialUrl,
              rawTitle: opp.title,
              rawContent: contentToCheck,
              rawFetchedAtIso: rawItem?.createdAt?.toISOString() || new Date().toISOString(),
            };

            const cleaned = cleanAndValidate(cleanerInput);

            // Debug: log first few opportunities to see what Cleaner returns
            if (checkedCount <= 3) {
              console.log(
                `   🔍 Cleaner result: applicationStatus=${cleaned.applicationStatus}, status=${cleaned.status}`
              );
              console.log(
                `      applicationEndAt: ${cleaned.applicationEndAt || "null"}`
              );
            }

            // If Cleaner says it's expired or should be archived, archive it
            if (
              cleaned.applicationStatus === "expired" ||
              cleaned.status === "archived" ||
              cleaned.status === "rejected"
            ) {
              shouldArchive = true;
              archiveReason =
                cleaned.applicationStatus === "expired" 
                  ? "Cleaner detected expiry"
                  : cleaned.status === "archived"
                  ? "Cleaner marked as archived"
                  : "Cleaner marked as rejected";
              cleanerExpiredCount++;
            }
          }
        } else {
          noRawItemCount++;
          // Log which opportunities don't have RawItem for debugging
          if (checkedCount <= 5) {
            console.log(
              `   ⚠️  No RawItem for: ${opp.title.substring(0, 50)}... (${opp.officialUrl.substring(0, 60)}...)`
            );
          }
        }
      } catch (error) {
        console.error(
          `⚠️  Error checking opportunity ${opp._id}:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    // Archive if needed
    if (shouldArchive) {
      await Opportunity.updateOne(
        { _id: opp._id },
        {
          $set: {
            status: "archived",
          },
        }
      );
      archivedCount++;
      console.log(
        `✅ Archived: ${opp.title.substring(0, 60)}... (${archiveReason})`
      );
    }

    // Progress indicator
    if (checkedCount % 10 === 0) {
      console.log(`⏳ Checked ${checkedCount}/${published.length}...`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Total checked: ${checkedCount}`);
  console.log(`   Archived: ${archivedCount}`);
  console.log(`   - Deadline expired: ${deadlineExpiredCount}`);
  console.log(`   - Summary keywords: ${summaryExpiredCount}`);
  console.log(`   - Cleaner detected: ${cleanerExpiredCount}`);
  console.log(`   - No RawItem found: ${noRawItemCount}`);
}

export default archiveExpired;

archiveExpired().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
