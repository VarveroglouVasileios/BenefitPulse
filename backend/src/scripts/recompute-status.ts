/**
 * Migration script to recompute status for all opportunities
 * 
 * Uses rule-based status engine to recompute applicationStatus and status
 * Quarantines items that changed category (e.g., from open -> closed)
 */

import { connectMongo } from "../db/mongo";
import { Opportunity } from "../models/opportunity.model";
import { computeStatus } from "../utils/status-engine";
import { parseDate, normalizeDate } from "../utils/date-parser";

interface StatusChange {
  opportunityId: string;
  title: string;
  oldApplicationStatus: string;
  newApplicationStatus: string;
  oldStatus: string;
  newStatus: string;
  reason?: string;
}

interface RecomputeStats {
  total: number;
  processed: number;
  changed: number;
  quarantined: number;
  errors: number;
  changes: StatusChange[];
}

/**
 * Extract page signals from opportunity metadata/evidence
 */
function extractPageSignals(opportunity: any): string[] {
  const signals: string[] = [];
  
  // Try to extract from criteriaRulesJson or evidence
  if (opportunity.criteriaRulesJson?.evidence?.statusSignals) {
    signals.push(...opportunity.criteriaRulesJson.evidence.statusSignals);
  }
  if (opportunity.criteriaRulesJson?.evidence?.dateSignals) {
    signals.push(...opportunity.criteriaRulesJson.evidence.dateSignals);
  }
  
  return signals;
}

/**
 * Recompute status for all opportunities
 */
export async function recomputeStatus(dryRun: boolean = false): Promise<RecomputeStats> {
  await connectMongo();

  console.log("🔄 Recomputing status for all opportunities...");
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);

  const stats: RecomputeStats = {
    total: 0,
    processed: 0,
    changed: 0,
    quarantined: 0,
    errors: 0,
    changes: [],
  };

  // Get all opportunities (excluding deleted)
  const opportunities = await Opportunity.find({
    deletedAt: null,
  });

  stats.total = opportunities.length;
  console.log(`📊 Found ${stats.total} opportunities to process\n`);

  const now = new Date();
  const quarantineTag = "status_recomputed";

  for (const opp of opportunities) {
    try {
      stats.processed++;

      // Parse dates (handle string dates from DB)
      const applicationStartAt = opp.applicationStartAt
        ? normalizeDate(opp.applicationStartAt instanceof Date ? opp.applicationStartAt : parseDate(String(opp.applicationStartAt)).date)
        : null;
      const applicationEndAt = opp.applicationEndAt
        ? normalizeDate(opp.applicationEndAt instanceof Date ? opp.applicationEndAt : parseDate(String(opp.applicationEndAt)).date)
        : null;
      const startAt = opp.startAt
        ? normalizeDate(opp.startAt instanceof Date ? opp.startAt : parseDate(String(opp.startAt)).date)
        : null;
      const endAt = opp.deadlineAt
        ? normalizeDate(opp.deadlineAt instanceof Date ? opp.deadlineAt : parseDate(String(opp.deadlineAt)).date)
        : null;
      const publishedAt = opp.publishedAt
        ? normalizeDate(opp.publishedAt instanceof Date ? opp.publishedAt : parseDate(String(opp.publishedAt)).date)
        : null;

      // Extract page signals
      const pageSignals = extractPageSignals(opp);

      // Compute new status
      const newStatus = computeStatus({
        applicationStartAt,
        applicationEndAt,
        startAt,
        endAt,
        publishedAt,
        pageSignals,
        title: opp.title,
      }, now);

      // Get old status (from DB or default)
      const oldApplicationStatus = (opp as any).applicationStatus || "unknown";
      const oldStatus = opp.status || "draft";

      // Check if status changed
      const applicationStatusChanged = oldApplicationStatus !== newStatus.applicationStatus;
      const statusChanged = oldStatus !== newStatus.status;

      if (applicationStatusChanged || statusChanged) {
        stats.changed++;

        const change: StatusChange = {
          opportunityId: opp._id.toString(),
          title: opp.title,
          oldApplicationStatus,
          newApplicationStatus: newStatus.applicationStatus,
          oldStatus,
          newStatus: newStatus.status,
          reason: newStatus.reason,
        };

        stats.changes.push(change);

        console.log(`\n📝 Status changed for: "${opp.title.substring(0, 60)}"`);
        console.log(`   applicationStatus: ${oldApplicationStatus} → ${newStatus.applicationStatus}`);
        console.log(`   status: ${oldStatus} → ${newStatus.status}`);
        console.log(`   reason: ${newStatus.reason}`);

        // Quarantine if category changed significantly
        const categoryChanged = 
          (oldStatus === "published" && newStatus.status === "archived") ||
          (oldStatus === "published" && newStatus.status === "draft") ||
          (oldApplicationStatus === "open" && newStatus.applicationStatus === "closed") ||
          (oldApplicationStatus === "open" && newStatus.applicationStatus === "unknown");

        if (categoryChanged) {
          stats.quarantined++;
          console.log(`   ⚠️  QUARANTINED: Category changed significantly`);

          if (!dryRun) {
            // Add quarantine tag
            if (!opp.tags.includes(quarantineTag)) {
              opp.tags.push(quarantineTag);
            }
          }
        }

        if (!dryRun) {
          // Update opportunity
          (opp as any).applicationStatus = newStatus.applicationStatus;
          opp.status = newStatus.status;
          opp.updatedAt = new Date();
          await opp.save();
        }
      }

      // Progress indicator
      if (stats.processed % 100 === 0) {
        console.log(`\n⏳ Processed ${stats.processed}/${stats.total}...`);
      }
    } catch (error: any) {
      stats.errors++;
      console.error(`❌ Error processing opportunity ${opp._id}:`, error.message);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 RECOMPUTE SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total opportunities: ${stats.total}`);
  console.log(`Processed: ${stats.processed}`);
  console.log(`Changed: ${stats.changed}`);
  console.log(`Quarantined: ${stats.quarantined}`);
  console.log(`Errors: ${stats.errors}`);
  console.log("=".repeat(60) + "\n");

  // Show top changes
  if (stats.changes.length > 0) {
    console.log("📋 Top changes:");
    stats.changes.slice(0, 10).forEach((change, idx) => {
      console.log(`\n${idx + 1}. ${change.title.substring(0, 50)}`);
      console.log(`   applicationStatus: ${change.oldApplicationStatus} → ${change.newApplicationStatus}`);
      console.log(`   status: ${change.oldStatus} → ${change.newStatus}`);
      console.log(`   reason: ${change.reason}`);
    });
  }

  return stats;
}

if (require.main === module) {
  const dryRun = process.argv.includes("--dry-run");
  
  recomputeStatus(dryRun)
    .then((stats) => {
      console.log("✅ Recompute completed!");
      if (dryRun) {
        console.log("\n⚠️  This was a DRY RUN. Use without --dry-run to apply changes.");
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Recompute failed:", error);
      process.exit(1);
    });
}

export { recomputeStatus };

