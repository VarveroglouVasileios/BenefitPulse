import { connectMongo } from "../db/mongo";
import { Opportunity } from "../models/opportunity.model";
import mongoose from "mongoose";

async function main() {
  await connectMongo();

  const item = await Opportunity.findOne({
    title: { $regex: "54η «Ημέρα Καριέρας»", $options: "i" }
  }).lean();

  if (!item) {
    console.log("❌ Δεν βρέθηκε εγγραφή για την 54η Ημέρα Καριέρας.");
  } else {
    console.log("📄 Λεπτομέρειες Ευκαιρίας:");
    console.log(`- ID: ${item._id}`);
    console.log(`- Title: ${item.title}`);
    console.log(`- Status: ${item.status}`);
    console.log(`- Deadline: ${item.deadlineAt}`);
    console.log(`- Application End: ${item.applicationEndAt}`);
    console.log(`- CreatedAt: ${item.createdAt}`);
    console.log(`- Summary: ${item.summary}`);
  }

  await mongoose.disconnect();
}

main();
