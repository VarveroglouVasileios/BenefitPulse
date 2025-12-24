import { Job } from 'bullmq';
import { IngestionService } from '../modules/ingestion/ingestion.service';
import { verificationQueue } from './queues';

const ingestionService = new IngestionService();

export async function processAllSourcesJob(job: Job): Promise<void> {
  console.log(`\n🔄 [Ingestion] Processing all sources (job ${job.id})...`);
  const count = await ingestionService.processAllEnabledSources();
  // Summary is already logged by processAllEnabledSources()
  
  // Schedule verification job after ingestion completes
  console.log(`\n🔍 [Verification] Scheduling verification job...`);
  await verificationQueue.add("verify-all-published", {}, {
    delay: 5000, // Wait 5 seconds after ingestion
  });
  console.log(`✅ Verification job scheduled`);
}

export async function processSourceJob(job: Job): Promise<void> {
  const { sourceId } = job.data;
  console.log(`Processing source ${sourceId} (job ${job.id})`);
  const result = await ingestionService.processSource(sourceId);
  console.log(`Processed ${result.processedCount} new items from source ${sourceId}`);
}
