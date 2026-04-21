import { connectMongo } from "../db/mongo";
import { Opportunity } from "../models/opportunity.model";
import mongoose from "mongoose";

async function main() {
  console.log("🔗 Connecting to MongoDB...");
  await connectMongo();

  const archivedOpps = await Opportunity.find({
    status: "archived",
    rejectionReason: "Duplicate of higher-priority entry (dedup-opportunities script)",
  }).select("_id title source status").lean();

  console.log(`📊 Found ${archivedOpps.length} opportunities archived by the deduplication script:\n`);

  if (archivedOpps.length === 0) {
    console.log("No archived opportunities found with that reason.");
  } else {
    archivedOpps.forEach((opp, index) => {
      console.log(`${index + 1}. [${opp._id}]`);
      console.log(`   Title: ${opp.title}`);
      console.log(`   Source: ${opp.source}`);
      console.log(`   ---`);
    });
  }

  await mongoose.disconnect();
  console.log("\n🔌 Disconnected.");
}

main().catch((err) => {
  console.error("❌ Script failed:", err);
  process.exit(1);
});
