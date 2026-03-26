
import axios from "axios";
import mongoose from "mongoose";
import { Source } from "../models/source.model";

const PROD_URI = "mongodb+srv://varveroglouvas_db_user:Paokara141187@benefitpulse.oox9dvm.mongodb.net/benefitpulse";
const DEV_URI = "mongodb+srv://varveroglouvas_db_user:Paokara141187@benefitpulse.oox9dvm.mongodb.net/benefitpulse_dev";

async function checkUrl(url: string) {
  try {
    const res = await axios.get(url, { 
      timeout: 10000, 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
      validateStatus: (status) => status < 500 
    });
    return { status: res.status, ok: res.status === 200 };
  } catch (err: any) {
    return { status: err.response?.status || 'ERROR', ok: false, error: err.message };
  }
}

async function getSourceByUrl(uri: string, name: string) {
  const conn = await mongoose.createConnection(uri).asPromise();
  const SourceModel = conn.model("Source", Source.schema);
  const source = await SourceModel.findOne({ name }).lean();
  await conn.close();
  return source;
}

async function main() {
  const failingNames = [
    "ΑΣΕΠ - Ειδικές Ανακοινώσεις",
    "MITOS - EMDD API",
    "MITOS - EMDD API (Services)",
    "ESPA Antagonistikotita",
    "Culture Portal (Grants)",
    "Διαύγεια Search RSS (fallback)",
    "ESPA Fisheries",
    "Oikogeneia - Οικογενειακά Επιδόματα"
  ];

  console.log(`\n🔍 Comparing failing sources between PROD and DEV databases...\n`);

  for (const name of failingNames) {
    console.log(`📌 Source: ${name}`);
    
    const prodSource = await getSourceByUrl(PROD_URI, name);
    const devSource = await getSourceByUrl(DEV_URI, name);

    if (prodSource) {
      const prodCheck = await checkUrl(prodSource.url);
      console.log(`   [PROD URL] ${prodSource.url}`);
      console.log(`              Result: ${prodCheck.ok ? '✅ OK (200)' : '❌ FAIL (' + prodCheck.status + ')'}`);
    } else {
      console.log(`   [PROD]     MISSING`);
    }

    if (devSource) {
      if (prodSource && prodSource.url === devSource.url) {
        console.log(`   [DEV URL]  Same as PROD`);
      } else {
        const devCheck = await checkUrl(devSource.url);
        console.log(`   [DEV URL]  ${devSource.url}`);
        console.log(`              Result: ${devCheck.ok ? '✅ OK (200)' : '❌ FAIL (' + devCheck.status + ')'}`);
      }
    } else {
      console.log(`   [DEV]      MISSING`);
    }
    console.log();
  }
  process.exit(0);
}

main();
