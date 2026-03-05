/**
 * Script to check draft opportunities and why they're not published
 * Usage: npm run cli check:drafts
 */

import { connectMongo } from "../db/mongo";
import { Opportunity } from "../models/opportunity.model";

export default async function main() {
  console.log("🔄 Connecting to MongoDB...");
  await connectMongo();
  console.log("✅ Connected\n");

  const drafts = await Opportunity.find({
    status: "draft",
    deletedAt: null,
  })
    .sort({ createdAt: -1 })
    .limit(10);

  console.log(`📋 Found ${drafts.length} draft opportunities (showing first 10):\n`);

  for (const draft of drafts) {
    console.log(`─ ${draft.title}`);
    console.log(`  Source: ${draft.source}`);
    console.log(`  Kind: ${draft.kind || "N/A"} | Type: ${draft.type || "N/A"}`);
    console.log(`  Confidence: ${(draft.confidence || 0).toFixed(2)}`);
    console.log(`  Deadline: ${draft.deadlineAt || "N/A"}`);
    console.log(`  Status: ${draft.status}`);
    console.log(`  URL: ${draft.officialUrl}`);
    console.log();
  }

  if (drafts.length === 0) {
    console.log("✅ No draft opportunities found.");
  } else {
    console.log("💡 Tip: Check the cleaner logic to see why these are in draft status.");
    console.log("   They might need manual review or the cleaner rules might be too strict.");
  }

  process.exit(0);
}

