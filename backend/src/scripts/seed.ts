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
      url: "https://info.asep.gr/",
      type: "html_listing" as const,
      enabled: true,
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
      name: "ΔΥΠΑ Voucher Κατάρτισης",
      url: "https://voucher.gov.gr/",
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
      enabled: true,
    },
    {
      name: "Youth Pass Page",
      url: "https://vouchers.gov.gr/youthpass",
      type: "single_page" as const,
      enabled: true,
    },
    {
      name: "Fuel Pass III",
      url: "https://vouchers.gov.gr/fuelpass",
      type: "single_page" as const,
      enabled: true,
    },
    {
      // Tourism4All 2025 έληξε. Ενεργοποίησε όταν ανακοινωθεί το 2026.
      name: "Tourism4All 2025 Page",
      url: "https://vouchers.gov.gr/tourism4all-2025",
      type: "single_page" as const,
      enabled: false,
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
      // Disabled: deep fetch hits redirect loop on /e-services?tab=... links found on this page.
      // Published 0 items consistently — not worth the noise.
      name: "ΔΥΠΑ Prosvasis - Εργαλειοθήκη Εργοδότη",
      url: "https://prosvasis.dypa.gov.gr/erghaleiothiki-erghodoti",
      type: "html_listing" as const,
      enabled: false,
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
      url: "https://mitos.gov.gr/",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "MITOS - EMDD API (Services)",
      url: "https://mitos.gov.gr/index.php/%CE%91%CF%81%CF%87%CE%B9%CE%BA%CE%AE_%CF%83%CE%B5%CE%BB%CE%AF%CE%B4%CE%B1",
      type: "html_listing" as const,
      enabled: true,
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
      url: "https://21-27.antagonistikotita.gr/feed/",
      type: "rss" as const,
      enabled: true,
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
      url: "https://ependyseis.mindev.gov.gr/el",
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
      url: "https://www.alieia.gr/",
      type: "html_listing" as const,
      enabled: true,
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
      name: "Ανταγωνιστικότητα Προκηρύξεις",
      url: "https://21-27.antagonistikotita.gr/category/energes-proskliseis/",
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
      url: "https://www.culture.gov.gr/",
      type: "html_listing" as const,
      enabled: true,
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
      name: "ΕΣΠΑ Προκηρύξεις",
      url: "https://www.espa.gr/el/Pages/procsimsea.aspx",
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
      url: "https://opeka.gr/oikogeneia/",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "OPEKA Επιδόματα λίστα",
      url: "https://www.opeka.gr/epidomata/",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "Σπίτι μου II",
      url: "https://www.dypa.gov.gr/spitimou",
      type: "single_page" as const,
      enabled: true,
    },
    {
      name: "Digital School - Ενεργός Πολίτης",
      url: "https://act.digitalschool.gov.gr/",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "Υπουργείο Υγείας - Δελτία Τύπου",
      url: "https://www.moh.gov.gr/articles/ministry/grafeio-typoy/press-releases",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "ΓΓ Συντονισμού - Ανακοινώσεις",
      url: "https://gsco.gov.gr/",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "Υπουργείο Κοινωνικής Συνοχής - Ανακοινώσεις",
      url: "https://minscfa.gov.gr/",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "Υπουργείο Υποδομών & Μεταφορών - Ανακοινώσεις",
      url: "https://www.m-t.gov.gr/",
      type: "html_listing" as const,
      enabled: true,
    },
    // ── Νέες πηγές (April 2026) ────────────────────────────────────────────
    {
      name: "Κινούμαι Ηλεκτρικά Γ' κύκλος",
      url: "https://kinoumeilektrika3.gov.gr/",
      type: "single_page" as const,
      enabled: true,
    },
    {
      name: "Ανακαινίζω - Νοικιάζω",
      url: "https://www.gov.gr/ipiresies/periousia-kai-phorologia/epidoteseis-politon/anakainizo-noikiazo",
      type: "single_page" as const,
      enabled: true,
    },
    {
      // TODO: URL 404 — gov.gr αναδιοργάνωσε τις σελίδες επιδοτήσεων.
      // Βρες το σωστό URL από: https://www.gov.gr/ipiresies/periousia-kai-phorologia/epidoteseis-politon
      // και ενεργοποίησε ξανά.
      name: "Αναβαθμίζω το Σπίτι μου",
      url: "https://www.gov.gr/ipiresies/periousia-kai-phorologia/epidoteseis-politon/anavathmizo-to-spiti-mou",
      type: "single_page" as const,
      enabled: false,
    },
    {
      // Fixed Apr 2026: prosvasis.dypa.gov.gr has the canonical page (old dypa.gov.gr slug was 404)
      name: "ΔΥΠΑ - Πρόσληψη Ανέργων 50+ (5.000 θέσεις)",
      url: "https://prosvasis.dypa.gov.gr/active-employment-policies/proghramma-epikhorighisis-epikheiriseon-ghia-tin-proslipsi-5000-anerghon-ilikias-ano-ton-50-etwn-se-epikheiriseis-toy-idiotikou-tomea",
      type: "single_page" as const,
      enabled: true,
    },
    {
      // Fixed Apr 2026: prosvasis.dypa.gov.gr has the canonical page (old dypa.gov.gr slug was 404)
      name: "ΔΥΠΑ - Πρόσληψη 10.000 Ανέργων Γυναικών",
      url: "https://prosvasis.dypa.gov.gr/active-employment-policies/proghramma-epikhorighisis-epikheiriseon-ghia-tin-proslipsi-10000-anerghon-ghinaikwn-me-emfasi-se-miteres-anilikon-teknon",
      type: "single_page" as const,
      enabled: true,
    },
    {
      // Added Apr 2026: OPEN program — 1.500 unemployed aged 57+ in public health sector
      name: "ΔΥΠΑ - Πρόσληψη 1.500 Ανέργων 57+ (Δημόσια Υγεία)",
      url: "https://prosvasis.dypa.gov.gr/active-employment-policies/eidiko-proghramma-ghia-tin-proslipsi-1500-anerghon-ilikias-57-etwn-kai-ano-ston-dimosio-tomea-tis-ighias",
      type: "single_page" as const,
      enabled: true,
    },
    {
      // Added Apr 2026: OPEN program — 2.000 unemployed 18+ in Eastern Macedonia & Thrace region
      name: "ΔΥΠΑ - Πρόσληψη 2.000 Ανέργων 18+ (Ανατολική Μακεδονία & Θράκη)",
      url: "https://prosvasis.dypa.gov.gr/active-employment-policies/proghramma-epikhorighisis-epikheiriseon-ghia-tin-proslipsi-2000-anerghon-18-etwn-ano-stin-per-anatolikis-makedonias-thrakis",
      type: "single_page" as const,
      enabled: true,
    },
    {
      // Added Apr 2026: OPEN program — work experience for unemployed aged 30+
      name: "ΔΥΠΑ - Εργασιακή Εμπειρία Ανέργων 30+",
      url: "https://prosvasis.dypa.gov.gr/active-employment-policies/anoikto-proghramma-apoktisis-epaghghelmatikiserghasiakis-empeirias-ghia-anerghoys-ilikias-30-etwn-kai-ano-30-me-emfasi-se-omades-me-apokhi-apo-tin-aghora-erghasias-kai-omades-poy-plittontai-idiaitera-apo-tin-anerghia",
      type: "single_page" as const,
      enabled: true,
    },
    {
      // TODO: URL 404 — gov.gr αναδιοργάνωσε τις σελίδες.
      // Βρες από: https://www.gov.gr/ipiresies/periousia-kai-phorologia/epidoteseis-politon
      name: "Νταντάδες της Γειτονιάς",
      url: "https://www.gov.gr/ipiresies/periousia-kai-phorologia/epidoteseis-politon/nantades-tis-geitonias",
      type: "single_page" as const,
      enabled: false,
    },
    {
      // Η gov.gr επιστρέφει 403 στο deep fetch (bot protection).
      // Το record υπάρχει ήδη στη DB από προηγούμενο επιτυχές scrape.
      // Αν χρειαστεί ανανέωση: βρες alternative URL ή χρησιμοποίησε τον GovGR hub scraper.
      name: "Αλλάζω Συσκευή / Θερμοσίφωνα",
      url: "https://www.gov.gr/ipiresies/periousia-kai-phorologia/epidoteseis-politon/allazw-syskeyi",
      type: "single_page" as const,
      enabled: false,
    },
    {
      name: "Εξοικονομώ - Ανακαινίζω (Νέο 2026)",
      url: "https://exoikonomoneon.gov.gr/",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "ESPA - Ανταγωνιστικότητα Ενεργές Προσκλήσεις",
      url: "https://www.espa.gr/el/Pages/procsimsea.aspx",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "Ypergasias - Δελτία Τύπου",
      url: "https://ypergasias.gov.gr/feed/",
      type: "rss" as const,
      enabled: true,
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
