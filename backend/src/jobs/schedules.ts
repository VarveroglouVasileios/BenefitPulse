import { ingestionQueue, aggregationQueue } from './queues';

/**
 * Schedule ingestion jobs
 * Run this on app startup or via a separate scheduler process
 * Prevents duplicate scheduled jobs by removing existing ones first
 */
export async function scheduleIngestionJobs(): Promise<void> {
  try {
    // Remove existing repeatable jobs to prevent duplicates
    const ingestionRepeatableJobs = await ingestionQueue.getRepeatableJobs();
    for (const job of ingestionRepeatableJobs) {
      if (job.name === 'process-all-sources') {
        await ingestionQueue.removeRepeatableByKey(job.key);
        console.log(`🗑️  Removed existing repeatable job: ${job.name}`);
      }
    }

    // Schedule every 30 minutes with a unique jobId to prevent conflicts
    await ingestionQueue.add(
      'process-all-sources',
      {},
      {
        repeat: {
          every: 30 * 60 * 1000, // Every 30 minutes (in milliseconds)
          jobId: 'process-all-sources-repeat', // Unique ID to prevent duplicates
        },
      }
    );

    console.log('✅ Ingestion jobs scheduled (every 30 minutes)');
  } catch (error: any) {
    console.warn('⚠️  Error scheduling ingestion jobs:', error.message);
    // Continue even if scheduling fails (might already be scheduled)
  }

  try {
    // Remove existing repeatable jobs to prevent duplicates
    const aggregationRepeatableJobs = await aggregationQueue.getRepeatableJobs();
    for (const job of aggregationRepeatableJobs) {
      if (job.name === 'archive-expired-opportunities') {
        await aggregationQueue.removeRepeatableByKey(job.key);
        console.log(`🗑️  Removed existing repeatable job: ${job.name}`);
      }
    }

    // Archive expired opportunities every 2 hours with a unique jobId
    await aggregationQueue.add(
      'archive-expired-opportunities',
      {},
      {
        repeat: {
          every: 2 * 60 * 60 * 1000, // Every 2 hours (in milliseconds)
          jobId: 'archive-expired-opportunities-repeat', // Unique ID to prevent duplicates
        },
      }
    );

    console.log('✅ Archive expired job scheduled (every 2 hours)');
  } catch (error: any) {
    console.warn('⚠️  Error scheduling archive jobs:', error.message);
    // Continue even if scheduling fails (might already be scheduled)
  }
}
