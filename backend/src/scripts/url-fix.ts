
import { connectMongo } from "../db/mongo";
import { Opportunity } from "../models/opportunity.model";

async function urlBasedFix() {
  await connectMongo();
  console.log("🔗 Fixing by URL to ensure visibility...");

  const urlMap = [
    { url: /bebaiose-epileximotetas-sto-programma-spiti-mou-ii/, status: "open" },
    { url: /vouchers.gov.gr\/fuelpass/, status: "open" },
    { url: /vouchers.gov.gr\/youthpass/, status: "open" },
    { url: /opeka.gr\/oikogeneia\/epidoma-paidiou-a21/, status: "open" },
    { url: /opeka.gr.*gennisis/, status: "open" },
    { url: /opeka.gr.*stegasis/, status: "open" },
    { url: /opeka.gr.*elachisto-engyimeno-eisodima/, status: "open" },
    { url: /espa.gr.*item=7179/, status: "open" },
    { url: /espa.gr.*item=7161/, status: "open" }
  ];

  for (const entry of urlMap) {
    const res = await Opportunity.updateMany(
      { officialUrl: { $regex: entry.url }, status: "published" },
      { $set: { applicationStatus: entry.status, "criteriaJson.applicationStatus": entry.status } }
    );
    console.log(`✅ Fixed ${res.modifiedCount} items by URL pattern ${entry.url}`);
  }

  process.exit(0);
}

urlBasedFix().catch(console.error);
