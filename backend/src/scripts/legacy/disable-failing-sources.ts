import { connectMongo } from "../db/mongo";
import { Source } from "../models/source.model";

async function main() {
  process.env.MONGODB_URI = "mongodb+srv://varveroglouvas_db_user:Paokara141187@benefitpulse.oox9dvm.mongodb.net/benefitpulse";
  const { connectMongo } = await import("../db/mongo");
  await connectMongo();
  
  const toDisable = [
    "MITOS - EMDD API",
    "MITOS - EMDD API (Services)",
    "ESPA Fisheries",
    "Διαύγεια Search RSS (fallback)"
  ];

  console.log(`📂 Disabling ${toDisable.length} failing sources...`);

  const result = await Source.updateMany(
    { name: { $in: toDisable } },
    { $set: { enabled: false } }
  );

  console.log(`✅ Successfully disabled ${result.modifiedCount} sources.`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
