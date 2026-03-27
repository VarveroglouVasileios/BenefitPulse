import { ingestionQueue } from "./queues";

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
}
