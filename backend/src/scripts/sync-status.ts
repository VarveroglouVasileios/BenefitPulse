
import { connectMongo } from "../db/mongo";
import { Opportunity } from "../models/opportunity.model";

async function syncStatus() {
  await connectMongo();
  console.log("🔄 Syncing applicationStatus to root level...");

  const opportunities = await Opportunity.find({ status: "published", deletedAt: null });
  let count = 0;

  for (const opp of opportunities) {
    const jsonStatus = (opp.criteriaJson as any)?.applicationStatus;
    if (jsonStatus && opp.applicationStatus !== jsonStatus) {
      opp.applicationStatus = jsonStatus;
      await opp.save();
      count++;
    }
  }

  console.log(`✅ Synced ${count} opportunities.`);
  process.exit(0);
}

syncStatus().catch(console.error);
