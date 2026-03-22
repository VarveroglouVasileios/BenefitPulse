import { connectMongo } from "../db/mongo";
import { Source } from "../models/source.model";
import { RawItem } from "../models/rawItem.model";

async function main() {
  await connectMongo();
  
  // Find all sources that have errors
  const failedSources = await Source.find({ 
    lastError: { $exists: true, $ne: "" }
  }).select("name lastError lastFetchedAt enabled").sort({ lastFetchedAt: -1 });

  console.log(`\n${"═".repeat(70)}`);
  console.log(`  ❌ FAILED SOURCES REPORT (ALL)`);
  console.log(`${"═".repeat(70)}`);

  if (failedSources.length === 0) {
    console.log("  ✅ No sources have recorded errors in the database.");
  } else {
    failedSources.forEach((s, i) => {
      const date = s.lastFetchedAt ? new Date(s.lastFetchedAt).toLocaleString("el-GR", { hour12: false }) : "Never";
      const status = s.enabled ? "✅ Enabled" : "❌ Disabled";
      console.log(`  ${i + 1}. 📦 ${s.name} (${status})`);
      console.log(`     ⏰ Last attempt: ${date}`);
      console.log(`     ❌ Error: ${s.lastError}`);
      console.log(`     ${"─".repeat(60)}`);
    });
  }

  // Also check for RawItems with metadata.error (some parsers store it there)
  const failedItems = await RawItem.find({ 
    processed: false,
    "metadata.error": { $exists: true, $ne: "" }
  }).limit(20).sort({ updatedAt: -1 });

  if (failedItems.length > 0) {
    console.log(`\n  ⚠️  RECENT RAW ITEM ERRORS (showing first 20)`);
    console.log(`${"─".repeat(70)}`);
    failedItems.forEach((item, i) => {
      console.log(`  ${i + 1}. 📝 ${item.title || item.hash}`);
      console.log(`     ⏰ Updated: ${new Date(item.updatedAt).toLocaleString("el-GR")}`);
      console.log(`     ❌ Error: ${item.metadata?.error}`);
      console.log(`     ${"─".repeat(60)}`);
    });
  }

  console.log(`${"═".repeat(70)}\n`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
