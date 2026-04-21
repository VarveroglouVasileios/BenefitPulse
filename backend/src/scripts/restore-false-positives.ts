import { connectMongo } from "../db/mongo";
import { Opportunity } from "../models/opportunity.model";
import mongoose from "mongoose";

async function main() {
  console.log("🔗 Connecting to MongoDB...");
  await connectMongo();

  const idsToRestore = [
    "69d45a538ee3484cf5d9457e", // Πρόγραμμα «Σπίτι μου»
    "69d4b497bd7e09e9c78f9879"  // Επίδομα Τακτικής Ανεργίας
  ];

  console.log(`🔄 Restoring ${idsToRestore.length} opportunities...`);

  const result = await Opportunity.updateMany(
    { _id: { $in: idsToRestore.map(id => new mongoose.Types.ObjectId(id)) } },
    { 
      $set: { 
        status: "published",
        updatedAt: new Date()
      },
      $unset: { rejectionReason: "" }
    }
  );

  console.log(`✅ Restored ${result.modifiedCount} opportunities.`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error("❌ Restore failed:", err);
  process.exit(1);
});
