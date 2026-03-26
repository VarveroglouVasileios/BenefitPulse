import mongoose from "mongoose";
import axios from "axios";
import { Source } from "../models/source.model";

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
};

async function main() {
  process.env.MONGODB_URI = "mongodb+srv://varveroglouvas_db_user:Paokara141187@benefitpulse.oox9dvm.mongodb.net/benefitpulse";
  
  const { connectMongo } = await import("../db/mongo");
  await connectMongo();
  
  const sources = await Source.find({ enabled: true }).lean();
  console.log(`🚀 Checking ${sources.length} enabled sources for connectivity...\n`);

  const results = [];

  for (const source of sources) {
    process.stdout.write(`🔍 Checking: ${source.name.substring(0, 30).padEnd(30)}... `);
    try {
      const response = await axios.get(source.url, {
        headers: BROWSER_HEADERS,
        timeout: 10000,
        maxRedirects: 5,
        validateStatus: (status) => status < 500,
      });

      if (response.status === 200 || response.status === 206) {
        console.log(`✅ ${response.status}`);
        results.push({ name: source.name, status: "OK", code: response.status });
      } else {
        console.log(`⚠️  ${response.status}`);
        results.push({ name: source.name, status: "WARN", code: response.status, url: source.url });
      }
    } catch (error: any) {
      console.log(`❌ FAIL: ${error.message}`);
      results.push({ name: source.name, status: "FAIL", error: error.message, url: source.url });
    }
  }

  const fails = results.filter(r => r.status === "FAIL" || (r.code && r.code >= 400));
  
  console.log(`\n${"═".repeat(60)}`);
  console.log(`📊 CONNECTIVITY SUMMARY`);
  console.log(`${"═".repeat(60)}`);
  console.log(`✅ Success: ${results.length - fails.length}`);
  console.log(`❌ Failures/Warns: ${fails.length}`);
  
  if (fails.length > 0) {
    console.log(`\n❌ Detailed Failures:`);
    fails.forEach(f => {
      console.log(`   - ${f.name}: ${f.code || f.error} (${f.url})`);
    });
  }
  
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
