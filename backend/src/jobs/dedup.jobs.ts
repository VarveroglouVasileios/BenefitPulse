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

// ─── Helpers (mirrors dedup-opportunities.ts) ────────────────────────────────

function extractTokens(title: string): Set<string> {
  const stopWords = new Set([
    "το", "τα", "τον", "την", "τους", "τις", "ο", "η", "οι",
    "για", "και", "της", "του", "στο", "στη", "στον", "στην",
    "με", "απο", "προγραμμα", "program", "the", "for", "a", "an", "of",
    "νεο", "new", "νεα", "δραση", "δρασης",
  ]);
  return new Set(
    title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")        // strip Greek accents
      .replace(/[«»"'()\[\]{}\-–—]/g, " ")
      .split(/\s+/)
      .filter((tok) => tok.length >= 4 && !stopWords.has(tok))
  );
}

function tokenOverlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const shared = [...a].filter((t) => b.has(t)).length;
  return shared / Math.min(a.size, b.size);
}

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
    tokenMap.set(String(opp._id), extractTokens(opp.title));
  }

  const archiveIds = new Set<string>();
  const processed  = new Set<string>();

  for (let i = 0; i < opps.length; i++) {
    const a   = opps[i];
    const aId = String(a._id);

    // Skip locked records — they should never be auto-modified
    if ((a as any).isLocked) continue;
    if (archiveIds.has(aId) || processed.has(aId)) continue;

    const aTokens = tokenMap.get(aId)!;
    if (aTokens.size < 2) continue;

    for (let j = i + 1; j < opps.length; j++) {
      const b   = opps[j];
      const bId = String(b._id);

      if (archiveIds.has(bId)) continue;
      if ((b as any).isLocked) continue;

      const bTokens  = tokenMap.get(bId)!;
      const overlap  = tokenOverlap(aTokens, bTokens);
      if (overlap < 0.65) continue;

      // Keep the higher-priority source (lower number = better: 1=API, 2=RSS, 3=HTML)
      const aPriority = (a as any).sourcePriority ?? 3;
      const bPriority = (b as any).sourcePriority ?? 3;

      let keepId: string, archiveId: string;
      let keepTitle: string, archiveTitle: string;

      if (aPriority <= bPriority) {
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
      processed.add(keepId);
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
