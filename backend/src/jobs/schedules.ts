import { ingestionQueue, aggregationQueue } from './queues';

/**
 * Schedule ingestion and archive jobs.
 * Run this on app startup (main.ts).
 *
 * - Ingestion: every 2 hours (dispatches process-source jobs per source).
 * - Archive: every 24 hours standalone, so expired items are removed even if
 *   ingestion is skipped or delayed. Also chained after each ingestion (30 min delay).
 */
export async function scheduleIngestionJobs(): Promise<void> {
  // Ingestion: every 2 hours
  await ingestionQueue.add(
    'process-all-sources',
    {},
    {
      repeat: {
        every: 2 * 60 * 60 * 1000, // Every 2 hours (in milliseconds)
      },
      removeOnComplete: { count: 10 },  // Keep last 10 completed
      removeOnFail: { count: 50 },      // Keep last 50 failed
    }
  );
  console.log('✅ Ingestion jobs scheduled (every 2 hours)');

  // Archive expired: standalone repeat every 24 hours so expired items are
  // always cleaned even when ingestion doesn't run or runs late
  await aggregationQueue.add(
    'archive-expired-opportunities',
    {},
    {
      repeat: {
        every: 24 * 60 * 60 * 1000, // Every 24 hours
      },
      removeOnComplete: { count: 10 },
      removeOnFail: { count: 50 },
    }
  );
  console.log('✅ Archive expired jobs scheduled (every 24 hours)');
  console.log('✅ Archive also runs 30 min after each ingestion run');
}
