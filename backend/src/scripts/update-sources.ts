
import { connectMongo } from "../db/mongo";
import { Source } from "../models/source.model";

async function updateSources() {
  await connectMongo();
  
  const sourcesToUpdate = [
    {
      name: "Σπίτι μου II",
      url: "https://www.gov.gr/ipiresies/periousia-kai-phorologia/epidoteseis-politon/bebaiose-epileximotetas-sto-programma-spiti-mou-ii",
      type: "single_page"
    },
    {
      name: "ΟΠΕΚΑ - Επίδομα Στέγασης",
      url: "https://opeka.gr/stegasi/epidoma-stegasis/ilektronikes-ypiresies/",
      type: "single_page"
    },
    {
      name: "ΟΠΕΚΑ - Επίδομα Γέννησης",
      url: "https://opeka.gr/oikogeneia/epidoma-gennisis/ilektronikes-ypiresies/",
      type: "single_page"
    },
    {
      name: "ΟΠΕΚΑ - Ελάχιστο Εγγυημένο Εισόδημα",
      url: "https://opeka.gr/elachisto-engyimeno-eisodima/ilektronikes-ypiresies/",
      type: "single_page"
    },
    {
      name: "Gov.gr - Gigabit Connectivity",
      url: "https://www.gov.gr/ipiresies/periousia-kai-phorologia/epidoteseis-politon/kouponi-sundesimotetas-gigabit-gigabit-connectivity-voucher-scheme",
      type: "single_page"
    }
  ];

  for (const s of sourcesToUpdate) {
    await Source.findOneAndUpdate(
      { name: s.name },
      { $set: { url: s.url, type: s.type, enabled: true } },
      { upsert: true }
    );
    console.log(`✅ Updated source: ${s.name}`);
  }

  process.exit(0);
}

updateSources().catch(console.error);
