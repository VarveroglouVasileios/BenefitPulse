
import axios from "axios";
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

async function checkUrl(url: string) {
  try {
    const res = await axios.get(url, { 
      timeout: 10000, 
      headers: { 'User-Agent': 'Mozilla/5.0' },
      validateStatus: (status) => status < 500 
    });
    return { status: res.status, ok: res.status === 200 };
  } catch (err: any) {
    return { status: err.response?.status || 'ERROR', ok: false, error: err.message };
  }
}

async function main() {
  const prodSources = await getSources(PROD_URI);
  const devSources = await getSources(DEV_URI);

  const prodMap = new Map(prodSources.map(s => [s.name, s]));
  const devMap = new Map(devSources.map(s => [s.name, s]));

  const targets = [
    "ESPA Fisheries",
    "ΑΣΕΠ - Νέα",
    "OPEKA Επιδόματα",
    "Oikogeneia - Οικογενειακά Επιδόματα",
    "e-ΕΦΚΑ Επιδόματα",
    "Διαύγεια Search RSS (fallback)"
  ];

  console.log(`\n🔍 Checking target URLs and comparing versions...\n`);

  for (const name of targets) {
    const prod = prodMap.get(name);
    const dev = devMap.get(name);

    console.log(`📌 Source: ${name}`);
    
    if (dev) {
      const devCheck = await checkUrl(dev.url);
      console.log(`   [DEV URL]  ${dev.url.substring(0, 80)}...`);
      console.log(`              Result: ${devCheck.ok ? '✅ OK (200)' : '❌ FAIL (' + devCheck.status + ')'}`);
    } else {
      console.log(`   [DEV]      MISSING`);
    }

    if (prod) {
      if (prod.url !== dev?.url) {
        const prodCheck = await checkUrl(prod.url);
        console.log(`   [PROD URL] ${prod.url.substring(0, 80)}...`);
        console.log(`              Result: ${prodCheck.ok ? '✅ OK (200)' : '❌ FAIL (' + prodCheck.status + ')'}`);
      } else {
        console.log(`   [PROD]     Same URL as DEV`);
      }
    } else {
      console.log(`   [PROD]     MISSING`);
    }
    console.log();
  }
  process.exit(0);
}

main();
