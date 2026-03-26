import { Opportunity } from '../models/opportunity.model';
import { connectMongo } from '../db/mongo';

/**
 * Massive Cleanup Script for BenefitPulse Production
 * 
 * Actions:
 * 1. Delete very old items (2021-2024)
 * 2. Archive recently expired ASEP (1K/2026, 2K/2026)
 * 3. Clean up title artifacts ("σύνδεσμος")
 * 4. Deduplicate items with same officialUrl
 */
async function cleanupProduction() {
  try {
    await connectMongo();
    console.log('🔗 Connected to MongoDB');

    // 1. Delete items referencing past years in title (stale news/vouchers)
    const staleYears = [/2021/, /2022/, /2023/, /2024/];
    let deletedCount = 0;
    for (const year of staleYears) {
      const res = await Opportunity.deleteMany({ title: { $regex: year } });
      deletedCount += res.deletedCount;
    }
    console.log(`🧹 Deleted ${deletedCount} stale items from 2021-2024`);

    // 2. Archive expired ASEP competitions (1K and 2K)
    const expiredAsep = await Opportunity.updateMany(
      { 
        title: { $regex: /1Κ\/2026|2Κ\/2026/i },
        applicationStatus: { $ne: 'closed' }
      },
      { 
        $set: { 
          applicationStatus: 'closed',
          status: 'archived',
          updatedAt: new Date()
        } 
      }
    );
    console.log(`📁 Archived ${expiredAsep.modifiedCount} expired ASEP items (1K/2026, 2K/2026)`);

    // 3. Clean up titles ending with "σύνδεσμος"
    const withSinedesmos = await Opportunity.find({ title: { $regex: /σύνδεσμος$/i } });
    let cleanedTitles = 0;
    for (const opp of withSinedesmos) {
      opp.title = opp.title.replace(/\s+σύνδεσμος$/i, '').trim();
      await opp.save();
      cleanedTitles++;
    }
    console.log(`✨ Cleaned "σύνδεσμος" artifact from ${cleanedTitles} titles`);

    // 4. Deduplicate: Keep only the most recently updated item for each officialUrl
    const allOpps = await Opportunity.find({ status: 'published' }).sort({ updatedAt: -1 });
    const seenUrls = new Set<string>();
    let duplicatesRemoved = 0;

    for (const opp of allOpps) {
      if (seenUrls.has(opp.officialUrl)) {
        await Opportunity.deleteOne({ _id: opp._id });
        duplicatesRemoved++;
      } else {
        seenUrls.add(opp.officialUrl);
      }
    }
    console.log(`👯 Removed ${duplicatesRemoved} duplicate items based on URL`);

    console.log('✅ Production cleanup completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

cleanupProduction();
