
import { connectMongo } from "../db/mongo";
import { Opportunity } from "../models/opportunity.model";
import { cleanAndValidate } from "../modules/ingestion/cleaner";

async function finalFixes() {
  await connectMongo();
  console.log("✅ Connected to MongoDB");

  const now = new Date();
  const nowIso = now.toISOString();

  // 1. FORCE ARCHIVE EXPIRED MONTHS
  console.log("🔍 Checking for expired months in titles...");
  const published = await Opportunity.find({ status: "published" });
  let archivedCount = 0;

  for (const opp of published) {
    const cleanerResult = cleanAndValidate({
      nowIso,
      source: opp.source,
      sourceUrl: opp.officialUrl,
      itemUrl: opp.officialUrl,
      rawTitle: opp.title,
      rawContent: "minimal content",
      rawFetchedAtIso: nowIso,
    });

    if (cleanerResult.applicationStatus === "expired" || cleanerResult.status === "archived") {
      console.log(`   📦 Archiving: ${opp.title}`);
      await Opportunity.updateOne({ _id: opp._id }, { $set: { status: "archived" } });
      archivedCount++;
    }
  }
  console.log(`✅ Force archived ${archivedCount} opportunities.`);

  // 2. LOG ASEP STATUS
  const asepMissing = await Opportunity.find({ 
    source: /asep/i, 
    status: "published",
    summary: /δεν υπάρχει περιγραφή/i 
  });
  console.log(`📊 Found ${asepMissing.length} ASEP opportunities with missing description.`);
  
  for (const asep of asepMissing) {
      console.log(`   🔗 Missing content for: ${asep.title} (${asep.officialUrl})`);
  }

  process.exit(0);
}

finalFixes().catch(err => {
  console.error(err);
  process.exit(1);
});
