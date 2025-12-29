import { Job } from "bullmq";
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
    $("script, style").remove();
    const content = $("main, article, .content, body").text().trim();
    return content || null;
  } catch (error) {
    console.error(
      `Failed to fetch ${url}:`,
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

export async function archiveExpiredOpportunitiesJob(job: Job): Promise<void> {
  console.log(
    `🔍 [Archive] Starting archive expired opportunities check (job ${job.id})...`
  );

  const today = new Date().toISOString();
  const now = new Date();

  // Find all published opportunities
  const published = await Opportunity.find({
    status: "published",
    deletedAt: null,
  });

  console.log(`📊 [Archive] Found ${published.length} published opportunities`);

  let archivedCount = 0;
  let checkedCount = 0;
  let noRawItemCount = 0;
  let deadlineExpiredCount = 0;
  let summaryExpiredCount = 0;
  let cleanerExpiredCount = 0;

  for (const opp of published) {
    checkedCount++;
    let shouldArchive = false;

    // Check 1: deadlineAt < today
    if (opp.deadlineAt && opp.deadlineAt < now) {
      shouldArchive = true;
      deadlineExpiredCount++;
    }

    // Check 2: Summary/title contains expired keywords
    if (!shouldArchive) {
      const combinedText = `${opp.title} ${opp.summary}`;
      if (hasExpiredKeywords(combinedText)) {
        shouldArchive = true;
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
            const fullContent = await fetchFullPageContent(opp.officialUrl);
            if (fullContent && fullContent.length > rawItem.content.length) {
              contentToCheck = fullContent;
            }
          }

          // Check raw content for expired keywords
          if (hasExpiredKeywords(contentToCheck)) {
            shouldArchive = true;
            summaryExpiredCount++;
          } else {
            const nowIso = new Date().toISOString();
            const cleanerInput: CleanerInput = {
              nowIso: nowIso,
              source: opp.source,
              sourceUrl: opp.officialUrl,
              itemUrl: opp.officialUrl,
              rawTitle: opp.title,
              rawContent: contentToCheck,
              rawFetchedAtIso: nowIso,
            };

            const cleaned = cleanAndValidate(cleanerInput);

            // If Cleaner says it should be archived/rejected or is expired/closed, archive it
            if (
              cleaned.status === "archived" ||
              cleaned.status === "rejected" ||
              cleaned.applicationStatus === "expired" ||
              cleaned.applicationStatus === "closed"
            ) {
              shouldArchive = true;
              cleanerExpiredCount++;
            }
          }
        } else {
          noRawItemCount++;
        }
      } catch (error) {
        console.error(
          `⚠️  [Archive] Error checking opportunity ${opp._id}:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    // Archive if needed
    if (shouldArchive) {
      await Opportunity.updateOne(
        { _id: opp._id },
        { $set: { status: "archived" } }
      );
      archivedCount++;
    }
  }

  console.log(
    `✅ [Archive] Completed: archived ${archivedCount}/${checkedCount} opportunities`
  );
  console.log(
    `   Breakdown: deadline=${deadlineExpiredCount}, summary=${summaryExpiredCount}, cleaner=${cleanerExpiredCount}, noRawItem=${noRawItemCount}`
  );
}
