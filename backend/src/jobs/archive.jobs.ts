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
 * Returns object with content and dead link status
 */
async function fetchFullPageContent(
  url: string
): Promise<{ content: string | null; isDead: boolean }> {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 10000,
      validateStatus: (status) => status < 500, // Don't throw on 4xx
    });

    // Check for dead links (404, 410)
    if (response.status === 404 || response.status === 410) {
      return { content: null, isDead: true };
    }

    const $ = cheerio.load(response.data);
    $("script, style").remove();
    const content = $("main, article, .content, body").text().trim();

    // Mitigate SPA/Empty Content Issues: if content is extremely small (< 50 chars),
    // treat as failed fetch but not dead (Zombie Killer will eventually clean these up)
    if (content.length < 50) {
      return { content: null, isDead: false };
    }

    return { content: content || null, isDead: false };
  } catch (error: any) {
    // Check if it's a 404/410 error in the catch block
    if (error.response?.status === 404 || error.response?.status === 410) {
      return { content: null, isDead: true };
    }

    console.error(
      `Failed to fetch ${url}:`,
      error instanceof Error ? error.message : error
    );
    return { content: null, isDead: false };
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
  let deadLinkCount = 0;
  let zombieKilledCount = 0;

  // Calculate 6 months ago for Zombie Killer
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  for (const opp of published) {
    checkedCount++;
    let shouldArchive = false;
    let archiveReason = "";

    // Check 1: deadlineAt < today
    if (opp.deadlineAt && opp.deadlineAt < now) {
      shouldArchive = true;
      archiveReason = "deadline expired";
      deadlineExpiredCount++;
    }

    // Check 2: Zombie Killer - opportunities published > 6 months ago without deadline
    if (!shouldArchive) {
      if (
        opp.publishedAt &&
        opp.publishedAt < sixMonthsAgo &&
        (!opp.deadlineAt || opp.deadlineAt === null)
      ) {
        shouldArchive = true;
        archiveReason =
          "Zombie safety net hit (published > 6 months ago without deadline)";
        zombieKilledCount++;
        console.log(
          `🧟 [Archive] Zombie Killer: Archiving opportunity ${
            opp._id
          } (${opp.title.substring(0, 50)}...) - ${archiveReason}`
        );
      }
    }

    // Check 3: Summary/title contains expired keywords
    if (!shouldArchive) {
      const combinedText = `${opp.title} ${opp.summary}`;
      if (hasExpiredKeywords(combinedText)) {
        shouldArchive = true;
        archiveReason = "expired keywords in summary/title";
        summaryExpiredCount++;
      }
    }

    // Check 4: Try to find raw item and re-validate with Cleaner
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
            const fetchResult = await fetchFullPageContent(opp.officialUrl);

            // Handle dead links (404/410)
            if (fetchResult.isDead) {
              shouldArchive = true;
              archiveReason = "dead link (404/410)";
              deadLinkCount++;
              console.log(
                `💀 [Archive] Dead link detected: Archiving opportunity ${
                  opp._id
                } (${opp.title.substring(0, 50)}...) - ${opp.officialUrl}`
              );
            } else if (
              fetchResult.content &&
              fetchResult.content.length > rawItem.content.length
            ) {
              contentToCheck = fetchResult.content;
            }
          }

          // Check raw content for expired keywords (only if not already marked for archive)
          if (!shouldArchive && hasExpiredKeywords(contentToCheck)) {
            shouldArchive = true;
            archiveReason = "expired keywords in content";
            summaryExpiredCount++;
          } else if (!shouldArchive) {
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
              archiveReason = `cleaner detected: ${cleaned.status}/${cleaned.applicationStatus}`;
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
      if (archiveReason) {
        console.log(`📦 [Archive] Archived ${opp._id}: ${archiveReason}`);
      }
    }
  }

  console.log(
    `✅ [Archive] Completed: archived ${archivedCount}/${checkedCount} opportunities`
  );
  console.log(
    `   Breakdown: deadline=${deadlineExpiredCount}, summary=${summaryExpiredCount}, cleaner=${cleanerExpiredCount}, deadLink=${deadLinkCount}, zombie=${zombieKilledCount}, noRawItem=${noRawItemCount}`
  );
}
