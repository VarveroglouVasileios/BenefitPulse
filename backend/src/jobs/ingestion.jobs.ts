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

function batchTotalKey(batchId: string): string {
  return `ingestion:batch:${batchId}:total`;
}

function batchFinishedKey(batchId: string): string {
  return `ingestion:batch:${batchId}:finished`;
}

function batchChainedKey(batchId: string): string {
  return `ingestion:batch:${batchId}:chained`;
}

/** After every process-source job (success or fail), maybe enqueue archive + verification once. */
async function onIngestionBatchSourceFinished(batchId: string | undefined): Promise<void> {
  if (!batchId) return;

  try {
    const redis = getProgressRedis();
    const totalStr = await redis.get(batchTotalKey(batchId));
    const total = parseInt(totalStr || "0", 10);
    if (total <= 0) return;

    const finished = await redis.incr(batchFinishedKey(batchId));
    await redis.expire(batchFinishedKey(batchId), 172800);

    console.log(
      `  📊 Ingestion batch ${batchId}: source finished ${finished}/${total}`,
    );

    if (finished < total) return;

    const locked = await redis.set(batchChainedKey(batchId), "1", "EX", 7200, "NX");
    if (locked !== "OK") {
      console.log(
        `  ⏭️  Batch ${batchId}: follow-up (archive/verification) already scheduled — skipping duplicate`,
      );
      return;
    }

    const archiveDelayMs = parseInt(
      process.env.ARCHIVE_AFTER_INGESTION_DELAY_MS || "120000",
      10,
    );
    const verificationDelayMs = parseInt(
      process.env.VERIFICATION_AFTER_INGESTION_DELAY_MS || String(15 * 60 * 1000),
      10,
    );

    await aggregationQueue.add("archive-expired-opportunities", {}, { delay: archiveDelayMs });
    await verificationQueue.add("verify-all-published", {}, { delay: verificationDelayMs });

    console.log(
      `\n  📬 Batch ${batchId} ALL ${total} sources done → queued archive (+${archiveDelayMs / 1000}s) & verification (+${verificationDelayMs / 1000}s)\n`,
    );
  } catch (e) {
    console.warn("  ⚠️  Ingestion batch completion hook failed:", e);
  }
}

export async function processAllSourcesJob(job: Job): Promise<any> {
  const start = Date.now();
  const batchId = String(start);

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

  // Redis: expected source job count for post-batch archive / verification
  if (sources.length > 0) {
    try {
      const redis = getProgressRedis();
      await redis.set(batchTotalKey(batchId), String(sources.length), "EX", 172800);
      console.log(
        `  🆔 Ingestion batchId=${batchId} | expect ${sources.length} process-source completions (Redis batch counter)`,
      );
    } catch {
      /* if Redis fails, per-source jobs skip batch hook */
      console.warn(
        `  ⚠️  Could not set Redis batch total for ${batchId} — archive-after-batch may not run`,
      );
    }
  }

  // 2. Create bulk jobs — pass index + total so each source job can show progress
  const jobs = sources.map((source, index) => ({
    name: "process-source",
    data: {
      sourceId: source._id.toString(),
      batchId,
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

  const durationSec = (Date.now() - start) / 1000;
  console.log(`  🏁 Dispatch done in ${durationSec.toFixed(1)}s — processing starts now\n`);

  return { dispatched: jobs.length };
}

export async function processSourceJob(job: Job): Promise<void> {
  const sourceId = job.data?.sourceId;
  if (!sourceId || typeof sourceId !== "string") {
    throw new Error("processSourceJob: sourceId is required");
  }

  const batchId: string | undefined =
    typeof job.data?.batchId === "string" ? job.data.batchId : undefined;

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

  const isTTY = process.stdout.isTTY;
  // Color constants - only use if TTY
  const BLUE = isTTY ? "\x1b[34m" : "";
  const GREEN = isTTY ? "\x1b[32m" : "";
  const YELLOW = isTTY ? "\x1b[33m" : "";
  const RED = isTTY ? "\x1b[31m" : "";
  const RESET = isTTY ? "\x1b[0m" : "";
  const BOLD = isTTY ? "\x1b[1m" : "";

  // Build a top-level progress bar for overall pipeline
  const overallPct = Math.round((sourceIndex / totalSources) * 100);
  const barWidth = 25;
  const filled = Math.round((sourceIndex / totalSources) * barWidth);
  const empty = barWidth - filled;
  const overallBar = `${BLUE}[${"█".repeat(filled)}${"░".repeat(empty)}]${RESET}`;

  // Calculate pipeline ETA based on elapsed time
  const elapsedMs = Date.now() - pipelineStartTime;
  const avgPerSource = sourceIndex > 0 ? elapsedMs / sourceIndex : 0;
  const remainingSources = totalSources - sourceIndex;
  const etaMs = avgPerSource * remainingSources;
  const etaStr = sourceIndex > 0 ? ProgressTracker.formatDuration(etaMs) : "calculating...";
  const elapsedStr = ProgressTracker.formatDuration(elapsedMs);

  // Use the new centralized progress drawing
  const info = `⏱️ ${elapsedStr} | ETA: ${YELLOW}${etaStr}${RESET}`;
  
  // Draw once immediately
  ProgressTracker.drawOverallProgress(
    sourceIndex, 
    totalSources, 
    `OVERALL INGESTION PROGRESS`,
    info
  );

  console.log(`${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`  ${BOLD}📦 SOURCE ${sourceNum}/${totalSources}:${RESET} ${BOLD}${sourceName}${RESET}`);
  console.log(`${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);

  const sourceStart = Date.now();
  let result;
  try {
    result = await ingestionService.processSource(sourceId);
    const sourceDuration = Date.now() - sourceStart;

    // Status color based on findings
    const statusColor = result.processedCount > 0 ? GREEN : RESET;
    const skipCount = Object.values(result.skipReasons as Record<string, number>).reduce(
      (total, count) => total + count,
      0,
    );

    console.log(
      `  ${statusColor}✅ Done:${RESET} ${BOLD}${result.processedCount}${RESET} opportunities | ${skipCount} skipped | ⏱️ ${ProgressTracker.formatDuration(sourceDuration)}`,
    );
  } catch (error: any) {
    const sourceDuration = Date.now() - sourceStart;
    console.error(
      `  ${RED}❌ Failed:${RESET} ${error.message} | ⏱️ ${ProgressTracker.formatDuration(sourceDuration)}`,
    );
    throw error;
  } finally {
    await onIngestionBatchSourceFinished(batchId);
  }

  // If this is the last source, show completion
  if (sourceNum === totalSources) {
    const totalElapsed = Date.now() - pipelineStartTime;
    const finalTracker = new ProgressTracker({ 
      label: "Ingestion Pipeline", 
      total: totalSources 
    });
    // Use the tracker's finish method for the final big message
    finalTracker.finish({
      "Total Sources": totalSources,
      "Total Time": ProgressTracker.formatDuration(totalElapsed),
      "Next Phase": "Archive + verification (from batch end; see env delays)",
    });

    // Clean up Redis progress
    try { await redis.del(PROGRESS_KEY); } catch { /* ignore */ }
  }
}

