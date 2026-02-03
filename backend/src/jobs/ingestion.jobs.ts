import { Job } from "bullmq";
import { IngestionService } from "../modules/ingestion/ingestion.service";
import {
  verificationQueue,
  aggregationQueue,
  ingestionQueue,
} from "./queues";
import { Source } from "../models/source.model";

const ingestionService = new IngestionService();

export async function processAllSourcesJob(job: Job): Promise<any> {
  const start = Date.now();
  console.log(`\n================================================================================`);
  console.log(`🚀 [Ingestion] STARTING DISPATCHER (Job ${job.id})`);
  console.log(`================================================================================`);

  // 1. Fetch enabled sources with just _id
  const sources = await Source.find({ enabled: true }).select("_id name");
  console.log(`   📂 Found ${sources.length} enabled sources.`);

  // 2. Create bulk jobs
  const jobs = sources.map((source) => ({
    name: "process-source",
    data: { sourceId: source._id.toString() },
    opts: {
      removeOnComplete: true,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
    },
  }));

  // 3. Add to queue
  if (jobs.length > 0) {
    await ingestionQueue.addBulk(jobs);
    console.log(`   ✅ Queued ${jobs.length} source processing jobs.`);
  } else {
    console.log(`   ⚠️ No sources to queue.`);
  }

  // Schedule verification job after ingestion completes (estimated delay)
  console.log(
    `\n🔍 [Verification] Scheduling verification job (check link health)...`
  );
  await verificationQueue.add(
    "verify-all-published",
    {},
    {
      delay: 30000, 
    }
  );
  console.log(`   ↳ Verification job scheduled (starts in 30s)`);

  // Schedule archive job
  console.log(
    `\n🗄️ [Archive] Scheduling archive expired job (cleanup old items)...`
  );
  await aggregationQueue.add(
    "archive-expired-opportunities",
    {},
    {
      delay: 60000, 
    }
  );
  console.log(`   ↳ Archive job scheduled (starts in 60s)`);

  const end = Date.now();
  const durationSec = (end - start) / 1000;

  console.log(`\n================================================================================`);
  console.log(`🏁 [Ingestion] DISPATCH COMPLETED - Sub-jobs queued!`);
  console.log(`⏱️  Duration: ${durationSec.toFixed(2)}s`);
  console.log(`================================================================================\n`);

  return { dispatched: jobs.length };
}

export async function processSourceJob(job: Job): Promise<void> {
  const { sourceId } = job.data;
  console.log(`Processing source ${sourceId} (job ${job.id})`);
  const result = await ingestionService.processSource(sourceId);
  console.log(
    `Processed ${result.processedCount} new items from source ${sourceId}`
  );
}

