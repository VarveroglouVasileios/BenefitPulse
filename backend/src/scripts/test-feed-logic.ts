
import { connectMongo } from "../db/mongo";
import { OpportunitiesService } from "../modules/opportunities/opportunities.service";

async function testFeed() {
  await connectMongo();
  const service = new OpportunitiesService();
  
  console.log("--- TESTING GET FEED (ALL) ---");
  const result = await service.getFeed({ tab: "all", limit: 100 });
  console.log(`Total items in feed: ${result.opportunities.length}`);
  
  const titles = result.opportunities.map(o => o.title);
  console.log("Titles in feed:");
  titles.forEach(t => console.log(`- ${t}`));

  if (titles.includes("Σπίτι μου ΙΙ")) {
    console.log("✅ 'Σπίτι μου ΙΙ' IS in the feed results!");
  } else {
    console.log("❌ 'Σπίτι μου ΙΙ' is NOT in the feed results.");
  }

  process.exit(0);
}

testFeed().catch(console.error);
