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
  const prodSources = await getSources(PROD_URI);
  const devSources = await getSources(DEV_URI);

  const prodMap = new Map(prodSources.map(s => [s.name, s]));
  const devMap = new Map(devSources.map(s => [s.name, s]));

  for (const name of prodMap.keys()) {
    const prod = prodMap.get(name);
    const dev = devMap.get(name);

    if (prod && dev && prod.url !== dev.url) {
      console.log(`\n❌ MISMATCH: ${name}`);
      console.log(`   Prod: ${prod.url}`);
      console.log(`   Dev:  ${dev.url}`);
    }
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
