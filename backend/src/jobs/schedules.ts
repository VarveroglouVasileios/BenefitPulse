import { ingestionQueue, aggregationQueue } from './queues';

/**
 * Schedule ingestion jobs
 * Run this on app startup or via a separate scheduler process
 */
export async function scheduleIngestionJobs(): Promise<void> {
  // Schedule every 30 minutes
  await ingestionQueue.add(
    'process-all-sources',
    {},
    {
      repeat: {
        every: 30 * 60 * 1000, // Every 30 minutes (in milliseconds)
      },
    }
  );

  console.log('✅ Ingestion jobs scheduled (every 30 minutes)');

  // Archive expired opportunities every 2 hours
  await aggregationQueue.add(
    'archive-expired-opportunities',
    {},
    {
      repeat: {
        every: 2 * 60 * 60 * 1000, // Every 2 hours (in milliseconds)
      },
    }
  );

  console.log('✅ Archive expired job scheduled (every 2 hours)');
}
