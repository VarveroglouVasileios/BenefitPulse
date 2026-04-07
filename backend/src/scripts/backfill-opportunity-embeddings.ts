import { connectMongo, disconnectMongo } from "../db/mongo";
import { Opportunity } from "../models/opportunity.model";
import { embeddingService } from "../modules/opportunities/embedding.service";

async function run(): Promise<void> {
  await connectMongo();

  const batchSize = Math.max(1, parseInt(process.env.BACKFILL_BATCH_SIZE || "50", 10));
  const limitArg = parseInt(process.env.BACKFILL_LIMIT || "0", 10);
  const query: any = {
    deletedAt: null,
    $or: [{ embedding: { $exists: false } }, { embedding: { $size: 0 } }],
  };

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  console.log("🔎 Starting opportunity embeddings backfill...");
  console.log(`   Batch size: ${batchSize}`);
  if (limitArg > 0) {
    console.log(`   Limit: ${limitArg}`);
  }

  while (true) {
    const remaining = limitArg > 0 ? Math.max(0, limitArg - processed) : batchSize;
    if (remaining === 0) break;

    const docs = await Opportunity.find(query)
      .sort({ publishedAt: -1 })
      .limit(Math.min(batchSize, remaining))
      .select("_id title summary tags source embedding");

    if (!docs.length) break;

    for (const opp of docs) {
      processed++;
      try {
        const embedding = await embeddingService.embedOpportunity({
          title: opp.title,
          summary: opp.summary,
          tags: opp.tags,
          source: opp.source,
        });

        if (!embedding || embedding.length === 0) {
          skipped++;
          continue;
        }

        await Opportunity.updateOne(
          { _id: opp._id },
          { $set: { embedding } },
        );
        updated++;
      } catch (error: any) {
        failed++;
        console.warn(
          `⚠️  Failed embedding for ${opp._id}: ${error?.message || "unknown error"}`,
        );
      }
    }

    console.log(
      `   Progress — processed=${processed}, updated=${updated}, skipped=${skipped}, failed=${failed}`,
    );
  }

  console.log("\n✅ Backfill finished.");
  console.log(`   Processed: ${processed}`);
  console.log(`   Updated:   ${updated}`);
  console.log(`   Skipped:   ${skipped}`);
  console.log(`   Failed:    ${failed}`);
}

run()
  .catch((error) => {
    console.error("❌ Backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectMongo();
  });
