import { ingestionQueue, aggregationQueue } from "./queues";

/**
 * Schedule ingestion. Archive / verification are enqueued only after all
 * per-source ingestion jobs finish (see ingestion.jobs.ts), so housekeeping
 * does not compete with the worker mid-ingestion.
 */
export async function scheduleIngestionJobs(): Promise<void> {
  await ingestionQueue.add(
    "process-all-sources",
    {},
    {
      // Stable jobId so API restarts don't stack duplicate repeatable jobs
      jobId: "ingestion-daily",
      repeat: {
        every: 24 * 60 * 60 * 1000,
      },
      removeOnComplete: { count: 10 },
      removeOnFail: { count: 50 },
    }
  );
  console.log("✅ Ingestion jobs scheduled (every 24 hours)");
  console.log(
    "✅ Archive & verification run after each full ingestion batch (delays configurable via env)",
  );

  // Schedule status recomputation every 12 hours so applicationStatus stays
  // accurate even between ingestion runs (e.g. an "upcoming" item whose
  // applicationStartAt arrives between two ingestion cycles).
  await aggregationQueue.add(
    "recompute-status",
    {},
    {
      jobId: "recompute-status-12h",
      repeat: {
        every: 12 * 60 * 60 * 1000, // every 12 hours
      },
      removeOnComplete: { count: 5 },
      removeOnFail: { count: 10 },
    }
  );
  console.log("✅ Status recomputation scheduled (every 12 hours)");
}
