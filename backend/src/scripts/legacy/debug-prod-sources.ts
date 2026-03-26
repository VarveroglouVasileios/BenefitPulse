import mongoose from "mongoose";

async function main() {
  // Set env var BEFORE importing config or connectMongo
  process.env.MONGODB_URI = "mongodb+srv://varveroglouvas_db_user:Paokara141187@benefitpulse.oox9dvm.mongodb.net/benefitpulse";
  
  // Dynamic import to ensure config picks up the new env var
  const { connectMongo } = await import("../db/mongo");
  const { Source } = await import("../models/source.model");
  
  await connectMongo();
  
  const dbName = mongoose.connection.db?.databaseName;
  console.log(`📡 Connected to DB: ${dbName}`);
  
  const allSources = await Source.find({});
  console.log(`📊 Total sources in DB: ${allSources.length}`);

  const enabledSources = allSources.filter(s => s.enabled === true);
  console.log(`✅ Enabled: ${enabledSources.length}`);
  console.log(`❌ Disabled: ${allSources.length - enabledSources.length}`);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
