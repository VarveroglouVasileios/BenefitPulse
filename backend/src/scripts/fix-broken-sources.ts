/**
 * Migration script to fix broken/404 sources
 * 
 * Updates existing Source records in DB with correct URLs
 * and removes duplicates
 */

import { connectMongo } from "../db/mongo";
import { Source } from "../models/source.model";

interface SourceUpdate {
  name: string;
  oldUrl: string;
  newUrl: string;
  enabled?: boolean;
}

const URL_FIXES: SourceUpdate[] = [
  // ΑΣΕΠ fixes
  {
    name: "ΑΣΕΠ - Νέα",
    oldUrl: "https://www.asep.gr/guide/news.xml",
    newUrl: "https://info.asep.gr/feed.xml",
    enabled: true,
  },
  {
    name: "ASEP Announcements",
    oldUrl: "https://www.asep.gr/rss/news",
    newUrl: "https://info.asep.gr/feed.xml",
    enabled: true,
  },
  {
    name: "ΑΣΕΠ - Αρχείο Ανακοινώσεων ΣΟΧ & ΣΜΕ",
    oldUrl: "https://info.asep.gr/archive/announcements/sox-sme",
    newUrl: "https://info.asep.gr/arheio-anakoinoseon-soh-sme",
    enabled: true,
  },
  {
    name: "ΑΣΕΠ - Αρχείο Δελτίων Τύπου",
    oldUrl: "https://info.asep.gr/archive/press-releases",
    newUrl: "https://info.asep.gr/archive/announcements",
    enabled: true,
  },
  // ΔΥΠΑ fixes
  {
    name: "ΔΥΠΑ - Δελτία Τύπου",
    oldUrl: "https://www.dypa.gov.gr/deltia-typou?format=feed&type=rss",
    newUrl: "https://www.dypa.gov.gr/feed-pr",
    enabled: true,
  },
  // ΑΑΔΕ fixes
  {
    name: "myΘέρμανση (EN - broken)",
    oldUrl: "https://www.aade.gr/en/mythermansi",
    newUrl: "https://www.aade.gr/mythermansi",
    enabled: false, // Disable broken EN version (we have Greek version)
  },
  // ESPA fixes
  {
    name: "ESPA Antagonistikotita",
    oldUrl: "http://epan2.antagonistikotita.gr/uploads/rss.xml",
    newUrl: "https://www.antagonistikotita.gr/feed/",
    enabled: true,
  },
  {
    name: "ESPA Fisheries",
    oldUrl: "https://alieia.mc.gov.gr/metra-eniksis-tis-alieias/",
    newUrl: "https://ospa.minagric.gr/metra-eniksis-tis-alieias/",
    enabled: true,
  },
  // OPEKA fixes
  {
    name: "Oikogeneia - Οικογενειακά Επιδόματα",
    oldUrl: "https://www.oikogeneia.gov.gr/",
    newUrl: "https://opeka.gr/oikogeneia/epidoma-paidiou-a21/",
    enabled: true,
  },
  {
    name: "OPEKA - Ανακοινώσεις",
    oldUrl: "https://opeka.gr/",
    newUrl: "https://opeka.gr/category/anakoinoseis/",
    enabled: true,
  },
  {
    name: "OPEKA - Δελτία Τύπου",
    oldUrl: "https://opeka.gr/",
    newUrl: "https://opeka.gr/category/deltia-typou/",
    enabled: true,
  },
  // Prosvasis fixes - disable broken more-* pages
  {
    name: "ΔΥΠΑ Prosvasis - Κατάρτιση",
    oldUrl: "https://prosvasis.dypa.gov.gr/more-katartisi",
    newUrl: "https://prosvasis.dypa.gov.gr/more-katartisi",
    enabled: false, // Disable broken URL
  },
  {
    name: "ΔΥΠΑ Prosvasis - Ανεργία & Παροχές",
    oldUrl: "https://prosvasis.dypa.gov.gr/more-anerghia",
    newUrl: "https://prosvasis.dypa.gov.gr/more-anerghia",
    enabled: false, // Disable broken URL
  },
  {
    name: "ΔΥΠΑ Prosvasis - Προγράμματα Απασχόλησης",
    oldUrl: "https://prosvasis.dypa.gov.gr/more-programmata-apasxolisis",
    newUrl: "https://prosvasis.dypa.gov.gr/active-employment-policies",
    enabled: true,
  },
  {
    name: "ΔΥΠΑ Prosvasis - Εργαλειοθήκη Εργοδότη",
    oldUrl: "https://prosvasis.dypa.gov.gr/more-ergaleiothiki-ergodoti",
    newUrl: "https://prosvasis.dypa.gov.gr/erghaleiothiki-erghodoti",
    enabled: true,
  },
  {
    name: "ΔΥΠΑ Prosvasis - Κοινωνική Πολιτική",
    oldUrl: "https://prosvasis.dypa.gov.gr/more-koinoniki-politiki",
    newUrl: "https://prosvasis.dypa.gov.gr/more-koinonikes-parokhes",
    enabled: true,
  },
  // Φοιτητικό Στεγαστικό fixes
  {
    name: "Φοιτητικό Στεγαστικό",
    oldUrl: "https://portal.stegastiko.minedu.gov.gr/index",
    newUrl: "https://portal.stegastiko.minedu.gov.gr/",
    enabled: true,
  },
  // Diavgeia API fix
  {
    name: "Διαύγεια API (opendata search)",
    oldUrl: "https://opendata.diavgeia.gov.gr/luminapi/api/search/export?q=subject%3A%28%CE%B5%CF%80%CE%AF%CE%B4%CE%BF%CE%BC%CE%B1+OR+%CE%B5%CF%80%CE%B9%CE%B4%CF%8C%CF%84%CE%B7%CF%83%CE%B7+OR+voucher+OR+pass+OR+youth+pass+OR+tourism4all+OR+north+evia+pass+OR+thessaly-evros+pass%29&wt=json&rows=50&start=0",
    newUrl: 'https://diavgeia.gov.gr/luminapi/opendata/search?q=subject:(επίδομα OR επιδότηση OR voucher OR pass OR "youth pass" OR "tourism4all" OR "north evia pass")&wt=json',
    enabled: true,
  },
  // EFKA fix
  {
    name: "e-ΕΦΚΑ Επιδόματα",
    oldUrl: "https://www.e-efka.gov.gr/el/epidomata",
    newUrl: "https://www.efka.gov.gr/el/epidomata",
    enabled: true,
  },
  // OPEKA fix
  {
    name: "OPEKA Επιδόματα",
    oldUrl: "https://opeka.gr/epidomata/",
    newUrl: "https://www.opeka.gr/epidomata/",
    enabled: true,
  },
  // Diavgeia Search RSS (fallback) fix
  {
    name: "Διαύγεια Search RSS (fallback)",
    oldUrl: "https://diavgeia.gov.gr/luminapi/api/feed/rss?q=(%CE%B5%CF%80%CE%AF%CE%B4%CE%BF%CE%BC%CE%B1%20OR%20voucher%20OR%20pass)",
    newUrl: 'https://diavgeia.gov.gr/luminapi/api/feed/rss?q=q%3A%22%CE%B5%CF%80%CE%AF%CE%B4%CE%BF%CE%BC%CE%B1%22',
    enabled: true,
  },
  // ESPA Fisheries fix
  {
    name: "ESPA Fisheries",
    oldUrl: "https://ospa.minagric.gr/metra-eniksis-tis-alieias/",
    newUrl: "https://alieia.gr/feed/",
    enabled: true,
  },
  // Disable known problematic sources
  {
    name: "ESPA Antagonistikotita",
    oldUrl: "https://www.antagonistikotita.gr/feed/",
    newUrl: "https://www.antagonistikotita.gr/feed/",
    enabled: false, // Timeout
  },
  {
    name: "MITOS - EMDD API",
    oldUrl: "https://api.digigov.grnet.gr/v1",
    newUrl: "https://api.digigov.grnet.gr/v1",
    enabled: false, // Needs API key
  },
  {
    name: "MITOS - EMDD API (Services)",
    oldUrl: "https://api.digigov.grnet.gr/v1/services",
    newUrl: "https://api.digigov.grnet.gr/v1/services",
    enabled: false, // Needs API key
  },
];

