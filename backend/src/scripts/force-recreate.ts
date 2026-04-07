
import { connectMongo } from "../db/mongo";
import { Opportunity } from "../models/opportunity.model";

async function forceRecreate() {
  await connectMongo();
  console.log("🚀 Force recreating core opportunities in production...");

  const coreItems = [
    {
      title: "Σπίτι μου ΙΙ",
      officialUrl: "https://www.gov.gr/ipiresies/periousia-kai-phorologia/epidoteseis-politon/bebaiose-epileximotetas-sto-programma-spiti-mou-ii",
      summary: "Επιδοτούμενο δάνειο αγοράς πρώτης κατοικίας για νέους",
      kind: "benefit", type: "subsidy", applicationStatus: "open", status: "published"
    },
    {
      title: "Fuel Pass III",
      officialUrl: "https://vouchers.gov.gr/fuelpass",
      summary: "Επιδότηση καυσίμων Απρ–Μαΐ 2026 · Ιδιοκτήτες ΙΧ & ελεύθεροι επαγγελματίες",
      kind: "benefit", type: "subsidy", applicationStatus: "open", status: "published"
    },
    {
      title: "Youth Pass 2026",
      officialUrl: "https://vouchers.gov.gr/youthpass",
      summary: "150€ για νέους 18–19 ετών (γεν. 2006–2007)",
      kind: "benefit", type: "voucher", applicationStatus: "open", status: "published", deadlineAt: new Date("2026-05-15")
    },
    {
      title: "Επίδομα Παιδιού (Α21) - ΟΠΕΚΑ",
      officialUrl: "https://opeka.gr/oikogeneia/epidoma-paidiou-a21",
      summary: "Οικογένειες με εξαρτώμενα τέκνα · Εισοδηματικά κριτήρια",
      kind: "benefit", type: "subsidy", applicationStatus: "open", status: "published"
    },
    {
      title: "Επίδομα Γέννησης",
      officialUrl: "https://opeka.gr/oikogeneia/epidoma-gennisis/ilektronikes-ypiresies/",
      summary: "2.000€ για κάθε γέννηση · Ηλεκτρονική αίτηση",
      kind: "benefit", type: "subsidy", applicationStatus: "open", status: "published"
    }
  ];

  for (const item of coreItems) {
    // Delete existing ones with same or similar URL/Title to avoid duplicates
    await Opportunity.deleteMany({ 
      $or: [
        { officialUrl: item.officialUrl },
        { title: item.title }
      ]
    });
    
    // Create fresh
    await Opportunity.create({
      ...item,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      source: "Official Sync",
      confidence: 1.0,
      criteriaJson: { applicationStatus: "open" }
    });
    console.log(`✨ Recreated: ${item.title}`);
  }

  console.log("\n✅ Core items recreated correctly.");
  process.exit(0);
}

forceRecreate().catch(console.error);
