import { connectMongo } from "../db/mongo";
import { Opportunity } from "../models/opportunity.model";
import mongoose from "mongoose";

async function main() {
  await connectMongo();

  const item = await Opportunity.findOne({
    title: { $regex: "ΕΠΙΔΟΜΑ ΠΑΣΧΑ 2026", $options: "i" }
  }).lean();

  if (!item) {
    console.log("❌ Δεν βρέθηκε εγγραφή με αυτόν τον τίτλο.");
  } else {
    console.log("📄 Λεπτομέρειες Ευκαιρίας:");
    console.log(`- ID: ${item._id}`);
    console.log(`- Title: ${item.title}`);
    console.log(`- Status: ${item.status}`);
    console.log(`- Source: ${item.source}`);
    console.log(`- URL: ${item.officialUrl}`);
    console.log(`- Summary: ${item.summary.substring(0, 200)}...`);
    console.log(`- CreatedAt: ${item.createdAt}`);
  }

  await mongoose.disconnect();
}

main();
