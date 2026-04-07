
import { extractOpportunity } from "../modules/ingestion/extractor";
import { cleanAndValidate } from "../modules/ingestion/cleaner";
import { computeStatus } from "./status-engine";
import { connectMongo } from "../db/mongo";

async function runLiveWorkerTest() {
  console.log("🔍 Starting Live Worker Simulation (April 6, 2026)...\n");

  // Scenario 1: The NEW Fuel Pass III (Real Text from vouchers.gov.gr)
  const fuelPassRaw = `
    Fuel Pass 3: Ενίσχυση καυσίμων για τους μήνες Απρίλιο - Μάιο 2026.
    Η πλατφόρμα ανοίγει σήμερα 6/4/2026 στις 17:00. 
    Προθεσμία υποβολής αιτήσεων έως 30/4/2026.
    Ποσά: 50-60 ευρώ.
  `;

  // Scenario 2: The EXPIRED Career Day (The one currently stuck in your feed)
  const expiredEventRaw = `
    51η Ημέρα Καριέρας ΔΥΠΑ στο Βόλο. 
    Σάββατο 7 Φεβρουαρίου στο ξενοδοχείο Volos Palace.
    Ώρα έναρξης 10:00.
  `;

  const cases = [
    { name: "Fuel Pass III", raw: fuelPassRaw, url: "https://vouchers.gov.gr/fuelpass3" },
    { name: "Expired Career Day", raw: expiredEventRaw, url: "https://www.dypa.gov.gr/career-day-volos" }
  ];

  for (const c of cases) {
    console.log(`--- Testing: ${c.name} ---`);
    
    // 1. AI Extraction
    const extracted = await extractOpportunity(c.raw);
    
    // 2. Cleaning & Status Computation
    const cleaned = await cleanAndValidate({
      rawTitle: extracted.title,
      rawContent: c.raw,
      itemUrl: c.url,
      source: "Gov.gr Simulation",
      sourceUrl: "https://vouchers.gov.gr",
      nowIso: new Date("2026-04-06T10:00:00Z").toISOString(),
      rawFetchedAtIso: new Date("2026-04-06T10:00:00Z").toISOString()
    });

    // 3. Final Status Check (The engine we fixed)
    const finalStatus = computeStatus({
      applicationStartAt: cleaned.startAt ? new Date(cleaned.startAt) : undefined,
      applicationEndAt: cleaned.deadlineAt ? new Date(cleaned.deadlineAt) : undefined,
      title: cleaned.title
    }, new Date("2026-04-06T10:00:00Z"));

    console.log(`✅ Resulting Kind: ${cleaned.kind}`);
    console.log(`✅ Application Status: ${finalStatus.applicationStatus}`);
    console.log(`✅ System Status: ${finalStatus.status}`);
    console.log(`✅ Reason: ${finalStatus.reason}`);
    
    if (c.name === "Fuel Pass III") {
      if (cleaned.kind === "voucher_pass" && finalStatus.status === "published") {
        console.log("✨ SUCCESS: Fuel Pass will be VISIBLE in the feed!");
      }
    }
    if (c.name === "Expired Career Day") {
      if (finalStatus.status === "archived") {
        console.log("✨ SUCCESS: Expired event will be REMOVED from the feed!");
      }
    }
    console.log("-------------------------------------------\n");
  }
}

runLiveWorkerTest().catch(console.error);
