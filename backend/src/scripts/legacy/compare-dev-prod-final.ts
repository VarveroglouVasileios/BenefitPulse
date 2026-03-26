
import mongoose from "mongoose";
import { Source } from "../models/source.model";

const PROD_URI = "mongodb+srv://varveroglouvas_db_user:Paokara141187@benefitpulse.oox9dvm.mongodb.net/benefitpulse";
const DEV_URI = "mongodb+srv://varveroglouvas_db_user:Paokara141187@benefitpulse.oox9dvm.mongodb.net/benefitpulse_dev";

async function getSources(uri: string) {
  const conn = await mongoose.createConnection(uri).asPromise();
  const SourceModel = conn.model("Source", Source.schema);
  const sources = await SourceModel.find({}).lean();
  await conn.close();
  return sources;
}

async function main() {
  console.log("🔍 Final Comparison: PROD vs DEV Databases...\n");
  
  const prodSources = await getSources(PROD_URI);
  const devSources = await getSources(DEV_URI);

  console.log(`📊 Stats:`);
  console.log(`   - Production:  ${prodSources.length} sources`);
  console.log(`   - Development: ${devSources.length} sources`);

  const prodMap = new Map(prodSources.map(s => [s.name, s]));
  const devMap = new Map(devSources.map(s => [s.name, s]));

  const allNames = Array.from(new Set([...prodMap.keys(), ...devMap.keys()])).sort();

  let differences = 0;

  console.log(`\n${"Source Name".padEnd(50)} | ${"Status".padEnd(10)} | ${"Match?"}`);
  console.log("-".repeat(80));

  for (const name of allNames) {
    const prod = prodMap.get(name);
    const dev = devMap.get(name);

    if (!prod || !dev) {
      console.log(`❌ ${name.padEnd(50)} | MISSING    | NO (Missing in one DB)`);
      differences++;
      continue;
    }

    const urlMatch = prod.url === dev.url;
    const enabledMatch = prod.enabled === dev.enabled;
    const typeMatch = prod.type === dev.type;

    if (urlMatch && enabledMatch && typeMatch) {
      // Perfect match, optionally skip printing to keep output clean
      // console.log(`✅ ${name.padEnd(50)} | ${prod.enabled ? 'Enabled' : 'Disabled'} | YES`);
    } else {
      console.log(`⚠️  ${name.padEnd(50)} | ${prod.enabled ? 'E' : 'D'} vs ${dev.enabled ? 'E' : 'D'} | NO (Data Mismatch)`);
      if (!urlMatch) console.log(`      - URL mismatch: Prod: ${prod.url} | Dev: ${dev.url}`);
      differences++;
    }
  }

  if (differences === 0) {
    console.log("\n✨ SUCCESS: Databases are 100% synchronized!");
  } else {
    console.log(`\n⚠️ Found ${differences} differences between the databases.`);
  }

  process.exit(0);
}

main();
