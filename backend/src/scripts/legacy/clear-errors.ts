import { connectMongo } from "../db/mongo";
import { Source } from "../models/source.model";

async function main() {
  await connectMongo();
  
  console.log(`📡 Connected to DB: ${process.env.NODE_ENV}`);
  
  const result = await Source.updateMany(
    {}, 
    { 
      $set: { 
        lastError: undefined,
        consecutiveFailures: 0 
      } 
    }
  );

  console.log(`✅ Cleared errors for ${result.modifiedCount} sources.`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
