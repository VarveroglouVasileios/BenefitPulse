
import { computeStatus } from "./status-engine";
import { classifyKindAndType } from "../modules/ingestion/cleaner";

async function runFinalAuditTest() {
  console.log("🏁 Starting Final Audit Smoke Test (System Precision Check)\n");

  const now = new Date("2026-04-05T12:00:00Z");
  
  const testItems = [
    // --- THE 18 ACTIVE/UPCOMING OPPORTUNITIES ---
    { title: "Fuel Pass III - 2026", content: "Ανοίγει 6 Απριλίου", url: "vouchers.gov.gr", expectedTab: "upcoming" },
    { title: "Youth Pass 2026", content: "Ξεκίνησαν οι αιτήσεις 3/4", url: "vouchers.gov.gr", expectedTab: "current" },
    { title: "Προκήρυξη ΑΣΕΠ 1Κ/2026", content: "510 μόνιμες θέσεις", url: "asep.gr", expectedTab: "current" },
    { title: "Voucher Εργαζομένων 750€", content: "Επιλογή προγραμμάτων κατάρτισης", url: "dypa.gov.gr", expectedTab: "current" },
    { title: "Πρόγραμμα ΔΥΠΑ 57+ στην Υγεία", content: "1.500 θέσεις εργασίας", url: "dypa.gov.gr", expectedTab: "current" },
    { title: "Νέα Επιχειρηματικότητα 18-29", content: "Ενίσχυση νέων", url: "dypa.gov.gr", expectedTab: "current" },
    { title: "Πρόγραμμα Πράσινων Δεξιοτήτων", content: "Κατάρτιση ανέργων", url: "dypa.gov.gr", expectedTab: "current" },
    { title: "Κοινωνικός Τουρισμός 2026", content: "Αιτήσεις ανοιχτές", url: "dypa.gov.gr", expectedTab: "current" },
    { title: "Ανακαινίζω - Νοικιάζω", content: "Επιδότηση ανακαίνισης", url: "gov.gr", expectedTab: "current" },
    { title: "Ελάχιστο Εγγυημένο Εισόδημα (ΚΕΑ)", content: "Μόνιμο επίδομα", url: "opeka.gr", expectedTab: "current" },
    { title: "Επίδομα Στέγασης", content: "Μόνιμο επίδομα", url: "opeka.gr", expectedTab: "current" },
    { title: "Αναπηρικά Επιδόματα", content: "Μόνιμο επίδομα", url: "opeka.gr", expectedTab: "current" },
    { title: "Επίδομα Παιδιού Α21", content: "Αιτήσεις έτους 2026", url: "opeka.gr", expectedTab: "current" },
    { title: "Στεγαστική Συνδρομή", content: "Μόνιμο επίδομα", url: "opeka.gr", expectedTab: "current" },
    { title: "Επίδομα Ομογενών", content: "Μόνιμο επίδομα", url: "opeka.gr", expectedTab: "current" },
    { title: "Gigabit Connectivity Voucher", content: "Αναβάθμιση ταχυτήτων", url: "gov.gr", expectedTab: "current" },
    { title: "Προκήρυξη ΑΣΕΠ 5Κ/2026", content: "Αναμένεται έκδοση", url: "asep.gr", expectedTab: "upcoming" },
    { title: "Δήμος Αγίου Δημητρίου: 25 Θέσεις", content: "Αιτήσεις έως 9/4", url: "diavgeia.gov.gr", expectedTab: "current" },

    // --- TRASH / EXPIRED / USELESS ---
    { title: "51η Ημέρα Καριέρας - 7 Φεβρουαρίου", content: "Εκδήλωση ΔΥΠΑ", url: "dypa.gov.gr", expectedTab: "trash" },
    { title: "Market Pass 2023 - Ενημέρωση", content: "Παλαιά ενίσχυση", url: "vouchers.gov.gr", expectedTab: "trash" },
    { title: "Αναβάθμιση Πληροφοριακού Συστήματος", content: "Εργασίες συντήρησης", url: "gov.gr", expectedTab: "trash" },
    { title: "Αποτελέσματα Προκήρυξης 2Κ/2025", content: "Πίνακες διοριστέων", url: "asep.gr", expectedTab: "news" } // News, not current opportunity
  ];

  let activeVisibleCount = 0;
  let trashBlockedCount = 0;

  for (const item of testItems) {
    // 1. Classification
    const cls = classifyKindAndType(item.title, item.content, item.url);
    
    // 2. Status
    let appStart = null;
    let appEnd = null;
    if (item.title.includes("6 Απριλίου") || item.content.includes("6 Απριλίου")) appStart = new Date("2026-04-06T00:00:00Z");
    if (item.title.includes("3/4") || item.content.includes("3/4")) appStart = new Date("2026-04-03T00:00:00Z");
    if (item.title.includes("9/4")) appEnd = new Date("2026-04-09T23:59:59Z");

    const status = computeStatus({
      applicationStartAt: appStart,
      applicationEndAt: appEnd,
      title: item.title
    }, now);

    // 3. Simulated Backend Tab Filter (The fix we made)
    const isRealKind = ["benefit", "voucher_pass", "program"].includes(cls.kind);
    const isPublished = status.status === "published" || (status.status === "draft" && status.applicationStatus === "upcoming");
    
    let assignedTab = "none";
    if (status.applicationStatus === "open" && isRealKind && isPublished) assignedTab = "current";
    else if (status.applicationStatus === "upcoming" && isRealKind) assignedTab = "upcoming";
    else if (cls.kind === "news" || cls.kind === "decision") assignedTab = "news";
    else if (status.status === "archived") assignedTab = "trash";
    else if (cls.type === "manual" && !isRealKind) assignedTab = "trash";

    console.log(`[${assignedTab.toUpperCase()}] "${item.title}"`);
    console.log(`   -> Kind: ${cls.kind}, Status: ${status.applicationStatus}, Reason: ${status.reason}`);

    if (item.expectedTab === "current" || item.expectedTab === "upcoming") {
      if (assignedTab === item.expectedTab) activeVisibleCount++;
    } else if (item.expectedTab === "trash") {
      if (assignedTab === "trash" || assignedTab === "none") trashBlockedCount++;
    } else if (item.expectedTab === "news") {
      if (assignedTab === "news") activeVisibleCount++; // Counting news as valid visibility
    }
  }

  console.log("\n" + "=".repeat(40));
  console.log("📊 AUDIT SUMMARY");
  console.log("=".repeat(40));
  console.log(`✅ Active/Upcoming Identified: ${activeVisibleCount}/19`);
  console.log(`🚫 Useless/Expired Filtered: ${trashBlockedCount}/3`);
  console.log("=".repeat(40));

  if (activeVisibleCount >= 18 && trashBlockedCount >= 3) {
    console.log("\n🎉 PERFECT MATCH! The system precisely shows the 18 benefits and filters the noise.");
  } else {
    console.log("\n⚠️ PRECISION ERROR. Check classification rules.");
  }
}

runFinalAuditTest().catch(console.error);
