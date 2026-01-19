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

// Redis connection shared by all workers
const connection = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null,
});

console.log("🚀 Starting worker entrypoint...");
console.log("📋 Queues: ingestion, matching, aggregation, verification");

// Ingestion worker
const ingestionWorker = new Worker(
  "ingestion",
  async (job) => {
    await connectMongo();
    if (job.name === "process-all-sources") {
      await processAllSourcesJob(job);
    } else if (job.name === "process-source") {
      await processSourceJob(job);
    }
  },
  { connection }
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
    }
  },
  { connection }
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
    }
  },
  { connection }
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
    }
  },
  { connection }
);

function onComplete(workerName: string) {
  return (job: any) => {
    console.log(`✅ [${workerName}] Job ${job.id} completed (${job.name})`);
  };
}

function onFailed(workerName: string) {
  return (job: any, err: any) => {
    console.error(`❌ [${workerName}] Job ${job?.id} failed:`, err);
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

ingestionWorker.on("completed", onComplete("ingestion"));
ingestionWorker.on("failed", onFailed("ingestion"));
matchingWorker.on("completed", onComplete("matching"));
matchingWorker.on("failed", onFailed("matching"));
aggregationWorker.on("completed", onComplete("aggregation"));
aggregationWorker.on("failed", onFailed("aggregation"));
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
