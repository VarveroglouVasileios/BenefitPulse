import mongoose from "mongoose";
import { connectMongo } from "../db/mongo";
import { Source } from "../models/source.model";

async function main() {
  await connectMongo();
  
  const dbName = mongoose.connection.db?.databaseName;
  console.log(`📡 Connected to DB: ${dbName} (NODE_ENV=${process.env.NODE_ENV})`);
  
  const allSources = await Source.find({}).select("name url type enabled lastFetchedAt");

  console.log(`\n${"═".repeat(80)}`);
  console.log(`  📋 ALL SOURCES REPORT`);
  console.log(`${"═".repeat(80)}`);

  if (allSources.length === 0) {
    console.log("  ⚠️ No sources found in the database.");
  } else {
    allSources.forEach((s, i) => {
      const date = s.lastFetchedAt ? new Date(s.lastFetchedAt).toLocaleString("el-GR", { hour12: false }) : "Never";
      const status = s.enabled ? "✅ Enabled" : "❌ Disabled";
      console.log(`  ${i + 1}. 📦 ${s.name} (${status}) [${s.type}]`);
      console.log(`     🔗 URL: ${s.url}`);
      console.log(`     ⏰ Last: ${date}`);
      console.log(`     ${"─".repeat(70)}`);
    });
  }

  console.log(`${"═".repeat(80)}\n`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
