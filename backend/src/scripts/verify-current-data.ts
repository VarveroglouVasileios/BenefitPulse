import { connectMongo } from "../db/mongo";
import { Opportunity } from "../models/opportunity.model";
import mongoose from "mongoose";

async function main() {
  await connectMongo();

  const keywords = ["Tourism for All", "Youth Pass", "Απολιγνιτοποίηση", "Κοινωνικός Τουρισμός", "Επιχειρηματικότητα", "AI", "Cybersecurity", "Thessaly-Evros"];
  
  console.log("🔎 Searching database for key upcoming/active programs...\n");

  for (const kw of keywords) {
    const count = await Opportunity.countDocuments({
      title: { $regex: kw, $options: "i" },
      status: "published"
    });
    console.log(`- keyword "${kw}": ${count} published items found`);
  }

  const recentOpps = await Opportunity.find({
    status: "published",
    createdAt: { $gt: new Date("2026-02-01") }
  }).select("title source publishedAt").limit(10).lean();

  console.log("\n📄 Most recent published opportunities:");
  recentOpps.forEach(o => console.log(`- [${o.publishedAt.toISOString().split('T')[0]}] ${o.title} (${o.source})`));

  await mongoose.disconnect();
}

main();
