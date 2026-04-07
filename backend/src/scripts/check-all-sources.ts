/**
 * Check health for all enabled sources from DB.
 * Usage: npm run cli check:health
 */

import { connectMongo } from "../db/mongo";
import { Source } from "../models/source.model";
import { checkSourceHealth } from "../modules/ingestion/source-health-check";

export default async function main() {
  console.log("🔄 Connecting to MongoDB...");
  await connectMongo();

  const sources = await Source.find({ enabled: true })
    .select("name url type enabled")
    .sort({ name: 1 })
    .lean();

  console.log(`\n🔍 Checking ${sources.length} enabled sources...\n`);

  let healthyCount = 0;
  let failedCount = 0;

  for (const source of sources) {
    process.stdout.write(`  📡 Checking ${source.name.padEnd(45)} ... `);
    try {
      const result = await checkSourceHealth(source.url, source.type);
      if (result.healthy) {
        healthyCount++;
        console.log(
          `✅ OK${result.replacementUrl ? ` (Rewritten to ${result.replacementUrl})` : ""}`,
        );
      } else {
        failedCount++;
        console.log(`❌ FAILED: ${result.reason}`);
      }
    } catch (error) {
      failedCount++;
      const message = error instanceof Error ? error.message : String(error);
      console.log(`❌ ERROR: ${message}`);
    }
  }

  console.log("\n📊 Health Summary");
  console.log(`   Healthy: ${healthyCount}`);
  console.log(`   Failed: ${failedCount}`);
  process.exit(0);
}
