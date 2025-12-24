/**
 * Script to check sources and raw items status
 * Usage: npm run cli check:sources
 */

import { connectMongo } from "../db/mongo";
import { Source } from "../models/source.model";
import { RawItem } from "../models/rawItem.model";
import { Opportunity } from "../models/opportunity.model";

export default async function main() {
  console.log("🔄 Connecting to MongoDB...");
  await connectMongo();
  console.log("✅ Connected\n");

  // Check sources
  const allSources = await Source.find({}).sort({ name: 1 });
  const enabledSources = allSources.filter((s) => s.enabled);
  const disabledSources = allSources.filter((s) => !s.enabled);

  console.log(`📊 Sources Status:`);
  console.log(`   Total: ${allSources.length}`);
  console.log(`   Enabled: ${enabledSources.length}`);
  console.log(`   Disabled: ${disabledSources.length}\n`);

  if (enabledSources.length > 0) {
    console.log("✅ Enabled Sources:");
    for (const source of enabledSources) {
      console.log(`   - ${source.name} (${source.type})`);
      console.log(`     URL: ${source.url}`);
      console.log(`     Last fetched: ${source.lastFetchedAt || "Never"}\n`);
    }
  }

  if (disabledSources.length > 0) {
    console.log("❌ Disabled Sources:");
    for (const source of disabledSources) {
      console.log(`   - ${source.name} (${source.type})`);
    }
    console.log();
  }

  // Check raw items
  const totalRawItems = await RawItem.countDocuments({});
  const processedRawItems = await RawItem.countDocuments({ processed: true });
  const unprocessedRawItems = await RawItem.countDocuments({ processed: false });

  console.log(`📦 Raw Items Status:`);
  console.log(`   Total: ${totalRawItems}`);
  console.log(`   Processed: ${processedRawItems}`);
  console.log(`   Unprocessed: ${unprocessedRawItems}\n`);

  // Check opportunities
  const totalOpps = await Opportunity.countDocuments({ deletedAt: null });
  const publishedOpps = await Opportunity.countDocuments({
    status: "published",
    deletedAt: null,
  });
  const draftOpps = await Opportunity.countDocuments({
    status: "draft",
    deletedAt: null,
  });
  const archivedOpps = await Opportunity.countDocuments({
    status: "archived",
    deletedAt: null,
  });

  console.log(`🎯 Opportunities Status:`);
  console.log(`   Total: ${totalOpps}`);
  console.log(`   Published: ${publishedOpps}`);
  console.log(`   Draft: ${draftOpps}`);
  console.log(`   Archived: ${archivedOpps}\n`);

  if (unprocessedRawItems > 0) {
    console.log(`⚠️  Warning: ${unprocessedRawItems} raw items are waiting to be processed.`);
    console.log(`   Run ingestion to process them.`);
  }

  if (publishedOpps === 0 && totalOpps > 0) {
    console.log(`⚠️  Warning: No published opportunities found.`);
    console.log(`   Check draft/archived opportunities or run ingestion to get new data.`);
  }

  process.exit(0);
}



