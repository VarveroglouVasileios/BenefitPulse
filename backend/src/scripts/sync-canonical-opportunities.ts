import { connectMongo } from "../db/mongo";
import { syncCanonicalOpportunities } from "../modules/opportunities/canonical-opportunities";

async function main(): Promise<void> {
  await connectMongo();
  const result = await syncCanonicalOpportunities();
  console.log(
    `Canonical opportunity sync complete: ${result.upserted} upserted, ${result.corrected} corrected`,
  );
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Canonical opportunity sync failed:", error);
      process.exit(1);
    });
}

export { main as syncCanonicalOpportunitiesScript };
