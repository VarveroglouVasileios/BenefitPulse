
import { connectMongo } from "../db/mongo";
import { Opportunity } from "../models/opportunity.model";

async function finalSync() {
  await connectMongo();
  console.log("🛠️ Starting Final Sync with CorrectData.txt...");

  const items = [
    // --- ΕΠΙΔΟΜΑΤΑ ΔΥΠΑ ---
    {
      title: "Επίδομα Τακτικής Ανεργίας",
      officialUrl: "https://www.dypa.gov.gr/epidoma-anergias",
      summary: "540€/μήνα + 10% ανά εξαρτώμενο για απολυθέντες ιδιωτικού τομέα",
      kind: "benefit", type: "subsidy", status: "published", applicationStatus: "open", source: "ΔΥΠΑ Επιδόματα"
    },
    {
      title: "Επίδομα Μακροχρόνια Ανέργων",
      officialUrl: "https://www.gov.gr/ipiresies/ergasia-kai-asphalia/asphaliseis/epitheoresi-ergasias-epidotisi-anergias/epidoma-makrokhronion-anergon",
      summary: "200€/μήνα για έως 12 μήνες μετά την εξάντληση της τακτικής επιδότησης",
      kind: "benefit", type: "subsidy", status: "published", applicationStatus: "open", source: "Gov.gr"
    },
    {
      title: "Δώρο Πάσχα ΔΥΠΑ 2026",
      officialUrl: "https://www.dypa.gov.gr",
      summary: "Αναλογία μισθού για επιδοτούμενους ανέργους & ωφελούμενους προγραμμάτων",
      kind: "benefit", type: "subsidy", status: "published", applicationStatus: "open", source: "ΔΥΠΑ"
    },

    // --- ΕΣΠΑ ΕΠΕΙΓΟΝΤΑ & ΕΝΕΡΓΑ ---
    {
      title: "ΕΣΠΑ Ήπειρος — Startups & Spin-offs",
      officialUrl: "https://www.espa.gr/el/Pages/Proclamations.aspx?region=epirus",
      summary: "80% επιδότηση (έως 150.000€) για ίδρυση & ενίσχυση νεοφυών επιχειρήσεων",
      kind: "program", type: "subsidy", status: "published", applicationStatus: "open", deadlineAt: new Date("2026-04-30"), source: "ΕΣΠΑ"
    },
    {
      title: "ΕΣΠΑ Κρήτη — Πράσινη Μετάβαση ΜμΕ",
      officialUrl: "https://www.espa.gr/el/Pages/Proclamations.aspx?region=crete",
      summary: "40–50% επιδότηση για ΑΠΕ & ενεργειακή αναβάθμιση επιχειρήσεων",
      kind: "program", type: "subsidy", status: "published", applicationStatus: "open", deadlineAt: new Date("2026-05-28"), source: "ΕΣΠΑ"
    },
    {
      title: "ΕΣΠΑ — Γραφεία ΕΓΥΑ (υποστηριζόμενη απασχόληση)",
      officialUrl: "https://www.espa.gr/el/Pages/ProclamationsFS.aspx?item=7177",
      summary: "Εργασιακή ένταξη ατόμων με ψυχοκοινωνικά προβλήματα ή αυτισμό στην Αττική",
      kind: "program", type: "subsidy", status: "published", applicationStatus: "open", deadlineAt: new Date("2026-05-08"), source: "ΕΣΠΑ"
    },

    // --- GOV.GR ΕΠΙΔΟΤΗΣΕΙΣ ---
    {
      title: "Smart Readiness Voucher",
      officialUrl: "https://www.gov.gr/ipiresies/periousia-kai-phorologia/epidoteseis-politon/Smart-Readiness-application",
      summary: "Επιταγή μετατροπής κτιρίων σε έξυπνα (IoT, αυτοματισμοί)",
      kind: "benefit", type: "voucher", status: "published", applicationStatus: "open", source: "Gov.gr"
    },
    {
      title: "Gigabit Connectivity Voucher",
      officialUrl: "https://www.gov.gr/ipiresies/periousia-kai-phorologia/epidoteseis-politon/kouponi-sundesimotetas-gigabit-gigabit-connectivity-voucher-scheme",
      summary: "Κουπόνι αναβάθμισης σύνδεσης σε υπερυψηλές ταχύτητες",
      kind: "benefit", type: "voucher", status: "published", applicationStatus: "open", source: "Gov.gr"
    },
    {
      title: "Αλλάζω Συσκευή / Θερμοσίφωνα",
      officialUrl: "https://www.gov.gr/ipiresies/periousia-kai-phorologia/epidoteseis-politon/anakuklono-allazo-suskeue",
      summary: "Ανακύκλωση + επιδότηση αγοράς νέας ενεργειακά αποδοτικής συσκευής",
      kind: "benefit", type: "subsidy", status: "published", applicationStatus: "open", source: "Gov.gr"
    },
    {
      title: "Νταντάδες της Γειτονιάς",
      officialUrl: "https://www.gov.gr/ipiresies/periousia-kai-phorologia/epidoteseis-politon/summetokhe-opheloumenon-ste-drase-ntantades-tes-geitonias",
      summary: "Επιδότηση φύλαξης παιδιών από εγκεκριμένες παρόχους γειτονιάς",
      kind: "benefit", type: "subsidy", status: "published", applicationStatus: "open", source: "Gov.gr"
    },
    {
      title: "Προσβασιμότητα κατ' οίκον (ΑμΕΑ)",
      officialUrl: "https://www.gov.gr/ipiresies/periousia-kai-phorologia/epidoteseis-politon/programma-eniskhuses-amea-prosbasimoteta-kat-oikon",
      summary: "Αρχιτεκτονικές προσαρμογές κατοικίας για ΑμΕΑ",
      kind: "benefit", type: "subsidy", status: "published", applicationStatus: "open", source: "Gov.gr"
    },

    // --- ΟΠΕΚΑ ---
    {
      title: "Αναπηρικά Επιδόματα",
      officialUrl: "https://opeka.gr/atoma-me-anapiria/anapirika-epidomata/ilektronikes-ypiresies/",
      summary: "Επιδόματα για ΑμΕΑ, βαριά αναπηρία, κίνησης, όρασης, κώφωσης κ.λπ.",
      kind: "benefit", type: "subsidy", status: "published", applicationStatus: "open", source: "ΟΠΕΚΑ Επιδόματα"
    }
  ];

  for (const item of items) {
    await Opportunity.findOneAndUpdate(
      { officialUrl: item.officialUrl },
      { 
        $set: {
          ...item,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
    console.log(`✅ Synced: ${item.title}`);
  }

  console.log("\n✨ Final sync completed! Database is now matching CorrectData.txt.");
  process.exit(0);
}

finalSync().catch(console.error);
