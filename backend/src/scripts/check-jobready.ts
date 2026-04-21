import { connectMongo } from "../db/mongo";
import { Opportunity } from "../models/opportunity.model";
import mongoose from "mongoose";

async function main() {
  await connectMongo();

  console.log("🔎 Searching for 'JobReady' entries...\n");

  const items = await Opportunity.find({
    title: { $regex: "JobReady", $options: "i" },
    status: { $in: ["published", "draft", "archived"] }
  }).select("title source status createdAt").lean();

  if (items.length === 0) {
    console.log("No items found.");
  } else {
    items.forEach((item, index) => {
      console.log(`${index + 1}. [${item.status.toUpperCase()}] ${item.title}`);
      console.log(`   Source: ${item.source}`);
      console.log(`   Created: ${item.createdAt.toISOString()}`);
      console.log(`   ---`);
    });
  }

  await mongoose.disconnect();
}

main();
