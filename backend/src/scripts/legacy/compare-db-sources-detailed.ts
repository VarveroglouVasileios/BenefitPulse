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
  console.log("🔍 Fetching sources from both databases...");
  
  const prodSources = await getSources(PROD_URI);
  const devSources = await getSources(DEV_URI);

  console.log(`\n📊 Database Stats:`);
  console.log(`   - Production (benefitpulse): ${prodSources.length} sources`);
  console.log(`   - Development (benefitpulse_dev): ${devSources.length} sources`);

  const prodMap = new Map(prodSources.map(s => [s.name, s]));
  const devMap = new Map(devSources.map(s => [s.name, s]));

  const allNames = Array.from(new Set([...prodMap.keys(), ...devMap.keys()])).sort();

  console.log(`\n${"═".repeat(100)}`);
  console.log(`  ${"Source Name".padEnd(40)} | ${"Prod Status".padEnd(12)} | ${"Dev Status"}`);
  console.log(`${"═".repeat(100)}`);

  let mismatches = 0;
  let missingInProd = 0;
  let missingInDev = 0;

  for (const name of allNames) {
    const prod = prodMap.get(name);
    const dev = devMap.get(name);

    const prodStatus = prod ? (prod.enabled ? "✅" : "❌") : "MISSING";
    const devStatus = dev ? (dev.enabled ? "✅" : "❌") : "MISSING";

    if (prod && dev) {
      if (prod.url !== dev.url) {
        console.log(`⚠️  ${name.padEnd(40)} | ${prodStatus.padEnd(12)} | ${devStatus} (URL MISMATCH)`);
        mismatches++;
      }
    } else if (!prod) {
      console.log(`➕  ${name.padEnd(40)} | ${prodStatus.padEnd(12)} | ${devStatus}`);
      missingInProd++;
    } else if (!dev) {
      console.log(`➖  ${name.padEnd(40)} | ${prodStatus.padEnd(12)} | ${devStatus}`);
      missingInDev++;
    }
  }

  console.log(`${"═".repeat(100)}`);
  console.log(`\n📝 Summary:`);
  console.log(`   - Mismatched URLs: ${mismatches}`);
  console.log(`   - Missing in Production: ${missingInProd}`);
  console.log(`   - Missing in Development: ${missingInDev}`);
  
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
