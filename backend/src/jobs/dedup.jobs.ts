/**
 * dedup.jobs.ts
 *
 * BullMQ job that finds and archives duplicate Opportunity records using
 * token-overlap similarity (≥ 65%). Runs automatically after every ingestion
 * batch (queued by ingestion.jobs.ts) so the feed stays clean without manual
 * intervention.
 *
 * The same algorithm lives in scripts/dedup-opportunities.ts for one-off
 * manual runs. Keep both in sync if the logic changes.
 */

import { Job } from "bullmq";
import mongoose from "mongoose";
import { Opportunity } from "../models/opportunity.model";
import { logPhaseStart } from "../utils/progress";
import { invalidateCache } from "../utils/cache";
import {
  extractTitleTokens,
  haveConflictingTitleYears,
  titleTokenOverlap,
} from "../utils/title-dedup";

// ─── Job ─────────────────────────────────────────────────────────────────────

export async function dedupOpportunitiesJob(job: Job): Promise<{ archivedCount: number }> {
  logPhaseStart("DEDUP", "🔍");

  // Load all non-deleted published/draft opportunities
  const opps = await Opportunity.find({
    status: { $in: ["published", "draft"] },
    deletedAt: null,
  })
    .select("_id title officialUrl sourcePriority sourceType status isLocked")
    .lean();

  console.log(`  📊 Dedup: loaded ${opps.length} active opportunities`);

  if (opps.length === 0) {
    console.log("  ✅ Dedup: nothing to process.");
    return { archivedCount: 0 };
  }

  // Build token sets
  const tokenMap = new Map<string, Set<string>>();
  for (const opp of opps) {
    tokenMap.set(String(opp._id), extractTitleTokens(opp.title));
  }

  const archiveIds = new Set<string>();

  for (let i = 0; i < opps.length; i++) {
    const a   = opps[i];
    const aId = String(a._id);

    if (archiveIds.has(aId)) continue;

    const aTokens = tokenMap.get(aId)!;
    if (aTokens.size < 2) continue;

    for (let j = i + 1; j < opps.length; j++) {
      const b   = opps[j];
      const bId = String(b._id);

      if (archiveIds.has(bId)) continue;
      if (haveConflictingTitleYears(a.title, b.title)) continue;

      const bTokens  = tokenMap.get(bId)!;
      const overlap  = titleTokenOverlap(aTokens, bTokens);
      if (overlap < 0.65) continue;

      const aLocked = Boolean((a as any).isLocked);
      const bLocked = Boolean((b as any).isLocked);
      if (aLocked && bLocked) {
        console.warn(
          `  ⚠️  DUPLICATE LOCKED PAIR: keeping both "${a.title}" / "${b.title}"`,
        );
        continue;
      }

      // A locked canonical record always survives; otherwise keep the
      // higher-priority source (lower number = better).
      const aPriority = (a as any).sourcePriority ?? 3;
      const bPriority = (b as any).sourcePriority ?? 3;

      let keepId: string, archiveId: string;
      let keepTitle: string, archiveTitle: string;

      if (aLocked || (!bLocked && aPriority <= bPriority)) {
        keepId = aId;  archiveId = bId;
        keepTitle = a.title; archiveTitle = b.title;
      } else {
        keepId = bId;  archiveId = aId;
        keepTitle = b.title; archiveTitle = a.title;
      }

      console.log(
        `  ⚠️  DUPLICATE (${(overlap * 100).toFixed(0)}% overlap):\n` +
        `     ✅ KEEP    [${keepId}] "${keepTitle.substring(0, 70)}"\n` +
        `     🗑️  ARCHIVE [${archiveId}] "${archiveTitle.substring(0, 70)}"`
      );

      archiveIds.add(archiveId);
      if (archiveId === aId) {
        // Never continue comparing through a representative already discarded;
        // token overlap is not transitive.
        break;
      }
    }
  }

  if (archiveIds.size === 0) {
    console.log("  ✅ Dedup: no duplicates found — nothing to archive.");
    return { archivedCount: 0 };
  }

  console.log(`\n  📦 Dedup: archiving ${archiveIds.size} duplicate(s)...`);

  const result = await Opportunity.updateMany(
    { _id: { $in: [...archiveIds].map((id) => new mongoose.Types.ObjectId(id)) } },
    {
      $set: {
        status: "archived",
        rejectionReason: "Duplicate of higher-priority entry (auto-dedup post-ingestion)",
        updatedAt: new Date(),
      },
    }
  );

  console.log(`  ✅ Dedup: archived ${result.modifiedCount} duplicate opportunities.`);

  if (result.modifiedCount > 0) {
    await invalidateCache("feed_*");
  }

  return { archivedCount: result.modifiedCount };
}
