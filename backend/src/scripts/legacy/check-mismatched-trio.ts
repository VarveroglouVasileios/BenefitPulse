
import axios from "axios";
import mongoose from "mongoose";
import { Source } from "../models/source.model";

const DEV_URI = "mongodb+srv://varveroglouvas_db_user:Paokara141187@benefitpulse.oox9dvm.mongodb.net/benefitpulse_dev";

async function checkUrl(source: any) {
  try {
    const headers = { 
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      ...(source.config?.headers || {})
    };
    
    console.log(`⏳ Checking [${source.name}] at ${source.url}...`);
    const res = await axios.get(source.url, { 
      timeout: 20000, 
      headers,
      validateStatus: (status) => status < 500 
    });
    return { status: res.status, ok: res.status === 200 };
  } catch (err: any) {
    return { status: err.response?.status || 'ERROR', ok: false, error: err.message };
  }
}

async function main() {
  await mongoose.connect(DEV_URI);
  
  const targets = ["Culture Portal (Grants)", "ESPA Antagonistikotita", "ESPA Fisheries"];
  const sources = await Source.find({ name: { $in: targets } }).lean();

  console.log(`\n🔍 Targeted Check for the 3 remaining sources in DEV...\n`);

  for (const s of sources) {
    const result = await checkUrl(s);
    if (result.ok) {
      console.log(`   ✅ SUCCESS (200)`);
    } else {
      console.log(`   ❌ FAILED (${result.status}): ${result.error || ''}`);
    }
  }

  await mongoose.disconnect();
  process.exit(0);
}

main();
