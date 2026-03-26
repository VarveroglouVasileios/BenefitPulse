import mongoose from "mongoose";
import { RawItem } from "../models/rawItem.model";
import { Opportunity } from "../models/opportunity.model";
import { config } from "../config/env";

async function main() {
  console.log("🔗 Connecting to MongoDB...");
  await mongoose.connect(config.mongodb.uri);
  
  const rawCount = await RawItem.countDocuments();
  const oppCount = await Opportunity.countDocuments();
  const unprocessedRaw = await RawItem.countDocuments({ processed: false });

  console.log(`\n📊 Current Database Counts (DEV):`);
  console.log(`   - Raw Items: ${rawCount} (${unprocessedRaw} still unprocessed)`);
  console.log(`   - Opportunities: ${oppCount}`);
  
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
