import { connectMongo } from "../db/mongo";
import { Source } from "../models/source.model";

async function main() {
  await connectMongo();
  
  console.log("🔄 Fetching disabled sources...");
  
  const disabledSources = await Source.find({ enabled: false });
  
  if (disabledSources.length === 0) {
    console.log("✅ No disabled sources found.");
    process.exit(0);
  }

  console.log(`📂 Found ${disabledSources.length} disabled sources. Re-enabling...`);

  const result = await Source.updateMany(
    { enabled: false },
    { 
      $set: { 
        enabled: true,
        consecutiveFailures: 0,
        lastError: undefined
      } 
    }
  );

  console.log(`\n${"═".repeat(70)}`);
  console.log(`  ✅ SUCCESS: ${result.modifiedCount} sources re-enabled!`);
  console.log(`  🧹 Errors and failure counters have been reset.`);
  console.log(`  🚀 They will be processed in the next ingestion run.`);
  console.log(`${"═".repeat(70)}\n`);

  process.exit(0);
}

main().catch(err => {
  console.error("❌ Error re-enabling sources:", err);
  process.exit(1);
});
