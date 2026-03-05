/**
 * Manual trigger for worker jobs
 * 
 * Usage:
 *   npm run cli workers:ingest      - Run ingestion job directly
 *   npm run cli workers:archive     - Run archive expired job directly
 *   npm run cli workers:all         - Run both jobs directly
 * 
 * Note: This runs the jobs directly without needing the worker process.
 *       Make sure MongoDB and Redis are running.
 */

// Polyfill for Node 16 (needed for axios/undici dependencies)
if (!(global as any).Blob) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Blob: BufferBlob } = require("buffer");
  (global as any).Blob = BufferBlob;
}
if (!(global as any).File) {
  // Minimal File polyfill using Blob
  class PolyfillFile extends (global as any).Blob {
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

import { connectMongo } from "../db/mongo";
import { processAllSourcesJob } from "../jobs/ingestion.jobs";
import { archiveExpiredOpportunitiesJob } from "../jobs/archive.jobs";
import { Job } from "bullmq";

// Create a mock job object for direct execution
function createMockJob(name: string, data: any = {}): Job {
  return {
    id: `manual-${Date.now()}`,
    name,
    data,
    progress: () => {},
    updateProgress: () => {},
    updateData: () => {},
    log: () => {},
    waitUntilFinished: async () => {},
  } as any as Job;
}

async function runIngestion() {
  console.log("🔄 Running ingestion job directly...");
  await connectMongo();
  
  const job = createMockJob("process-all-sources", {});
  await processAllSourcesJob(job);
  console.log("✅ Ingestion job completed!");
}

async function runArchive() {
  console.log("🔍 Running archive expired opportunities job directly...");
  await connectMongo();
  
  const job = createMockJob("archive-expired-opportunities", {});
  await archiveExpiredOpportunitiesJob(job);
  console.log("✅ Archive job completed!");
}

async function runAll() {
  console.log("🚀 Running all worker jobs manually...\n");
  
  await runIngestion();
  console.log("\n" + "=".repeat(60) + "\n");
  await runArchive();
  
  console.log("\n✅ All jobs completed!");
}

export async function runWorkers(command: string) {
  try {
    switch (command) {
      case "ingest":
        await runIngestion();
        break;
      case "archive":
        await runArchive();
        break;
      case "all":
        await runAll();
        break;
      default:
        console.error(`❌ Unknown command: ${command}`);
        console.error("Available commands: ingest, archive, all");
        process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error running workers:", error);
    process.exit(1);
  }
}

// If run directly
if (require.main === module) {
  const command = process.argv[2] || "all";
  runWorkers(command).then(() => {
    process.exit(0);
  });
}

export default runWorkers;

