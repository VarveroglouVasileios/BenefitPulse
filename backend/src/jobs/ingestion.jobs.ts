import { Job } from 'bullmq';
import { IngestionService } from '../modules/ingestion/ingestion.service';
import { verificationQueue, aggregationQueue } from './queues';

const ingestionService = new IngestionService();

export async function processAllSourcesJob(job: Job): Promise<any> {
  const start = Date.now();
  console.log(`\n🔄 [Ingestion] Processing all sources (job ${job.id})...`);
  const result = await ingestionService.processAllEnabledSources();
  // Summary is already logged by processAllEnabledSources()
  
  // Schedule verification job after ingestion completes
  console.log(`\n🔍 [Verification] Scheduling verification job (check link health)...`);
  await verificationQueue.add("verify-all-published", {}, {
    delay: 5000, // Wait 5 seconds after ingestion
  });
  console.log(`   ↳ Verification job scheduled (starts in 5s)`);
  
  // Schedule archive job immediately after verification
  // This ensures expired opportunities are cleaned up right after each ingestion cycle
  console.log(`\n🗄️ [Archive] Scheduling archive expired job (cleanup old items)...`);
  await aggregationQueue.add("archive-expired-opportunities", {}, {
    delay: 60000, // Wait 60 seconds for verification to complete
  });
  console.log(`   ↳ Archive job scheduled (starts in 60s)`);
  
  const end = Date.now();
  const durationSec = (end - start) / 1000;
  const durationMin = (durationSec / 60).toFixed(1);
  
  console.log(`\n🏁 INGESTION CYCLE COMPLETED - Background jobs queued!`);
  console.log(`⏱️ Total Duration: ${durationMin}m (${Math.round(durationSec)}s)\n`);
  
  return result;
}

export async function processSourceJob(job: Job): Promise<void> {
  const { sourceId } = job.data;
  console.log(`Processing source ${sourceId} (job ${job.id})`);
  const result = await ingestionService.processSource(sourceId);
  console.log(`Processed ${result.processedCount} new items from source ${sourceId}`);
}

