import { Job } from "bullmq";
import { IngestionService } from "../modules/ingestion/ingestion.service";
import {
  verificationQueue,
  aggregationQueue,
  ingestionQueue,
} from "./queues";
import { Source } from "../models/source.model";
import Redis from "ioredis";
import { config } from "../config/env";
import { ProgressTracker, logPhaseStart } from "../utils/progress";

const ingestionService = new IngestionService();

// Redis connection for cross-job progress tracking
let progressRedis: Redis | null = null;
function getProgressRedis(): Redis {
  if (!progressRedis) {
    progressRedis = config.redis.url
      ? new Redis(config.redis.url, { maxRetriesPerRequest: null })
      : new Redis({
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password,
          maxRetriesPerRequest: null,
        });
  }
  return progressRedis;
}

const PROGRESS_KEY = "worker:ingestion:progress";

export async function processAllSourcesJob(job: Job): Promise<any> {
  const start = Date.now();

  logPhaseStart("INGESTION DISPATCH", "🚀");

  // 1. Fetch enabled sources
  const sources = await Source.find({ enabled: true }).select("_id name");
  console.log(`  📂 Found ${sources.length} enabled sources to process`);
  console.log(`  ⏱️  Started at ${new Date().toLocaleTimeString("el-GR", { hour12: false })}\n`);

  // Store progress state in Redis so per-source jobs can read it (non-critical)
  try {
    const redis = getProgressRedis();
    const sourceNames = sources.map((s) => s.name);
    await redis.set(
      PROGRESS_KEY,
      JSON.stringify({
        total: sources.length,
        completed: 0,
        startTime: start,
        sourceNames,
        currentSource: null,
      }),
      "EX",
      7200 // 2h TTL
    );
  } catch { /* progress tracking is non-critical — don't block dispatch */ }

  // Print the planned sources
  sources.forEach((s, i) => {
    console.log(`     ${String(i + 1).padStart(2, " ")}. ${s.name}`);
  });
  console.log();

  // 2. Create bulk jobs — pass index + total so each source job can show progress
  const jobs = sources.map((source, index) => ({
    name: "process-source",
    data: {
      sourceId: source._id.toString(),
      sourceIndex: index,
      totalSources: sources.length,
      sourceName: source.name,
      pipelineStartTime: start,
    },
    opts: {
      removeOnComplete: true,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: "exponential" as const,
        delay: 5000,
      },
    },
  }));

  // 3. Add to queue
  if (jobs.length > 0) {
    await ingestionQueue.addBulk(jobs);
    console.log(`  ✅ Queued ${jobs.length} source processing jobs\n`);
  } else {
    console.log(`  ⚠️  No sources to queue\n`);
  }

  // Schedule follow-up jobs
  const verificationDelayMs = 15 * 60 * 1000;
  await verificationQueue.add("verify-all-published", {}, { delay: verificationDelayMs });
  console.log(`  🔍 Verification scheduled (in 15 min)`);

  const archiveDelayMs = 30 * 60 * 1000;
  await aggregationQueue.add("archive-expired-opportunities", {}, { delay: archiveDelayMs });
  console.log(`  🗄️  Archive scheduled (in 30 min)\n`);

  const durationSec = (Date.now() - start) / 1000;
  console.log(`  🏁 Dispatch done in ${durationSec.toFixed(1)}s — processing starts now\n`);

  return { dispatched: jobs.length };
}

export async function processSourceJob(job: Job): Promise<void> {
  const sourceId = job.data?.sourceId;
  if (!sourceId || typeof sourceId !== "string") {
    throw new Error("processSourceJob: sourceId is required");
  }

  const sourceIndex: number = job.data?.sourceIndex ?? 0;
  const totalSources: number = job.data?.totalSources ?? 1;
  const sourceName: string = job.data?.sourceName ?? sourceId;
  const pipelineStartTime: number = job.data?.pipelineStartTime ?? Date.now();
  const sourceNum = sourceIndex + 1;

  // Update Redis progress
  const redis = getProgressRedis();
  try {
    const raw = await redis.get(PROGRESS_KEY);
    if (raw) {
      const progress = JSON.parse(raw);
      progress.currentSource = sourceName;
      progress.completed = sourceIndex;
      await redis.set(PROGRESS_KEY, JSON.stringify(progress), "EX", 7200);
    }
  } catch { /* ignore redis errors */ }

  // Build a top-level progress bar for overall pipeline
  const overallPct = Math.round((sourceIndex / totalSources) * 100);
  const barWidth = 30;
  const filled = Math.round((sourceIndex / totalSources) * barWidth);
  const empty = barWidth - filled;
  const overallBar = `[${"█".repeat(filled)}${"░".repeat(empty)}]`;

  // Calculate pipeline ETA based on elapsed time
  const elapsedMs = Date.now() - pipelineStartTime;
  const avgPerSource = sourceIndex > 0 ? elapsedMs / sourceIndex : 0;
  const remainingSources = totalSources - sourceIndex;
  const etaMs = avgPerSource * remainingSources;
  const etaStr = sourceIndex > 0 ? ProgressTracker.formatDuration(etaMs) : "calculating...";
  const elapsedStr = ProgressTracker.formatDuration(elapsedMs);

  console.log(`\n${"━".repeat(70)}`);
  console.log(`  📦 SOURCE ${sourceNum}/${totalSources}: ${sourceName}`);
  console.log(`  ${overallBar} ${overallPct}% | ⏱️ ${elapsedStr} | ETA: ${etaStr}`);
  console.log(`${"━".repeat(70)}`);

  const sourceStart = Date.now();
  const result = await ingestionService.processSource(sourceId);
  const sourceDuration = Date.now() - sourceStart;

  console.log(
    `  ✅ Source done: ${result.processedCount} published | ⏱️ ${ProgressTracker.formatDuration(sourceDuration)}`
  );

  // If this is the last source, show completion
  if (sourceNum === totalSources) {
    const totalElapsed = Date.now() - pipelineStartTime;
    console.log(`\n${"═".repeat(70)}`);
    console.log(`  ✅ ALL ${totalSources} SOURCES PROCESSED`);
    console.log(`  ⏱️  Total ingestion time: ${ProgressTracker.formatDuration(totalElapsed)}`);
    console.log(`  🏁 Finished at ${new Date().toLocaleTimeString("el-GR", { hour12: false })}`);
    console.log(`  🔍 Verification will start in ~15 min`);
    console.log(`  🗄️  Archive will start in ~30 min`);
    console.log(`${"═".repeat(70)}\n`);

    // Clean up Redis progress
    try { await redis.del(PROGRESS_KEY); } catch { /* ignore */ }
  }
}

