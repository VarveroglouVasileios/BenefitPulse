/**
 * Script to re-process opportunities with missing dates or "unknown" status
 * Specifically targets opportunities with "Λήγουν στις" patterns in titles
 * 
 * Usage: npm run cli reprocess:dates
 */

import { connectMongo } from "../db/mongo";
import { Opportunity } from "../models/opportunity.model";
import { RawItem } from "../models/rawItem.model";
import { cleanAndValidate } from "../modules/ingestion/cleaner";
import { extractOpportunity } from "../modules/ingestion/extractor";
import { parseDate, normalizeDate } from "../utils/date-parser";

interface ReprocessStats {
  total: number;
  processed: number;
  updated: number;
  errors: number;
  updatedOpportunities: Array<{
    id: string;
    title: string;
    oldDeadline: Date | null;
    newDeadline: Date | null;
    oldStatus: string;
    newStatus: string;
  }>;
}

export async function reprocessDateExtraction(): Promise<ReprocessStats> {
  await connectMongo();

  console.log("🔄 Re-processing opportunities with date extraction improvements...\n");

  const stats: ReprocessStats = {
    total: 0,
    processed: 0,
    updated: 0,
    errors: 0,
    updatedOpportunities: [],
  };

  const now = new Date();

  // Find opportunities that need re-processing:
  // 1. Have "Λήγουν στις" or "λήγουν στις" in title (specific pattern we fixed)
  // 2. OR have applicationStatus: "unknown" or null
  // 3. OR have deadlineAt: null but title/content suggests a deadline
  // 4. OR are old (published > 3 months ago) with null deadline
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const opportunities = await Opportunity.find({
    deletedAt: null,
    status: "published", // Only process published opportunities
    $or: [
      { title: { $regex: /λήγουν\s+στις|λήγει\s+στις/i } },
      { "criteriaJson.applicationStatus": { $in: ["unknown", null] } },
      { 
        deadlineAt: null,
        applicationEndAt: null,
        $or: [
          { title: { $regex: /(?:λήγει|λήγουν|έως|μέχρι|προθεσμία|λήξη)/i } },
          { summary: { $regex: /(?:λήγει|λήγουν|έως|μέχρι|προθεσμία|λήξη)/i } }
        ]
      },
      {
        deadlineAt: null,
        applicationEndAt: null,
        publishedAt: { $lt: threeMonthsAgo }
      }
    ],
  }).limit(200); // Process more opportunities

  stats.total = opportunities.length;
  console.log(`📊 Found ${stats.total} opportunities to re-process\n`);

  for (const opp of opportunities) {
    try {
      stats.processed++;

      // Find corresponding RawItem
      const rawItem = await RawItem.findOne({ 
        url: opp.officialUrl 
      }).sort({ createdAt: -1 });

      if (!rawItem || !rawItem.content) {
        console.log(`  ⏭️  Skipping: No raw content for "${opp.title.substring(0, 50)}..."`);
        continue;
      }

      // Re-run cleaner with improved date extraction
      const cleaned = cleanAndValidate({
        nowIso: now.toISOString(),
        source: opp.source || "",
        sourceUrl: opp.officialUrl,
        itemUrl: opp.officialUrl,
        rawTitle: rawItem.title || opp.title,
        rawContent: rawItem.content,
        rawFetchedAtIso: rawItem.createdAt.toISOString(),
        rawHtmlHints: rawItem.metadata || {},
      });

      // Re-run AI extractor for better extraction
      const extracted = await extractOpportunity(
        `${rawItem.title}\n\n${rawItem.content}`
      );

      // Determine old dates
      const oldDeadline: Date | null = opp.deadlineAt || opp.applicationEndAt || null;
      let newDeadline: Date | null = null;

      // Priority: cleaned dates (ISO strings) > extracted dates (Date objects) > old dates
      if (cleaned.deadlineAt) {
        // cleaned.deadlineAt is an ISO string, parse it
        const parsed = parseDate(cleaned.deadlineAt);
        if (parsed.date) {
          newDeadline = normalizeDate(parsed.date);
        }
      } else if (cleaned.applicationEndAt) {
        // cleaned.applicationEndAt is an ISO string, parse it
        const parsed = parseDate(cleaned.applicationEndAt);
        if (parsed.date) {
          newDeadline = normalizeDate(parsed.date);
        }
      } else if (extracted.deadlineAt) {
        // extracted.deadlineAt is already a Date object
        newDeadline = normalizeDate(extracted.deadlineAt);
      }

      // Determine new status - compare deadline with current date
      const oldStatus = (opp.criteriaJson as any)?.applicationStatus || "unknown";
      let newStatus = cleaned.applicationStatus || extracted.criteriaJson?.aiStatus || oldStatus;

      // If we found a deadline, check if it's in the past to set status to "closed"
      if (newDeadline && newDeadline < now) {
        // Deadline has passed - mark as closed
        if (newStatus !== "news" && newStatus !== "results") {
          newStatus = "closed";
        }
      } else if (newDeadline && newDeadline >= now) {
        // Deadline is in the future - mark as open
        if (newStatus === "unknown" || newStatus === "closed") {
          newStatus = "open";
        }
      }

      // Check if anything changed
      const deadlineChanged = newDeadline && (!oldDeadline || Math.abs(oldDeadline.getTime() - newDeadline.getTime()) > 1000); // Allow 1 second difference
      const statusChanged = newStatus !== oldStatus && newStatus !== "unknown"; // Only update if new status is not unknown

      if (deadlineChanged || statusChanged) {
        stats.updated++;

        // Update opportunity
        if (newDeadline) {
          opp.deadlineAt = newDeadline;
          opp.applicationEndAt = newDeadline;
        }

        // Update criteriaJson
        const currentCriteriaJson = opp.criteriaJson || {};
        opp.criteriaJson = {
          ...currentCriteriaJson,
          applicationStatus: newStatus,
          aiKind: extracted.criteriaJson?.aiKind,
          aiStatus: extracted.criteriaJson?.aiStatus,
        };

        // Update applicationStatus field (if exists)
        if ((opp as any).applicationStatus !== undefined) {
          (opp as any).applicationStatus = newStatus;
        }

        // Update status if needed
        if (newStatus === "closed" || newStatus === "expired") {
          // Don't auto-archive, just mark as closed
          // Status stays "published" so it can be shown in "archived" tab
        }

        opp.updatedAt = new Date();
        await opp.save();

        stats.updatedOpportunities.push({
          id: opp._id.toString(),
          title: opp.title,
          oldDeadline: oldDeadline || null,
          newDeadline: newDeadline || null,
          oldStatus,
          newStatus,
        });

        console.log(`\n✅ Updated: "${opp.title.substring(0, 60)}..."`);
        console.log(`   Deadline: ${oldDeadline ? oldDeadline.toISOString().split('T')[0] : 'null'} → ${newDeadline ? newDeadline.toISOString().split('T')[0] : 'null'}`);
        console.log(`   Status: ${oldStatus} → ${newStatus}`);
      } else {
        console.log(`  ⏭️  No changes: "${opp.title.substring(0, 50)}..."`);
      }

      // Progress indicator
      if (stats.processed % 10 === 0) {
        console.log(`\n⏳ Processed ${stats.processed}/${stats.total}...`);
      }
    } catch (error: any) {
      stats.errors++;
      console.error(`❌ Error processing ${opp._id}:`, error.message);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 REPROCESS SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total found: ${stats.total}`);
  console.log(`Processed: ${stats.processed}`);
  console.log(`Updated: ${stats.updated}`);
  console.log(`Errors: ${stats.errors}`);
  console.log("=".repeat(60) + "\n");

  // Show updated opportunities
  if (stats.updatedOpportunities.length > 0) {
    console.log("📋 Updated opportunities:");
    stats.updatedOpportunities.slice(0, 10).forEach((opp, idx) => {
      console.log(`\n${idx + 1}. ${opp.title.substring(0, 50)}`);
      console.log(`   Deadline: ${opp.oldDeadline ? opp.oldDeadline.toISOString().split('T')[0] : 'null'} → ${opp.newDeadline ? opp.newDeadline.toISOString().split('T')[0] : 'null'}`);
      console.log(`   Status: ${opp.oldStatus} → ${opp.newStatus}`);
    });
  }

  return stats;
}

if (require.main === module) {
  reprocessDateExtraction()
    .then((stats) => {
      console.log("✅ Re-processing completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Re-processing failed:", error);
      process.exit(1);
    });
}

// Export is already done above with the function declaration

