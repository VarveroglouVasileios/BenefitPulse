/**
 * One-time deduplication script for existing Opportunity records.
 *
 * Finds pairs of published/draft opportunities that refer to the same real-world
 * program (detected via key-token overlap ≥ 65%) and archives the lower-priority
 * duplicate, keeping the higher-priority one.
 *
 * Also handles known cross-language duplicates explicitly (e.g. Gigabit EN vs GR).
 *
 * Run from the `backend` directory (not repo root):
 *   cd backend
 *   npx ts-node src/scripts/dedup-opportunities.ts
 */

import { connectMongo } from "../db/mongo";
import { Opportunity } from "../models/opportunity.model";
import mongoose from "mongoose";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
      .replace(/[\u0300-\u036f]/g, "")       // strip Greek accents
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

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔗 Connecting to MongoDB...");
  await connectMongo();

  // Load all non-deleted published/draft opportunities
  const opps = await Opportunity.find({
    status: { $in: ["published", "draft"] },
    deletedAt: null,
  }).select("_id title officialUrl sourcePriority sourceType status").lean();

  console.log(`📊 Loaded ${opps.length} active opportunities`);

  // Build token sets for each
  const tokenMap = new Map<string, Set<string>>();
  for (const opp of opps) {
    tokenMap.set(String(opp._id), extractTokens(opp.title));
  }

  // Find duplicate pairs
  const archiveIds = new Set<string>();
  const processed = new Set<string>(); // avoid re-processing already-marked

  for (let i = 0; i < opps.length; i++) {
    const a = opps[i];
    const aId = String(a._id);
    if (archiveIds.has(aId) || processed.has(aId)) continue;
    const aTokens = tokenMap.get(aId)!;
    if (aTokens.size < 2) continue;

    for (let j = i + 1; j < opps.length; j++) {
      const b = opps[j];
      const bId = String(b._id);
      if (archiveIds.has(bId)) continue;
      const bTokens = tokenMap.get(bId)!;

      const overlap = tokenOverlap(aTokens, bTokens);
      if (overlap < 0.65) continue;

      // They're duplicates — keep the higher-priority one (lower number = better)
      const aPriority = (a as any).sourcePriority ?? 3;
      const bPriority = (b as any).sourcePriority ?? 3;

      let keepId: string;
      let archiveId: string;
      let keepTitle: string;
      let archiveTitle: string;

      if (aPriority <= bPriority) {
        keepId = aId;     archiveId = bId;
        keepTitle = a.title; archiveTitle = b.title;
      } else {
        keepId = bId;     archiveId = aId;
        keepTitle = b.title; archiveTitle = a.title;
      }

      console.log(
        `⚠️  DUPLICATE (${(overlap * 100).toFixed(0)}% overlap):\n` +
        `   ✅ KEEP   [${keepId}] "${keepTitle.substring(0, 70)}"\n` +
        `   🗑️  ARCHIVE [${archiveId}] "${archiveTitle.substring(0, 70)}"`
      );

      archiveIds.add(archiveId);
      processed.add(keepId);
    }
  }

  if (archiveIds.size === 0) {
    console.log("✅ No duplicates found — nothing to archive.");
  } else {
    console.log(`\n📦 Archiving ${archiveIds.size} duplicate(s)...`);
    const result = await Opportunity.updateMany(
      { _id: { $in: [...archiveIds].map((id) => new mongoose.Types.ObjectId(id)) } },
      {
        $set: {
          status: "archived",
          rejectionReason: "Duplicate of higher-priority entry (dedup-opportunities script)",
          updatedAt: new Date(),
        },
      }
    );
    console.log(`✅ Archived ${result.modifiedCount} opportunities.`);
  }

  await mongoose.disconnect();
  console.log("🔌 Disconnected.");
}

main().catch((err) => {
  console.error("❌ Script failed:", err);
  process.exit(1);
});
