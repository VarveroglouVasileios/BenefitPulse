// Polyfill for Node 16 (undici expects Blob/ReadableStream). Remove on Node 18+.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Blob } = require("buffer");
if (!(global as any).Blob) {
  (global as any).Blob = Blob;
}

// Minimal File polyfill using Blob
if (!(global as any).File) {
  class PolyfillFile extends Blob {
    name: string;
    lastModified: number;
    constructor(parts: any[], name: string, options: any = {}) {
      super(parts, options);
      this.name = name;
      this.lastModified = options.lastModified || Date.now();
    }
  }
  (global as any).File = PolyfillFile;
}

// Minimal DOMException polyfill
if (!(global as any).DOMException) {
  class PolyfillDOMException extends Error {
    name: string;
    constructor(message = "", name = "DOMException") {
      super(message);
      this.name = name;
    }
  }
  (global as any).DOMException = PolyfillDOMException;
}
// eslint-disable-next-line @typescript-eslint/no-var-requires
require("web-streams-polyfill/polyfill");

import { Worker } from "bullmq";
import Redis from "ioredis";
import { config } from "./config/env";
import { connectMongo } from "./db/mongo";
import { processAllSourcesJob, processSourceJob } from "./jobs/ingestion.jobs";
import {
  recomputeUserMatchesJob,
  recomputeOpportunityMatchesJob,
} from "./jobs/matching.jobs";
import { archiveExpiredOpportunitiesJob } from "./jobs/archive.jobs";
import { recomputeStatus } from "./scripts/recompute-status";
import { verifyAllPublishedJob, verifyOpportunityJob } from "./jobs/verification.jobs";
import * as Sentry from "@sentry/node";

if (config.sentry.enabled) {
  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.nodeEnv,
    tracesSampleRate: config.sentry.tracesSampleRate,
    profilesSampleRate: config.sentry.profilesSampleRate,
    integrations: [
      Sentry.httpIntegration(),
      Sentry.mongoIntegration(),
    ],
  });
}

// Use REDIS_URL if available, otherwise fallback to individual params
const connection = config.redis.url 
  ? new Redis(config.redis.url, { maxRetriesPerRequest: null })
  : new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      maxRetriesPerRequest: null,
    });

console.log(`\n${"═".repeat(70)}`);
console.log(`  🚀 BENEFITPULSE WORKER — Started`);
console.log(`  ⏱️  ${new Date().toLocaleString("el-GR", { hour12: false })}`);
console.log(`  📋 Queues: ingestion | matching | aggregation | verification`);
console.log(`${"═".repeat(70)}\n`);
console.log(`  Waiting for jobs...\n`);

// Ingestion worker
const ingestionWorker = new Worker(
  "ingestion",
  async (job) => {
    await connectMongo();
    if (job.name === "process-all-sources") {
      await processAllSourcesJob(job);
    } else if (job.name === "process-source") {
      await processSourceJob(job);
    } else {
      throw new Error(`Unknown ingestion job name: ${job.name}`);
    }
  },
  { 
    connection: connection as any,
    lockDuration: 600000, // 10 minutes (to allow for deep fetching/large pages)
    concurrency: 1 
  }
);

// Matching worker
const matchingWorker = new Worker(
  "matching",
  async (job) => {
    await connectMongo();
    if (job.name === "recompute-user-matches") {
      await recomputeUserMatchesJob(job as any);
    } else if (job.name === "recompute-opportunity-matches") {
      await recomputeOpportunityMatchesJob(job as any);
    } else {
      throw new Error(`Unknown matching job name: ${job.name}`);
    }
  },
  { 
    connection: connection as any,
    lockDuration: 300000, // 5 minutes 
  }
);

// Aggregation / housekeeping worker
const aggregationWorker = new Worker(
  "aggregation",
  async (job) => {
    await connectMongo();
    if (job.name === "daily-metrics") {
      console.log("Daily metrics aggregation (placeholder)");
    } else if (job.name === "archive-expired-opportunities") {
      await archiveExpiredOpportunitiesJob(job);
    } else if (job.name === "recompute-status") {
      await recomputeStatus(false);
    } else {
      throw new Error(`Unknown aggregation job name: ${job.name}`);
    }
  },
  {
    connection: connection as any,
    lockDuration: 600000, // 10 minutes (archive re-validates items via HTTP/cleaner)
  }
);

// Verification worker
const verificationWorker = new Worker(
  "verification",
  async (job) => {
    await connectMongo();
    if (job.name === "verify-all-published") {
      await verifyAllPublishedJob(job);
    } else if (job.name === "verify-opportunity") {
      await verifyOpportunityJob(job);
    } else {
      throw new Error(`Unknown verification job name: ${job.name}`);
    }
  },
  {
    connection: connection as any,
    lockDuration: 300000, // 5 minutes (verification fetches live URLs)
  }
);

