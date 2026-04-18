
import { connectMongo } from "../db/mongo";
import { Opportunity } from "../models/opportunity.model";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🔄 Connecting to MongoDB...");
  await connectMongo();
  console.log("✅ Connected\n");

  const correctDataPath = path.resolve(__dirname, "..", "..", "..", "CorrectData.txt");
  if (!fs.existsSync(correctDataPath)) {
    console.error("❌ CorrectData.txt not found at", correctDataPath);
    process.exit(1);
  }

  const content = fs.readFileSync(correctDataPath, "utf-8");
  const urlMatches = content.match(/Link\s+:\s+(https?:\/\/[^\s]+)/g);
  
  if (!urlMatches) {
    console.error("❌ No URLs found in CorrectData.txt");
    process.exit(1);
  }

  const expectedUrls = urlMatches.map(m => m.replace(/Link\s+:\s+/, "").trim());
  const uniqueUrls = Array.from(new Set(expectedUrls));

  console.log(`🔎 Auditing ${uniqueUrls.length} unique URLs from CorrectData.txt against production DB...\n`);

  const results = [];
  for (const url of uniqueUrls) {
    const opp = await Opportunity.findOne({
      $or: [
        { originalUrl: url },
        { sourceUrl: url }
      ],
      deletedAt: null
    });

    results.push({
      url,
      found: !!opp,
      status: opp?.status || "N/A",
      title: opp?.title || "N/A"
    });
  }

  const foundCount = results.filter(r => r.found).length;
  const publishedCount = results.filter(r => r.status === "published").length;

  console.log("📊 Results Summary:");
  console.log(`   Found in DB: ${foundCount}/${uniqueUrls.length}`);
  console.log(`   Published: ${publishedCount}/${uniqueUrls.length}\n`);

  if (foundCount < uniqueUrls.length) {
    console.log("❌ Missing URLs:");
    results.filter(r => !r.found).forEach(r => console.log(`   - ${r.url}`));
    console.log();
  }

  if (publishedCount < foundCount) {
    console.log("⚠️  Unpublished URLs (Draft/Archived):");
    results.filter(r => r.found && r.status !== "published").forEach(r => {
      console.log(`   - [${r.status}] ${r.title}`);
      console.log(`     URL: ${r.url}`);
    });
    console.log();
  }

  if (foundCount === uniqueUrls.length && publishedCount === uniqueUrls.length) {
    console.log("✅ All URLs from CorrectData.txt are present and published in the DB!");
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
