import mongoose from "mongoose";
import { connectMongo } from "../db/mongo";
import { Source } from "../models/source.model";

async function main() {
  await connectMongo();
  
  const dbName = mongoose.connection.db?.databaseName;
  console.log(`📡 Connected to DB: ${dbName} (NODE_ENV=${process.env.NODE_ENV})`);
  
  const allSources = await Source.find({});
  console.log(`📊 Total sources in DB: ${allSources.length}`);

  const enabledSources = allSources.filter(s => s.enabled === true);
  const disabledSources = allSources.filter(s => s.enabled === false);
  const otherSources = allSources.filter(s => s.enabled !== true && s.enabled !== false);

  console.log(`✅ Enabled: ${enabledSources.length}`);
  console.log(`❌ Disabled (false): ${disabledSources.length}`);
  console.log(`❓ Other (undefined/null): ${otherSources.length}`);

  if (disabledSources.length > 0) {
    console.log("\nSample Disabled Source:");
    console.log(JSON.stringify(disabledSources[0], null, 2));
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
