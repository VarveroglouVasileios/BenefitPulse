import { ingestionQueue } from './queues';

/**
 * Schedule ingestion jobs
 * Run this on app startup or via a separate scheduler process
 * 
 * Archive job now runs automatically after each ingestion (chained in ingestion.jobs.ts)
 */
export async function scheduleIngestionJobs(): Promise<void> {
  // Schedule every 2 hours (reduced from 30 minutes for efficiency)
  await ingestionQueue.add(
    'process-all-sources',
    {},
    {
      repeat: {
        every: 2 * 60 * 60 * 1000, // Every 2 hours (in milliseconds)
      },
    }
  );

  console.log('✅ Ingestion jobs scheduled (every 2 hours)');
  console.log('✅ Archive runs automatically after each ingestion');
}
