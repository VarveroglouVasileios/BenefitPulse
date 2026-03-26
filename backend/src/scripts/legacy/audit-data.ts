import mongoose from "mongoose";
import { Opportunity } from "../models/opportunity.model";
import { config } from "../config/env";

async function main() {
  await mongoose.connect(config.mongodb.uri);
  
  const opportunities = await Opportunity.find({ deletedAt: null }).sort({ createdAt: -1 }).lean();
  
  console.log(`\n📊 DATABASE AUDIT: Found ${opportunities.length} active opportunities.\n`);

  const stats = {
    published: 0,
    draft: 0,
    expired: 0,
    archived: 0,
    rejected: 0
  };

  const urlMap = new Map<string, any[]>();
  const titleMap = new Map<string, any[]>();

  for (const opp of opportunities) {
    // Count by status
    const status = opp.status as keyof typeof stats;
    if (stats[status] !== undefined) stats[status]++;
    
    // Check expiration
    if (opp.deadlineAt && new Date(opp.deadlineAt) < new Date()) {
      stats.expired++;
    }

    // Check for duplicate URLs
    const normUrl = opp.officialUrl.toLowerCase().trim();
    if (!urlMap.has(normUrl)) urlMap.set(normUrl, []);
    urlMap.get(normUrl)!.push(opp);

    // Check for duplicate Titles
    const normTitle = opp.title.toLowerCase().trim();
    if (!titleMap.has(normTitle)) titleMap.set(normTitle, []);
    titleMap.get(normTitle)!.push(opp);
  }

  console.log(`📈 STATUS BREAKDOWN:`);
  console.log(`   - Published: ${stats.published}`);
  console.log(`   - Draft:     ${stats.draft}`);
  console.log(`   - Rejected:  ${stats.rejected}`);
  console.log(`   - Expired:   ${stats.expired} (based on deadlineAt)`);

  console.log(`\n⚠️  DUPLICATE URLS:`);
  let dupUrls = 0;
  for (const [url, matches] of urlMap.entries()) {
    if (matches.length > 1) {
      console.log(`   ❌ [${matches.length} items] URL: ${url}`);
      matches.forEach(m => console.log(`      - ID: ${m._id} | Title: ${m.title.substring(0, 50)}...`));
      dupUrls++;
    }
  }
  if (dupUrls === 0) console.log("   ✅ None found.");

  console.log(`\n⚠️  DUPLICATE TITLES:`);
  let dupTitles = 0;
  for (const [title, matches] of titleMap.entries()) {
    if (matches.length > 1) {
      // Check if they have different URLs (different opportunities but same name?)
      const uniqueUrls = new Set(matches.map(m => m.officialUrl));
      if (uniqueUrls.size > 1) {
        console.log(`   ❌ [${matches.length} items] Title: "${title}"`);
        matches.forEach(m => console.log(`      - ID: ${m._id} | URL: ${m.officialUrl}`));
        dupTitles++;
      }
    }
  }
  if (dupTitles === 0) console.log("   ✅ None found.");

  // Sample 5 items for manual verification
  console.log(`\n🔍 SAMPLE FOR VERIFICATION (Top 5):`);
  opportunities.slice(0, 5).forEach((opp, i) => {
    console.log(`${i+1}. ${opp.title}`);
    console.log(`   URL: ${opp.officialUrl}`);
    console.log(`   Status: ${opp.status} | App Status: ${opp.applicationStatus}`);
    console.log(`   Deadline: ${opp.deadlineAt || 'N/A'}`);
    console.log(`   Summary: ${opp.summary?.substring(0, 150)}...`);
    console.log();
  });

  await mongoose.disconnect();
  process.exit(0);
}

main();
