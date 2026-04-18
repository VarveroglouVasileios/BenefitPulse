import { Job } from "bullmq";
import { Opportunity } from "../models/opportunity.model";
import { RawItem } from "../models/rawItem.model";
import { searchDiavgeia, crossReferenceAsepWithDiavgeia } from "../modules/ingestion/diavgeia";
import { cleanAndValidate, CleanerInput } from "../modules/ingestion/cleaner";
import axios from "axios";
import * as cheerio from "cheerio";
import { ProgressTracker, logPhaseStart } from "../utils/progress";
import { invalidateCache } from "../utils/cache";

export function truncateOneLine(s: string, maxLen: number): string {
  const t = (s || "").replace(/\s+/g, " ").trim();
  return t.length <= maxLen ? t : `${t.slice(0, maxLen - 1)}…`;
}

export function logArchivedOpportunity(
  opp: { _id: unknown; title?: string; officialUrl?: string },
  reason: string,
  extra?: string,
): void {
  const id = String(opp._id);
  const title = truncateOneLine(opp.title || "", 90);
  const url = opp.officialUrl ? truncateOneLine(opp.officialUrl, 80) : "";
  const extraPart = extra ? ` | ${extra}` : "";
  console.log(
    `  📦 ARCHIVED | ${reason}${extraPart} | id=${id}${url ? ` | url=${url}` : ""} | title="${title}"`,
  );
}

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
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "el-GR,el;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "max-age=0",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Referer": url.includes("asep.gr") ? "https://info.asep.gr/" : url
      },
      timeout: 30000, // Increased from 15000 — slow gov sites (espa.gr, etc.) regularly exceed 15s
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
  logPhaseStart("ARCHIVE EXPIRED", "🗄️");

  const now = new Date();

  const published = await Opportunity.find({
    status: "published",
    deletedAt: null,
  });

  console.log(
    `  🗄️  archive-expired-opportunities | jobId=${job.id} | published=${published.length} | runAt=${now.toISOString()}`,
  );

  let archivedCount = 0;
  let checkedCount = 0;
  let noRawItemCount = 0;
  let deadlineExpiredCount = 0;
  let summaryExpiredCount = 0;
  let cleanerExpiredCount = 0;

  const progress = new ProgressTracker({
    label: "Archive Check",
    total: published.length,
    logEvery: Math.max(1, Math.floor(published.length / 10)),
    showItems: false,
  });
  progress.start();

  for (const opp of published) {
    checkedCount++;
    let shouldArchive = false;
    let archiveReason = "";

    // Check 1: deadlineAt or applicationEndAt < today (ALWAYS check this, even if locked)
    if (
      (opp.deadlineAt && opp.deadlineAt < now) ||
      (opp.applicationEndAt && opp.applicationEndAt < now)
    ) {
      shouldArchive = true;
      deadlineExpiredCount++;
      const parts: string[] = [];
      if (opp.deadlineAt && opp.deadlineAt < now) {
        parts.push(`deadlineAt=${opp.deadlineAt.toISOString()}`);
      }
      if (opp.applicationEndAt && opp.applicationEndAt < now) {
        parts.push(`applicationEndAt=${opp.applicationEndAt.toISOString()}`);
      }
      archiveReason = `deadline_passed | ${parts.join(", ")}`;
    }

    // If not archived by deadline but item is locked, skip further probabilistic checks
    if (!shouldArchive && (opp as any).isLocked) {
      progress.tick();
      continue;
    }

    // --- NEW: Diavgeia Cross-referencing ---

    // Check 2: ASEP items (news/results) older than 3 weeks should auto-archive
    if (!shouldArchive) {
      const isAsepSource = opp.source?.toLowerCase().includes("ασεπ") || 
                           opp.source?.toLowerCase().includes("asep");
      const appStatus = (opp as any).applicationStatus || opp.criteriaJson?.applicationStatus;
      const isResultsOrNews = appStatus === "results" || appStatus === "news";
      
      const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
      const publishedDate = opp.publishedAt ? new Date(opp.publishedAt) : null;
      
      if (isAsepSource && isResultsOrNews && publishedDate && publishedDate < threeWeeksAgo) {
        shouldArchive = true;
        summaryExpiredCount++; 
        archiveReason = `asep_stale | appStatus=${appStatus} | publishedAt=${publishedDate.toISOString()} (>21d)`;
      }
    }

    // Check 3: Summary/title contains expired keywords OR past month
    if (!shouldArchive) {
      const combinedText = `${opp.title} ${opp.summary}`;
      if (hasExpiredKeywords(combinedText)) {
        shouldArchive = true;
        summaryExpiredCount++;
        archiveReason = "expired_keywords_in_title_or_summary";
      } else {
        // Run cleaner's title logic directly on Opportunity title
        const nowIso = now.toISOString();
        const titleOnlyCheck = cleanAndValidate({
          nowIso,
          source: opp.source,
          sourceUrl: opp.officialUrl,
          itemUrl: opp.officialUrl,
          rawTitle: opp.title,
          rawContent: "minimal content for title check", // only title matters for month check
          rawFetchedAtIso: nowIso,
        });

        if (titleOnlyCheck.applicationStatus === "expired" || titleOnlyCheck.status === "archived") {
          shouldArchive = true;
          cleanerExpiredCount++;
          archiveReason = `title_cleaner | status=${titleOnlyCheck.status} applicationStatus=${titleOnlyCheck.applicationStatus}`;
        }
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
            const fullContent = await fetchFullPageContent(opp.officialUrl);
            if (fullContent && fullContent.length > rawItem.content.length) {
              contentToCheck = fullContent;
            }
          }

          // Check raw content for expired keywords
          if (hasExpiredKeywords(contentToCheck)) {
            shouldArchive = true;
            summaryExpiredCount++;
            archiveReason = "expired_keywords_in_raw_or_fetched_page";
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
              archiveReason = `raw_cleaner | status=${cleaned.status} applicationStatus=${cleaned.applicationStatus}`;
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
      logArchivedOpportunity(
        opp,
        archiveReason || "unknown_rule",
        opp.source ? `source=${truncateOneLine(opp.source, 60)}` : undefined,
      );
    }

    progress.tick();
  }

  if (archivedCount > 0) {
    console.log(
      `  ✅ Archive run: ${archivedCount} opportunity/opportunities archived (checked ${checkedCount})`,
    );
    // Invalidate feed cache to reflect changes immediately
    await invalidateCache("feed_*");
  } else {
    console.log(`  ℹ️  Archive run: no opportunities moved to archived (checked ${checkedCount})`);
  }
  progress.finish({
    "Archived": archivedCount,
    "Deadline expired": deadlineExpiredCount,
    "Summary expired": summaryExpiredCount,
    "Cleaner expired": cleanerExpiredCount,
    "No raw item": noRawItemCount,
  });
}
