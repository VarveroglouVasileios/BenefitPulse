
import { extractOpportunity } from "../modules/ingestion/extractor";
import { config } from "../config/env";

async function runComprehensiveAITest() {
  console.log("🧪 Starting Comprehensive AI Model Test...\n");
  console.log(`Primary Model: ${config.googleAi.model}`);
  console.log(`Groq Fallback: ${config.groq.model}\n`);

  const scenarios = [
    {
      name: "Market Pass 2026",
      content: "Νέος κύκλος Market Pass αναμένεται για το 2026. Η κυβερνητική απόφαση προβλέπει αιτήσεις από τον Σεπτέμβριο του 2026 για ευάλωτα νοικοκυριά."
    },
    {
      name: "ΑΣΕΠ 1Κ/2026",
      content: "Προκήρυξη 1Κ/2026 για την πλήρωση 510 μόνιμων θέσεων. Οι αιτήσεις υποβάλλονται ηλεκτρονικά έως τις 15 Απριλίου 2026."
    },
    {
      name: "System Update (Irrelevant)",
      content: "Το πληροφοριακό σύστημα θα παραμείνει εκτός λειτουργίας την Κυριακή λόγω προγραμματισμένης συντήρησης."
    }
  ];

  for (const sc of scenarios) {
    console.log(`--- Testing Scenario: ${sc.name} ---`);
    try {
      const result = await extractOpportunity(sc.content);
      
      console.log("FULL DATA RETURNED:");
      console.log(JSON.stringify({
        title: result.title,
        type: result.type,
        status: result.status,
        deadline: result.deadlineAt ? result.deadlineAt.toISOString() : null,
        tags: result.tags,
        confidence: result.confidence,
        isIrrelevant: result.isIrrelevant,
        summary: result.summary
      }, null, 2));
      
      console.log("\nQuick Check:");
      if (sc.name === "Market Pass 2026") {
        console.log((result.status as string) === "expected" || (result.status as string) === "upcoming" ? "✅ Correct Status (Future)" : "❌ Wrong Status");
      }
      if (sc.name === "ΑΣΕΠ 1Κ/2026") {
        console.log(result.type === "asep_competition" ? "✅ Correct Type (ASEP)" : "❌ Wrong Type");
      }
      if (sc.name.includes("Irrelevant")) {
        console.log(result.isIrrelevant ? "✅ Correctly Flagged as Irrelevant" : "❌ Should be Irrelevant");
      }
    } catch (error: any) {
      console.error(`❌ Error in scenario ${sc.name}:`, error.message);
    }
    console.log("-------------------------------------------\n");
  }

  process.exit(0);
}

runComprehensiveAITest();
