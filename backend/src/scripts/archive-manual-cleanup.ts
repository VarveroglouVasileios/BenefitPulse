import { connectMongo } from "../db/mongo";
import { Opportunity } from "../models/opportunity.model";
import mongoose from "mongoose";

async function main() {
  await connectMongo();

  const idsToArchive = [
    "69bdb7bf839241ee281072a7", // 53η Ημέρα Καριέρας (Ηράκλειο)
    "69cf05f5839241ee2811c719", // 54η Ημέρα Καριέρας (Σέρρες)
    "69d35bf7216ec406d41de8ab"  // ΕΠΙΔΟΜΑ ΠΑΣΧΑ 2026 (ΔΕΥΑΝ)
  ];

  console.log(`📦 Archiving ${idsToArchive.length} outdated/incorrect items...`);

  const result = await Opportunity.updateMany(
    { _id: { $in: idsToArchive.map(id => new mongoose.Types.ObjectId(id)) } },
    { 
      $set: { 
        status: "archived",
        rejectionReason: "Outdated or misleading entry (manual cleanup)",
        updatedAt: new Date()
      }
    }
  );

  console.log(`✅ Archived ${result.modifiedCount} items.`);

  await mongoose.disconnect();
}

main();
