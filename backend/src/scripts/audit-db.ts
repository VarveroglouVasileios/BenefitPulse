
import { connectMongo } from "../db/mongo";
import { Opportunity } from "../models/opportunity.model";
import { RawItem } from "../models/rawItem.model";

async function audit() {
  await connectMongo();
  
  console.log("--- PUBLISHED OPPORTUNITIES ---");
  const published = await Opportunity.find({ status: "published", deletedAt: null }).sort({ createdAt: -1 });
  published.forEach(o => {
    console.log(`[${o.applicationStatus}] ${o.title} (${o.source}) - ${o.officialUrl}`);
  });

  console.log("\n--- ARCHIVED OPPORTUNITIES (RECENT) ---");
  const archived = await Opportunity.find({ status: "archived", deletedAt: null }).sort({ updatedAt: -1 }).limit(10);
  archived.forEach(o => {
    console.log(`[${o.applicationStatus}] ${o.title} (${o.source})`);
  });

  console.log("\n--- RECENT RAW ITEMS (NOT OPPORTUNITIES) ---");
  // Find raw items that don't have a corresponding opportunity
  const rawItems = await RawItem.find({}).sort({ createdAt: -1 }).limit(20);
  for (const item of rawItems) {
    const opp = await Opportunity.findOne({ officialUrl: item.url });
    if (!opp) {
      console.log(`RAW ONLY: ${item.title} (${item.url})`);
    }
  }

  process.exit(0);
}

audit().catch(console.error);