import { notificationService } from "./services/notification.service";
import { ProgressTracker } from "./utils/progress";

// Track when jobs started for duration logging
const jobStartTimes = new Map<string, number>();

function onActive(workerName: string) {
  return (job: any) => {
    const key = `${workerName}:${job.id}`;
    jobStartTimes.set(key, Date.now());

    // Only log non-noisy jobs (skip per-source jobs which have their own progress)
    if (job.name !== "process-source") {
      console.log(
        `\n  ▶️  [${workerName}] Job started: ${job.name} (${job.id}) at ${new Date().toLocaleTimeString("el-GR", { hour12: false })}`
      );
    }
  };
}

function onComplete(workerName: string) {
  return async (job: any, returnValue: any) => {
    const key = `${workerName}:${job.id}`;
    const startTime = jobStartTimes.get(key);
    jobStartTimes.delete(key);
    const duration = startTime
      ? ProgressTracker.formatDuration(Date.now() - startTime)
      : "?";

    // Only log non-noisy jobs
    if (job.name !== "process-source") {
      console.log(
        `  ✅ [${workerName}] Job completed: ${job.name} (${job.id}) in ${duration}`
      );
    }
    
    // Ingestion completion notification
    if (workerName === "ingestion" && job.name === "process-all-sources" && returnValue) {
      let body = "";
      if (typeof returnValue === "object") {
         if (returnValue.dispatched !== undefined) {
            body = `🚀 Ξεκίνησε η επεξεργασία ${returnValue.dispatched} πηγών`;
         } else if (returnValue.count !== undefined) {
            body = `✅ Βρέθηκαν ${returnValue.count} νέες εγγραφές`;
         }
      }

      if (body) {
          try {
             await notificationService.sendToAdmins({
                title: 'Ingestion Started',
                body,
                url: '/admin',
                icon: '/pwa-192x192.png'
             });
          } catch (err) {
             console.error("Failed to send ingestion notification:", err);
          }
      }
    }
  };
}

function onFailed(workerName: string) {
  return (job: any, err: any) => {
    const key = `${workerName}:${job?.id}`;
    jobStartTimes.delete(key);

    const attemptsMade = typeof job?.attemptsMade === "number" ? job.attemptsMade : 0;
    const maxAttempts = typeof job?.opts?.attempts === "number" ? job.opts.attempts : 1;
    const willRetry = attemptsMade < maxAttempts;

    if (willRetry) {
      console.warn(
        `  ⚠️  [${workerName}] Job attempt failed (will retry): ${job?.name} (${job?.id}) — attempt ${attemptsMade}/${maxAttempts} — ${err?.message || err}`,
      );
    } else {
      console.error(
        `  ❌ [${workerName}] Job FAILED: ${job?.name} (${job?.id}) — ${err?.message || err}`,
      );
    }

    if (workerName === "ingestion" && job?.name === "process-all-sources") {
       notificationService.sendToAdmins({
          title: 'Σφάλμα Ingestion',
          body: `❌ Η διαδικασία απέτυχε: ${err?.message || 'Unknown error'}`,
          url: '/admin',
          icon: '/pwa-192x192.png'
       }).catch(() => {});
    }

    if (config.sentry.enabled) {
      Sentry.captureException(err, {
        tags: {
          queue: workerName,
          jobName: job?.name,
        },
        extra: {
          jobId: job?.id,
          attemptsMade: job?.attemptsMade,
          data: job?.data,
        },
      });
    }
  };
}

ingestionWorker.on("active", onActive("ingestion"));
ingestionWorker.on("completed", onComplete("ingestion"));
ingestionWorker.on("failed", onFailed("ingestion"));
matchingWorker.on("active", onActive("matching"));
matchingWorker.on("completed", onComplete("matching"));
matchingWorker.on("failed", onFailed("matching"));
aggregationWorker.on("active", onActive("aggregation"));
aggregationWorker.on("completed", onComplete("aggregation"));
aggregationWorker.on("failed", onFailed("aggregation"));
verificationWorker.on("active", onActive("verification"));
verificationWorker.on("completed", onComplete("verification"));
verificationWorker.on("failed", onFailed("verification"));

async function gracefulShutdown(signal: string) {
  console.log(`\n🛑 Received ${signal}. Shutting down workers...`);
  await Promise.allSettled([
    ingestionWorker.close(),
    matchingWorker.close(),
    aggregationWorker.close(),
    verificationWorker.close(),
  ]);
  await connection.quit();
  console.log("👋 Workers stopped. Bye!");
  process.exit(0);
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
