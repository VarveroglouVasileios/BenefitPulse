
import { connectMongo } from "../db/mongo";
import { Opportunity } from "../models/opportunity.model";
import { Source } from "../models/source.model";

async function forceUpdate() {
  await connectMongo();
  
  console.log("🚀 Starting Force Update based on CorrectData.txt...");

  // 1. Restore Fuel Pass III
  const fuelPass = await Opportunity.findOne({ officialUrl: /vouchers.gov.gr\/fuelpass/ });
  if (fuelPass) {
    fuelPass.status = "published";
    (fuelPass as any).applicationStatus = "open";
    fuelPass.title = "Fuel Pass III";
    fuelPass.summary = "Επιδότηση καυσίμων Απρ–Μαΐ 2026 · Ιδιοκτήτες ΙΧ & ελεύθεροι επαγγελματίες";
    await fuelPass.save();
    console.log("✅ Restored Fuel Pass III as Published");
  }

  // 2. Ensure Youth Pass 2026
  await Opportunity.findOneAndUpdate(
    { officialUrl: "https://vouchers.gov.gr/youthpass" },
    { 
      status: "published",
      applicationStatus: "open",
      title: "Youth Pass 2026",
      summary: "150€ για νέους 18–19 ετών (γεν. 2006–2007) · Πολιτισμός, τουρισμός, μετακινήσεις",
      deadlineAt: new Date("2026-05-15T23:59:59Z")
    },
    { upsert: true }
  );
  console.log("✅ Ensured Youth Pass 2026");

  // 3. Ensure Σπίτι μου II
  await Opportunity.findOneAndUpdate(
    { officialUrl: "https://www.gov.gr/ipiresies/periousia-kai-phorologia/epidoteseis-politon/bebaiose-epileximotetas-sto-programma-spiti-mou-ii" },
    { 
      status: "published",
      applicationStatus: "open",
      title: "Σπίτι μου ΙΙ",
      summary: "Επιδοτούμενο δάνειο αγοράς πρώτης κατοικίας για νέους",
      kind: "benefit",
      type: "subsidy"
    },
    { upsert: true }
  );
  console.log("✅ Ensured Σπίτι μου II");

  // 4. Ensure OPEKA Benefits (Always Open)
  const opekaBenefits = [
    { title: "Επίδομα Γέννησης", url: "https://opeka.gr/oikogeneia/epidoma-gennisis/ilektronikes-ypiresies/", summary: "2.000€ για κάθε γέννηση · Ηλεκτρονική αίτηση" },
    { title: "Επίδομα Στέγασης", url: "https://opeka.gr/stegasi/epidoma-stegasis/ilektronikes-ypiresies/", summary: "70–210 €/μήνα για ενοικιαστές χαμηλού εισοδήματος" },
    { title: "ΕΕΕ / Ελάχιστο Εγγυημένο Εισόδημα", url: "https://opeka.gr/elachisto-engyimeno-eisodima/ilektronikes-ypiresies/", summary: "Οικονομική ενίσχυση για χαμηλοεισοδηματικά νοικοκυριά" },
    { title: "Επίδομα Κ.Α. Ανασφάλιστων Υπερήλικων", url: "https://opeka.gr/anasfalistoi-yperilikes/epidoma-koinonikis-allilengyis-anasfaliston-yperilikon/ilektronikes-ypiresies/", summary: "418€/μήνα για άτομα 67+ χωρίς σύνταξη" }
  ];

  for (const b of opekaBenefits) {
    await Opportunity.findOneAndUpdate(
      { officialUrl: b.url },
      { 
        status: "published",
        applicationStatus: "open",
        title: b.title,
        summary: b.summary,
        kind: "benefit",
        type: "subsidy",
        source: "ΟΠΕΚΑ Επιδόματα"
      },
      { upsert: true }
    );
    console.log(`✅ Ensured OPEKA: ${b.title}`);
  }

  // 5. Ensure ESPA key items
  const espaItems = [
    { title: "«Παράγουμε στην Ελλάδα» — Μεταποίηση ΜμΕ", url: "https://www.espa.gr/el/Pages/ProclamationsFS.aspx?item=7179", summary: "50–55% επιδότηση (έως 400.000€) για υφιστάμενες ΜμΕ μεταποίησης", deadline: "2026-06-02" },
    { title: "ΕΣΠΑ Δίκαιη Μετάβαση", url: "https://www.espa.gr/el/Pages/ProclamationsFS.aspx?item=7161", summary: "Ενίσχυση ΜμΕ Δ. Μακεδονίας & Πελοποννήσου", deadline: "2026-06-30" }
  ];

  for (const item of espaItems) {
    await Opportunity.findOneAndUpdate(
      { officialUrl: item.url },
      { 
        status: "published",
        applicationStatus: "open",
        title: item.title,
        summary: item.summary,
        kind: "program",
        type: "subsidy",
        deadlineAt: new Date(item.deadline),
        source: "ESPA - Όλες οι Προκηρύξεις (κύρια λίστα)"
      },
      { upsert: true }
    );
    console.log(`✅ Ensured ESPA: ${item.title}`);
  }

  console.log("\n✨ Force update completed successfully!");
  process.exit(0);
}

forceUpdate().catch(console.error);
