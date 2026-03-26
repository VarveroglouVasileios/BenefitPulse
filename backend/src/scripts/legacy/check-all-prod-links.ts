
import axios from "axios";
import mongoose from "mongoose";
import { Source } from "../models/source.model";

const PROD_URI = "mongodb+srv://varveroglouvas_db_user:Paokara141187@benefitpulse.oox9dvm.mongodb.net/benefitpulse";

async function checkUrl(url: string) {
  try {
    const res = await axios.get(url, { 
      timeout: 15000, 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
      validateStatus: (status) => status < 500 
    });
    return { status: res.status, ok: res.status === 200 };
  } catch (err: any) {
    return { status: err.response?.status || 'ERROR', ok: false, error: err.message };
  }
}

async function main() {
  console.log("🔍 Checking all Production links (this will take a while...)\n");
  await mongoose.connect(PROD_URI);
  const sources = await Source.find({}).lean();
  
  let working = 0;
  let failing = 0;

  for (const s of sources) {
    process.stdout.write(`⏳ Checking: ${s.name.substring(0, 40).padEnd(40)} ... `);
    const result = await checkUrl(s.url);
    if (result.ok) {
      console.log(`✅ OK (200)`);
      working++;
    } else {
      console.log(`❌ FAIL (${result.status})`);
      failing++;
    }
  }

  console.log(`\n🏁 Summary:`);
  console.log(`   - Total: ${sources.length}`);
  console.log(`   - Working: ${working}`);
  console.log(`   - Failing: ${failing}`);

  await mongoose.disconnect();
  process.exit(0);
}

main();
