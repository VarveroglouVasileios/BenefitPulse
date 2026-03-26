import {
  aggregationQueue,
  ingestionQueue,
  matchingQueue,
  verificationQueue,
} from "../jobs/queues";

async function main() {
  const queues = [
    { name: "ingestion", queue: ingestionQueue },
    { name: "aggregation", queue: aggregationQueue },
    { name: "verification", queue: verificationQueue },
    { name: "matching", queue: matchingQueue },
  ];

  console.log("\n📊 BenefitPulse Queue Status\n");

  for (const { name, queue } of queues) {
    const counts = await queue.getJobCounts(
      "waiting",
      "active",
      "completed",
      "failed",
      "delayed",
      "paused",
    );

    console.log(`- ${name}`);
    console.log(
      `  waiting=${counts.waiting ?? 0} active=${counts.active ?? 0} delayed=${counts.delayed ?? 0} paused=${counts.paused ?? 0} completed=${counts.completed ?? 0} failed=${counts.failed ?? 0}`,
    );
  }

  await Promise.all(queues.map(({ queue }) => queue.close()));
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Failed to check queues:", error);
      process.exit(1);
    });
}

export default main;
