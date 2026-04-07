
import { connectMongo } from "../db/mongo";
import { Opportunity } from "../models/opportunity.model";

async function prodCleanupAndFix() {
  await connectMongo();
  console.log("🧹 Cleaning up production database (benefitpulse)...");

  // 1. Delete Noise (Diavgeia administrative items, Press Releases as opportunities)
  const noisePatterns = [
    /Απόφαση Ανάληψης Υποχρέωσης/i,
    /Συμπληρωματική: 3\. Απόφαση/i,
    /Έκδοση Χ\.Ε\./i,
    /Αποδέσμευση/i,
    /Δείτε εδώ τo Δελτίο Τύπου/i,
    /Ενημέρωση για αποκατάσταση/i,
    /Ενημέρωση για τη νέα δράση/i,
    /ΠΡΟΣΩΡΙΝΗ ΠΑΥΣΗ/i,
    /Έναρξη λειτουργίας Helpdesk/i
  ];

  for (const pattern of noisePatterns) {
    const res = await Opportunity.updateMany(
      { title: { $regex: pattern }, deletedAt: null },
      { $set: { deletedAt: new Date(), status: "archived" } }
    );
    console.log(`🗑️ Deleted ${res.modifiedCount} items matching ${pattern}`);
  }

  // 2. Fix applicationStatus for the 53 core items to ensure visibility
  // These are the items from CorrectData.txt
  const coreItems = [
    "Σπίτι μου ΙΙ", "Fuel Pass III", "Youth Pass 2026", "Επίδομα Παιδιού (Α21) - ΟΠΕΚΑ",
    "Επίδομα Γέννησης", "Επίδομα Στέγασης", "ΕΕΕ / Ελάχιστο Εγγυημένο Εισόδημα",
    "Επίδομα Κ.Α. Ανασφάλιστων Υπερήλικων", "Αναπηρικά Επιδόματα", "Επίδομα Τακτικής Ανεργίας",
    "Επίδομα Μακροχρόνια Ανέργων", "Δώρο Πάσχα ΔΥΠΑ 2026", "Smart Readiness Voucher",
    "Gigabit Connectivity Voucher", "Αλλάζω Συσκευή / Θερμοσίφωνα", "Νταντάδες της Γειτονιάς",
    "Προσβασιμότητα κατ' οίκον (ΑμΕΑ)", "«Παράγουμε στην Ελλάδα» — Μεταποίηση ΜμΕ",
    "ΕΣΠΑ Δίκαιη Μετάβαση", "ΕΣΠΑ Ήπειρος — Startups & Spin-offs", "ΕΣΠΑ Κρήτη — Πράσινη Μετάβαση ΜμΕ"
  ];

  for (const title of coreItems) {
    const res = await Opportunity.updateMany(
      { title: { $regex: new RegExp(`^${title}`, "i") }, status: "published" },
      { $set: { applicationStatus: "open", "criteriaJson.applicationStatus": "open" } }
    );
    console.log(`✅ Set status 'open' for: ${title} (${res.modifiedCount} matches)`);
  }

  // 3. Archive the OLD "Σπίτι μου" to avoid confusion
  const oldSpiti = await Opportunity.updateMany(
    { title: "Πρόγραμμα «Σπίτι μου»", status: "published" },
    { $set: { status: "archived", applicationStatus: "closed" } }
  );
  console.log(`📦 Archived ${oldSpiti.modifiedCount} old "Σπίτι μου" items.`);

  console.log("\n✨ Production database is now clean and visible!");
  process.exit(0);
}

prodCleanupAndFix().catch(console.error);
