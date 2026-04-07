import { checkSourceHealth } from "../modules/ingestion/source-health-check";
import * as fs from "fs";
import * as path from "path";

async function run() {
  const dataPath = path.join(__dirname, "../../data-and-sources.json");
  if (!fs.existsSync(dataPath)) {
    console.error("data-and-sources.json not found at: " + dataPath);
    return;
  }

  const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const sources = data.sourcesSeed || [];

  console.log(`\n🔍 Checking ${sources.length} sources...\n`);

  for (const source of sources) {
    if (!source.enabled) continue;
    
    process.stdout.write(`  📡 Checking ${source.name.padEnd(45)} ... `);
    try {
      const result = await checkSourceHealth(source.url, source.type);
      if (result.healthy) {
        console.log("✅ OK" + (result.replacementUrl ? ` (Rewritten to ${result.replacementUrl})` : ""));
      } else {
        console.log(`❌ FAILED: ${result.reason}`);
      }
    } catch (err: any) {
      console.log(`❌ ERROR: ${err.message}`);
    }
  }
}

run().catch(console.error);
