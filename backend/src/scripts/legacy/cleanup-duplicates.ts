import { connectMongo } from "../db/mongo";
import { Source } from "../models/source.model";

async function main() {
  process.env.MONGODB_URI = "mongodb+srv://varveroglouvas_db_user:Paokara141187@benefitpulse.oox9dvm.mongodb.net/benefitpulse";
  const { connectMongo } = await import("../db/mongo");
  await connectMongo();
  
  const allSources = await Source.find({});
  const sourcesByUrl = new Map<string, any[]>();

  for (const s of allSources) {
    const url = s.url.toLowerCase().trim();
    if (!sourcesByUrl.has(url)) sourcesByUrl.set(url, []);
    sourcesByUrl.get(url)!.push(s);
  }

  console.log(`🔍 Checking duplicates for ${sourcesByUrl.size} unique URLs...`);

  let removed = 0;
  for (const [url, sources] of sourcesByUrl.entries()) {
    if (sources.length > 1) {
      // Sort by updatedAt descending, keep the most recent one
      const sorted = sources.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      const keep = sorted[0];
      const toRemove = sorted.slice(1);

      console.log(`♻️  Duplicates for ${url}: keeping ${keep._id}, removing ${toRemove.length}`);
      
      for (const s of toRemove) {
        await Source.deleteOne({ _id: s._id });
        removed++;
      }
    }
  }

  console.log(`✅ Removed ${removed} duplicate sources.`);
  
  // Also remove sources with known dead domains
  const deadDomains = ["ospa.minagric.gr", "alieia.mc.gov.gr", "epan2.antagonistikotita.gr"];
  let deadRemoved = 0;
  for (const domain of deadDomains) {
    const res = await Source.deleteMany({ url: { $regex: domain } });
    deadRemoved += res.deletedCount;
  }
  console.log(`🧹 Removed ${deadRemoved} sources with dead domains.`);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
