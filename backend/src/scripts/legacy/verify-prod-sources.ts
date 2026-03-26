
import mongoose from "mongoose";
import { Source } from "../models/source.model";

const PROD_URI = "mongodb+srv://varveroglouvas_db_user:Paokara141187@benefitpulse.oox9dvm.mongodb.net/benefitpulse";

async function main() {
  console.log("🔍 Fetching final sources from Production database...");
  
  await mongoose.connect(PROD_URI);
  const sources = await Source.find({}).sort({ name: 1 }).lean();
  
  console.log(`\n📊 Total Sources in Production: ${sources.length}\n`);

  console.log(`${"Name".padEnd(50)} | ${"Type".padEnd(15)} | ${"Status".padEnd(8)} | ${"URL"}`);
  console.log("-".repeat(120));

  const urlMap = new Map<string, string[]>();
  const nameMap = new Map<string, string[]>();

  for (const s of sources) {
    const status = s.enabled ? "✅" : "❌";
    console.log(`${String(s.name).padEnd(50)} | ${String(s.type).padEnd(15)} | ${status.padEnd(8)} | ${s.url}`);
    
    // Check for duplicate URLs
    const normUrl = s.url.toLowerCase().trim();
    if (!urlMap.has(normUrl)) urlMap.set(normUrl, []);
    urlMap.get(normUrl)!.push(s.name);

    // Check for duplicate Names
    const normName = s.name.toLowerCase().trim();
    if (!nameMap.has(normName)) nameMap.set(normName, []);
    nameMap.get(normName)!.push(s.url);
  }

  console.log("\n⚠️  DUPLICATE CHECKS:");
  
  let dupUrls = 0;
  for (const [url, names] of urlMap.entries()) {
    if (names.length > 1) {
      console.log(`   ❌ Duplicate URL [${url}]: used by [${names.join(", ")}]`);
      dupUrls++;
    }
  }

  let dupNames = 0;
  for (const [name, urls] of nameMap.entries()) {
    if (urls.length > 1) {
      console.log(`   ❌ Duplicate Name [${name}]: points to [${urls.join(", ")}]`);
      dupNames++;
    }
  }

  if (dupUrls === 0 && dupNames === 0) {
    console.log("   ✅ No duplicates found.");
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
