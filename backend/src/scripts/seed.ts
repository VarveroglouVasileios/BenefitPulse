import { connectMongo } from "../db/mongo";
import { User } from "../models/user.model";
import { Source } from "../models/source.model";
import { hashPassword } from "../utils/hash";
import { config } from "../config/env";

export async function seed() {
  console.log("🔗 Connecting to MongoDB URI:", config.mongodb.uri);
  await connectMongo();

  // Create admin user
  const passwordHash = await hashPassword(config.admin.password);
  const admin = await User.findOneAndUpdate(
    { email: config.admin.email },
    {
      email: config.admin.email,
      passwordHash,
      firstName: "Admin",
      lastName: "User",
      role: "admin",
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log("✅ Admin user ensured:", admin.email);

  // Create default sources
  const sources = [
    {
      name: "ΑΣΕΠ Ανακοινώσεις (HTML)",
      url: "https://info.asep.gr/announcements-list",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "ΑΣΕΠ RSS",
      url: "https://info.asep.gr/feed.xml",
      type: "rss" as const,
      enabled: true,
    },
    {
      name: "ΑΣΕΠ - Διαγωνισμοί",
      url: "https://info.asep.gr/search/contest",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "ΑΣΕΠ - Θέσεις Εργασίας",
      url: "https://info.asep.gr/positions",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "ΑΣΕΠ - Αρχείο Δελτίων Τύπου",
      url: "https://info.asep.gr/archive/announcements",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "ΑΣΕΠ - Ειδικές Ανακοινώσεις",
      url: "https://info.asep.gr/archive/special-announcements",
      type: "html_listing" as const,
      enabled: false, // Integrated into info.asep.gr/feed.xml
    },
    {
      name: "ΑΣΕΠ - Αρχείο Ανακοινώσεων ΣΟΧ & ΣΜΕ",
      url: "https://info.asep.gr/arheio-anakoinoseon-soh-sme",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "ΑΣΕΠ - Announcements List (FIXED)",
      url: "https://info.asep.gr/announcements-list/",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "Διαύγεια API (opendata search)",
      url: 'https://diavgeia.gov.gr/luminapi/opendata/search?q=subject:(επίδομα OR επιδότηση OR voucher OR pass OR "youth pass" OR "tourism4all" OR "north evia pass")&wt=json',
      type: "api" as const,
      enabled: true,
    },
    {
      name: "Διαύγεια Search RSS (fallback)",
      url: "https://diavgeia.gov.gr/luminapi/api/feed/rss?q=subject:%22%CE%B5%CF%80%CE%AF%CE%B4%CE%BF%CE%BC%CE%B1%22",
      type: "rss" as const,
      enabled: true,
    },
    {
      name: "Vouchers Catalog",
      url: "https://vouchers.gov.gr/",
      type: "html_catalog" as const,
      enabled: true,
    },
    {
      name: "GovGR Υγεία & Πρόνοια - Επιδόματα",
      url: "https://www.gov.gr/ipiresies/ugeia-kai-pronoia/epidomata",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "GovGR Επιδoτήσεις πολιτών",
      url: "https://www.gov.gr/ipiresies/periousia-kai-phorologia/epidoteseis-politon",
      type: "html_listing" as const,
      enabled: false, // 403
    },
    {
      name: "Youth Pass Page",
      url: "https://vouchers.gov.gr/youthpass",
      type: "single_page" as const,
      enabled: true,
    },
    {
      name: "Tourism4All 2025 Page",
      url: "https://vouchers.gov.gr/tourism4all-2025",
      type: "single_page" as const,
      enabled: true,
    },
    {
      name: "OPEKA Επιδόματα",
      url: "https://opeka.gr/epidomata/",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "ΔΥΠΑ - Ανοικτά Προγράμματα",
      url: "https://www.dypa.gov.gr/proghrammata-anoikhta",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "ΔΥΠΑ - Προγράμματα Απασχόλησης (επίσημη λίστα)",
      url: "https://www.dypa.gov.gr/proghrammata-apaskholisis-11",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "ΔΥΠΑ - Νέα/Ανακοινώσεις",
      url: "https://prosvasis.dypa.gov.gr/el/nea-anakoinwseis",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "ΔΥΠΑ RSS",
      url: "https://prosvasis.dypa.gov.gr/el/feed",
      type: "rss" as const,
      enabled: true,
    },
    {
      name: "ΔΥΠΑ Prosvasis - Προγράμματα Απασχόλησης",
      url: "https://prosvasis.dypa.gov.gr/active-employment-policies",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "ΔΥΠΑ Prosvasis - Εργαλειοθήκη Εργοδότη",
      url: "https://prosvasis.dypa.gov.gr/erghaleiothiki-erghodoti",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "Ελάχιστο Εγγυημένο Εισόδημα",
      url: "https://keaprogram.gr/",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "Stegasi Catalog",
      url: "https://stegasi.gov.gr/",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "Φοιτητικό Στεγαστικό",
      url: "https://portal.stegastiko.minedu.gov.gr/",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "e-ΕΦΚΑ Επιδόματα",
      url: "https://www.e-efka.gov.gr/el/epidomata",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "ΕΦΚΑ Επιδόματα (efka.gov.gr)",
      url: "https://www.efka.gov.gr/",
      type: "html_catalog" as const,
      enabled: true,
    },
    {
      name: "MITOS - EMDD API",
      url: "https://api.mitos.gov.gr/v1",
      type: "api" as const,
      enabled: false, // 404
    },
    {
      name: "MITOS - EMDD API (Services)",
      url: "https://api.mitos.gov.gr/v1/services",
      type: "api" as const,
      enabled: false, // 404
    },
    {
      name: "OPEKA - Ανακοινώσεις / Δελτία Τύπου (discovery)",
      url: "https://opeka.gr/",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "ΔΥΠΑ - Νέα/Ανακοινώσεις (discovery)",
      url: "https://www.dypa.gov.gr/",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "ΔΥΠΑ - Κοινωνικός Τουρισμός",
      url: "https://www.dypa.gov.gr/koinonikos-toyrismos",
      type: "single_page" as const,
      enabled: true,
    },
    {
      name: "AADE - myΘέρμανση (EL)",
      url: "https://www.aade.gr/mythermansi",
      type: "single_page" as const,
      enabled: true,
    },
    {
      name: "gov.gr - Υγεία & Πρόνοια (category hub)",
      url: "https://www.gov.gr/ipiresies/ugeia-kai-pronoia",
      type: "html_catalog" as const,
      enabled: true,
    },
    {
      name: "Vouchers Gov",
      url: "https://vouchers.gov.gr/",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "ESPA Antagonistikotita",
      url: "https://www.antagonistikotita.gr/category/nea/feed/",
      type: "rss" as const,
      enabled: false, // Timeout
    },    {
      name: "Oikogeneia - Οικογενειακά Επιδόματα",
      url: "https://opeka.gr/oikogeneia/epidoma-paidiou-a21/",
      type: "single_page" as const,
      enabled: true,
    },
    {
      name: "Εξοικονομώ - Ανακαινίζω για Νέους",
      url: "https://exoikonomoneon.gov.gr/",
      type: "single_page" as const,
      enabled: true,
    },
    {
      name: "MinDev - Προγράμματα",
      url: "https://programmata.mindev.gov.gr/",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "ΑΣΕΠ - Νέα",
      url: "https://info.asep.gr/feed.xml",
      type: "rss" as const,
      enabled: true,
    },
    {
      name: "ΔΥΠΑ - Δελτία Τύπου",
      url: "https://www.dypa.gov.gr/feed-pr",
      type: "rss" as const,
      enabled: true,
    },
    {
      name: "TaxHeaven News",
      url: "https://www.taxheaven.gr/rss",
      type: "rss" as const,
      enabled: true,
    },
    {
      name: "ASEP Announcements",
      url: "https://info.asep.gr/feed.xml",
      type: "rss" as const,
      enabled: true,
    },
    {
      name: "Dentist Pass",
      url: "https://vouchers.gov.gr/dentistpass",
      type: "single_page" as const,
      enabled: true,
    },
    {
      name: "ESPA Proclamations",
      url: "https://www.espa.gr/el/Pages/Rss.aspx?FeedType=Proclamations",
      type: "rss" as const,
      enabled: true,
    },
    {
      name: "ESPA Fisheries",
      url: "https://alieia.minagric.gr/",
      type: "html_listing" as const,
      enabled: false, // Error
    },
    {
      name: "ESPA Ανθρώπινο Δυναμικό",
      url: "https://espa-anthropinodynamiko.gr/",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "Ανταγωνιστικότητα 2021-2027",
      url: "https://21-27.antagonistikotita.gr/",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "Ψηφιακός Μετασχηματισμός",
      url: "https://www.digitaltransform.gr/",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "ΟΠΣΚΕ",
      url: "https://app.opske.gr/",
      type: "single_page" as const,
      enabled: true,
    },
    {
      name: "Diavgeia HTML Search",
      url: "https://diavgeia.gov.gr/search?query=%CE%B5%CF%80%CE%AF%CE%B4%CE%BF%CE%BC%CE%B1",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "Greece 2.0 (Recovery Fund)",
      url: "https://greece20.gov.gr/",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "MinAgric (Rural Development)",
      url: "https://www.minagric.gr/rural-development-programs",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "YPEN (Energy & Environment)",
      url: "https://ypen.gov.gr/",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "Culture Portal (Grants)",
      url: "https://portal.culture.gov.gr/",
      type: "html_listing" as const,
      enabled: false, // Error
      config: {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        }
      }
    },
    {
      name: "EPA (National Development)",
      url: "https://epa.gov.gr/",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "Gov.gr - Επιδοτήσεις Πολιτών (κεντρική)",
      url: "https://www.gov.gr/ipiresies/periousia-kai-phorologia/epidoteseis-politon",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "Gov.gr - Ενίσχυση Επιχειρήσεων (κεντρική)",
      url: "https://www.gov.gr/ipiresies/epikheirematike-drasterioteta/eniskhuse-epikheireseon",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "ESPA - Όλες οι Προκηρύξεις (κύρια λίστα)",
      url: "https://www.espa.gr/el/Pages/Proclamations.aspx",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "ΟΠΕΚΕΠΕ - Αγροτικές Επιδοτήσεις & ΚΑΠ",
      url: "https://www.opekepe.gr/",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "ΟΠΕΚΕΠΕ - Ενιαία Αίτηση Ενίσχυσης (ΕΑΕ)",
      url: "https://eae.opekepe.gov.gr/",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "Αναπτυξιακός Νόμος - Επενδύσεις (mindev)",
      url: "https://www.mindev.gov.gr/",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "Αναπτυξιακός Νόμος - Πλατφόρμα Επενδύσεων",
      url: "https://ependyseis.mindev.gov.gr/",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "Diavgeia - Επιχορηγήσεις & Επιδόσεις",
      url: "https://diavgeia.gov.gr/",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "Oikogeneia - Οικογενειακά Επιδόματα (Canonical)",
      url: "https://www.oikogeneia.gov.gr/",
      type: "html_listing" as const,
      enabled: false, // Error
    },
  ];

  for (const sourceData of sources) {
    await Source.findOneAndUpdate(
      { name: sourceData.name },
      { $set: sourceData },
      { upsert: true, new: true }
    );
    console.log(`✅ Source ensured: ${sourceData.name} (${sourceData.enabled ? 'Enabled' : 'Disabled'})`);
  }

  console.log("✅ Seeding completed");
}

export default seed;
