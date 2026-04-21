import { connectMongo } from "../db/mongo";
import { Opportunity } from "../models/opportunity.model";
import mongoose from "mongoose";

async function main() {
  await connectMongo();

  const idToArchive = "69d5a33939b1d33ddfebc933"; // Η εγγραφή με τον ακατάστατο τίτλο

  console.log(`📦 Archiving duplicate Gigabit entry [${idToArchive}]...`);

  const result = await Opportunity.updateOne(
    { _id: new mongoose.Types.ObjectId(idToArchive) },
    { 
      $set: { 
        status: "archived",
        rejectionReason: "Duplicate of higher-quality entry (Gigabit Connectivity Voucher)",
        updatedAt: new Date()
      }
    }
  );

  console.log(`✅ Archived ${result.modifiedCount} item.`);

  await mongoose.disconnect();
}

main();
