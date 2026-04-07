
import { computeStatus } from "./status-engine";
import { classifyKindAndType } from "../modules/ingestion/cleaner";

async function runSystemSmokeTest() {
  console.log("🧪 Running System Readiness Smoke Test (April 2026)...\n");

  const now = new Date("2026-04-05T12:00:00Z"); // Today
  
  const scenarios = [
    {
      title: "Fuel Pass III - Οικονομική Ενίσχυση για Καύσιμα",
      content: "Η πλατφόρμα vouchers.gov.gr ανοίγει στις 6 Απριλίου 2026 για αιτήσεις Fuel Pass.",
      url: "https://vouchers.gov.gr/fuelpass3",
      expectedKind: "voucher_pass",
      expectedAppStatus: "upcoming"
    },
    {
      title: "Youth Pass 2026 - Αιτήσεις για 150 ευρώ",
      content: "Ξεκίνησαν στις 3 Απριλίου οι αιτήσεις για το Youth Pass.",
      url: "https://vouchers.gov.gr/youthpass",
      expectedKind: "voucher_pass",
      expectedAppStatus: "open"
    },
    {
      title: "Προκήρυξη 1Κ/2026 - 510 Μόνιμες Θέσεις",
      content: "Υποβολή αιτήσεων από 1/4 έως 15/4 για το ΑΣΕΠ.",
      url: "https://info.asep.gr/1k2026",
      expectedKind: "program", // ASEP logic
      expectedAppStatus: "open"
    }
  ];

  let allPassed = true;

  for (const sc of scenarios) {
    console.log(`Testing Scenario: "${sc.title}"`);
    
    // 1. Check Classification
    const classification = classifyKindAndType(sc.title, sc.content, sc.url);
    console.log(`- Classified as Kind: ${classification.kind}, Type: ${classification.type}`);
    
    if (classification.kind !== sc.expectedKind) {
      console.log(`❌ FAILED: Expected kind ${sc.expectedKind} but got ${classification.kind}`);
      allPassed = false;
    } else {
      console.log(`✅ Classification OK`);
    }

    // 2. Check Status logic
    // Simulate dates found by cleaner
    let appStart = null;
    let appEnd = null;
    if (sc.title.includes("Fuel Pass")) appStart = new Date("2026-04-06T00:00:00Z");
    if (sc.title.includes("Youth Pass")) appStart = new Date("2026-04-03T00:00:00Z");
    if (sc.title.includes("1Κ/2026")) {
        appStart = new Date("2026-04-01T00:00:00Z");
        appEnd = new Date("2026-04-15T23:59:59Z");
    }

    const status = computeStatus({
      applicationStartAt: appStart,
      applicationEndAt: appEnd,
      title: sc.title
    }, now);

    console.log(`- Status: ${status.applicationStatus}, General Status: ${status.status}`);
    
    if (status.applicationStatus !== sc.expectedAppStatus) {
      console.log(`❌ FAILED: Expected appStatus ${sc.expectedAppStatus} but got ${status.applicationStatus}`);
      allPassed = false;
    } else {
      console.log(`✅ Status Logic OK`);
    }
    console.log("-----------------------------------\n");
  }

  if (allPassed) {
    console.log("🎉 ALL SCENARIOS PASSED! The system is ready for the next run.");
  } else {
    console.log("⚠️ SOME SCENARIOS FAILED. Review classification and status rules.");
  }
  
  process.exit(allPassed ? 0 : 1);
}

runSystemSmokeTest().catch(console.error);
