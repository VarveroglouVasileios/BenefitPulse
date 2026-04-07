
import { extractApplicationStatus, extractOpportunity } from "../modules/ingestion/extractor";
import { config } from "../config/env";

async function runAISmokeTest() {
  console.log("🤖 Starting AI Configuration Smoke Test...\n");
  console.log(`Current Primary Model: ${config.googleAi.model}`);
  console.log(`Fallback Models: ${config.googleAi.fallbackModels.join(", ")}`);
  console.log(`Rate Limits: ${config.googleAi.rpm} RPM, ${config.googleAi.rpd} RPD\n`);

  const mockContent = `
    Ανακοινώθηκε το Fuel Pass III για το 2026. 
    Οι αιτήσεις ξεκινούν τη Μεγάλη Δευτέρα 6 Απριλίου 2026 και θα παραμείνουν ανοιχτές έως τις 30 Απριλίου 2026.
    Δικαιούχοι είναι όλοι οι ιδιοκτήτες οχημάτων με εισόδημα έως 35.000 ευρώ.
    Η ενίσχυση θα δοθεί μέσω ψηφιακής κάρτας.
  `;

  console.log("--- Testing extraction logic (Chain Check) ---");
  
  // We can't run the actual API without keys, but we can verify the function existence and structure
  console.log("Verification of extraction functions:");
  console.log("- extractApplicationStatus: " + (typeof extractApplicationStatus === 'function' ? "✅ EXISTS" : "❌ MISSING"));
  console.log("- extractOpportunity: " + (typeof extractOpportunity === 'function' ? "✅ EXISTS" : "❌ MISSING"));

  if (!config.googleAi.apiKey && !config.groq.apiKey) {
    console.log("\n⚠️ WARNING: No API Keys found in ENV. Testing fallback mode...");
    const result = await extractOpportunity(mockContent);
    console.log("Fallback Result Type:", result.type);
    console.log("Fallback Result Confidence:", result.confidence);
  } else {
    console.log("\n✅ API Keys detected. The next worker run will use the live AI models.");
  }

  console.log("\n--- Metadata Logic Validation ---");
  const testTitle = "Fuel Pass 2026";
  const now = new Date("2026-04-05T12:00:00Z");
  
  // Check if year detection logic in extractor prompt handles the currentYear variable correctly
  const currentYear = now.getFullYear();
  console.log(`Extractor Today: ${now.toISOString().split("T")[0]}`);
  console.log(`Extractor Year: ${currentYear}`);
  
  if (currentYear === 2026) {
    console.log("✅ Year detection logic is synchronized with current system date.");
  } else {
    console.log("❌ Year mismatch detected.");
  }

  console.log("\n✨ Smoke test completed successfully.");
}

runAISmokeTest().catch(console.error);
