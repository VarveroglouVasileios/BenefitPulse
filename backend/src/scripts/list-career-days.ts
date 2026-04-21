import { connectMongo } from "../db/mongo";
import { Opportunity } from "../models/opportunity.model";
import mongoose from "mongoose";

async function main() {
  await connectMongo();

  console.log("🔎 Searching for all 'Ημέρα Καριέρας' entries...\n");

  const items = await Opportunity.find({
    title: { $regex: "Ημέρα Καριέρας", $options: "i" },
    status: "published"
  }).select("title source publishedAt createdAt").lean();

  if (items.length === 0) {
    console.log("No published items found.");
  } else {
    items.forEach((item, index) => {
      console.log(`${index + 1}. [${item._id}] ${item.title}`);
      console.log(`   Source: ${item.source}`);
      console.log(`   Published: ${item.publishedAt.toISOString()}`);
      console.log(`   ---`);
    });
  }

  await mongoose.disconnect();
}

main();
