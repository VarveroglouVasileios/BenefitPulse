
import mongoose from "mongoose";
import { Source } from "../models/source.model";

const DEV_URI = "mongodb+srv://varveroglouvas_db_user:Paokara141187@benefitpulse.oox9dvm.mongodb.net/benefitpulse_dev";

async function main() {
  console.log("🧹 Starting Development database cleanup...");
  await mongoose.connect(DEV_URI);

  const sources = await Source.find({}).sort({ updatedAt: -1 }).lean();
  const seenNames = new Set<string>();
  const toDelete: mongoose.Types.ObjectId[] = [];

  for (const s of sources) {
    const normName = s.name.toLowerCase().trim();
    if (seenNames.has(normName)) {
      console.log(`   🗑️  Marking duplicate for deletion: "${s.name}" (URL: ${s.url})`);
      toDelete.push(s._id);
    } else {
      seenNames.add(normName);
    }
  }

  if (toDelete.length > 0) {
    const result = await Source.deleteMany({ _id: { $in: toDelete } });
    console.log(`\n✅ Cleaned up ${result.deletedCount} duplicate sources.`);
  } else {
    console.log("\n✅ No duplicates found to clean up.");
  }

  // Double check for duplicate URLs even if names are different
  const sourcesByUrl = await Source.find({}).sort({ updatedAt: -1 }).lean();
  const seenUrls = new Set<string>();
  const toDeleteByUrl: mongoose.Types.ObjectId[] = [];

  for (const s of sourcesByUrl) {
    const normUrl = s.url.toLowerCase().trim();
    if (seenUrls.has(normUrl)) {
      console.log(`   🗑️  Marking duplicate URL for deletion: "${s.name}" (URL: ${s.url})`);
      toDeleteByUrl.push(s._id);
    } else {
      seenUrls.add(normUrl);
    }
  }

  if (toDeleteByUrl.length > 0) {
    const result = await Source.deleteMany({ _id: { $in: toDeleteByUrl } });
    console.log(`✅ Cleaned up ${result.deletedCount} duplicate URLs.`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main();