async function fixBrokenSources() {
  await connectMongo();

  console.log("🔧 Fixing broken/404 sources...\n");

  let updated = 0;
  let disabled = 0;
  let duplicatesRemoved = 0;

  // Fix URLs
  for (const fix of URL_FIXES) {
    const sources = await Source.find({
      name: fix.name,
      url: fix.oldUrl,
    });

    if (sources.length > 0) {
      console.log(`📝 Updating "${fix.name}"`);
      console.log(`   ${fix.oldUrl}`);
      console.log(`   → ${fix.newUrl}`);
      
      // Update all matching sources
      for (const source of sources) {
        source.url = fix.newUrl;
        if (fix.enabled !== undefined) {
          source.enabled = fix.enabled;
        }
        source.consecutiveFailures = 0; // Reset failures
        await source.save();
        updated++;
        
        if (!fix.enabled) {
          disabled++;
        }
      }
    }
  }

  // Remove duplicates (same name, different URLs - keep the one with correct URL)
  const allSources = await Source.find({});
  const sourcesByName = new Map<string, typeof allSources>();

  for (const source of allSources) {
    if (!sourcesByName.has(source.name)) {
      sourcesByName.set(source.name, []);
    }
    sourcesByName.get(source.name)!.push(source);
  }

  for (const [name, sources] of sourcesByName.entries()) {
    if (sources.length > 1) {
      console.log(`\n🔍 Found ${sources.length} duplicates for "${name}"`);
      
      // Find the correct URL from our fixes
      const fix = URL_FIXES.find(f => f.name === name);
      const correctUrl = fix?.newUrl;
      
      if (correctUrl) {
        // Keep the one with correct URL, disable others
        const correctSource = sources.find(s => s.url === correctUrl);
        const wrongSources = sources.filter(s => s.url !== correctUrl);
        
        if (correctSource && wrongSources.length > 0) {
          console.log(`   ✅ Keeping: ${correctSource.url}`);
          for (const wrongSource of wrongSources) {
            console.log(`   ❌ Disabling duplicate: ${wrongSource.url}`);
            wrongSource.enabled = false;
            await wrongSource.save();
            duplicatesRemoved++;
          }
        }
      } else {
        // No fix available - keep the most recent one, disable others
        const sorted = sources.sort((a, b) => 
          (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0)
        );
        const keepSource = sorted[0];
        const disableSources = sorted.slice(1);
        
        console.log(`   ✅ Keeping most recent: ${keepSource.url}`);
        for (const disableSource of disableSources) {
          console.log(`   ❌ Disabling duplicate: ${disableSource.url}`);
          disableSource.enabled = false;
          await disableSource.save();
          duplicatesRemoved++;
        }
      }
    }
  }

  // Auto-disable sources with 3+ consecutive failures
  const failedSources = await Source.find({
    consecutiveFailures: { $gte: 3 },
    enabled: true,
  });

  if (failedSources.length > 0) {
    console.log(`\n⚠️  Auto-disabling ${failedSources.length} sources with 3+ consecutive failures:`);
    for (const source of failedSources) {
      console.log(`   ❌ ${source.name} (${source.consecutiveFailures} failures)`);
      source.enabled = false;
      await source.save();
      disabled++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 MIGRATION SUMMARY");
  console.log("=".repeat(60));
  console.log(`✅ Updated URLs: ${updated}`);
  console.log(`❌ Disabled sources: ${disabled}`);
  console.log(`🔄 Removed duplicates: ${duplicatesRemoved}`);
  console.log("=".repeat(60) + "\n");
}

if (require.main === module) {
  fixBrokenSources()
    .then(() => {
      console.log("✅ Migration completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Migration failed:", error);
      process.exit(1);
    });
}

export { fixBrokenSources };

