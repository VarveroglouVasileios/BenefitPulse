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
    // ΑΣΕΠ Sources (using RSS as primary, HTML listings disabled if 404)
    {
      name: "ΑΣΕΠ - Διαγωνισμοί",
      url: "https://info.asep.gr/search/contest",
      type: "html_listing" as const,
      enabled: false, // Disabled: may return 404, using RSS feed instead
    },
    {
      name: "ΑΣΕΠ - Θέσεις Εργασίας",
      url: "https://info.asep.gr/positions",
      type: "html_listing" as const,
      enabled: false, // Disabled: may return 404, using RSS feed instead
    },
    {
      name: "ΑΣΕΠ - Αρχείο Δελτίων Τύπου",
      url: "https://info.asep.gr/archive/announcements",
      type: "html_listing" as const,
      enabled: true, // Fixed: correct URL
    },
    {
      name: "ΑΣΕΠ - Ειδικές Ανακοινώσεις",
      url: "https://info.asep.gr/archive/special-announcements",
      type: "html_listing" as const,
      enabled: false, // Disabled: may return 404, using RSS feed instead
    },
    {
      name: "ΑΣΕΠ - Αρχείο Ανακοινώσεων ΣΟΧ & ΣΜΕ",
      url: "https://info.asep.gr/arheio-anakoinoseon-soh-sme",
      type: "html_listing" as const,
      enabled: true, // Fixed: correct URL
    },
    {
      name: "ΑΣΕΠ - Announcements List (FIXED)",
      url: "https://info.asep.gr/announcements-list/",
      type: "html_listing" as const,
      enabled: true, // Fixed: using stable listing page
    },
    {
      name: "Διαύγεια API (opendata search)",
      url: "https://opendata.diavgeia.gov.gr/luminapi/api/search/export?q=subject%3A%28%CE%B5%CF%80%CE%AF%CE%B4%CE%BF%CE%BC%CE%B1+OR+%CE%B5%CF%80%CE%B9%CE%B4%CF%8C%CF%84%CE%B7%CF%83%CE%B7+OR+voucher+OR+pass+OR+youth+pass+OR+tourism4all+OR+north+evia+pass+OR+thessaly-evros+pass%29&wt=json&rows=50&start=0",
      type: "api" as const,
      enabled: true, // Using opendata search/export with subject field filter and proper Solr syntax
    },
    {
      name: "Διαύγεια Search RSS (fallback)",
      url: "https://diavgeia.gov.gr/luminapi/api/feed/rss?q=(%CE%B5%CF%80%CE%AF%CE%B4%CE%BF%CE%BC%CE%B1%20OR%20voucher%20OR%20pass)",
      type: "rss" as const,
      enabled: true, // Fallback: RSS feed if API fails
    },
    {
      name: "Vouchers Catalog",
      url: "https://vouchers.gov.gr/",
      type: "html_catalog" as const,
      enabled: true,
    },
    // GOV.GR catalogs (DISABLED: returns 403 Forbidden)
    {
      name: "GovGR Υγεία & Πρόνοια - Επιδόματα",
      url: "https://www.gov.gr/ipiresies/ugeia-kai-pronoia/epidomata",
      type: "html_listing" as const,
      enabled: true, // Re-enabled: page should load again
    },
    {
      name: "GovGR Επιδoτήσεις πολιτών",
      url: "https://www.gov.gr/ipiresies/periousia-kai-phorologia/epidoteseis-politon",
      type: "html_listing" as const,
      enabled: false, // Disabled: 403 Forbidden (blocked)
    },
    // Vouchers / Pass specific pages
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
    // ΟΠΕΚΑ
    {
      name: "OPEKA Επιδόματα",
      url: "https://opeka.gr/epidomata/",
      type: "html_listing" as const,
      enabled: true,
    },
    // ΔΥΠΑ (Legacy)
    {
      name: "ΔΥΠΑ Επιδόματα/Βοηθήματα",
      url: "https://www.dypa.gov.gr/epidomata-boithimata",
      type: "html_listing" as const,
      enabled: false, // Disabled: hub page with navigation, needs specific parser
    },
    // ΔΥΠΑ Sources (Canonical URLs)
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
    // Prosvasis sections (FIXED URLs - removed broken more-* pages)
    {
      name: "ΔΥΠΑ Prosvasis - Προγράμματα Απασχόλησης",
      url: "https://prosvasis.dypa.gov.gr/active-employment-policies",
      type: "html_listing" as const,
      enabled: true, // Fixed: using correct listing page
    },
    // Removed broken more-* pages (404) - using RSS feed instead
    {
      name: "ΔΥΠΑ Prosvasis - Εργαλειοθήκη Εργοδότη",
      url: "https://prosvasis.dypa.gov.gr/erghaleiothiki-erghodoti",
      type: "html_listing" as const,
      enabled: true, // Fixed: correct URL without /el/ and correct spelling
    },
    // ΑΑΔΕ / myΘέρμανση (FIXED: removed broken EN version)
    // Ελάχιστο Εγγυημένο Εισόδημα
    {
      name: "Ελάχιστο Εγγυημένο Εισόδημα",
      url: "https://keaprogram.gr/",
      type: "html_listing" as const,
      enabled: true,
    },
    // Στέγαση
    {
      name: "Stegasi Catalog",
      url: "https://stegasi.gov.gr/",
      type: "html_listing" as const,
      enabled: true,
    },
    // Φοιτητικό στεγαστικό
    {
      name: "Φοιτητικό Στεγαστικό",
      url: "https://portal.stegastiko.minedu.gov.gr/",
      type: "html_listing" as const,
      enabled: true, // Fixed: removed /index
    },
    // e-ΕΦΚΑ (DISABLED: broken URL, needs discovery)
    {
      name: "e-ΕΦΚΑ Επιδόματα",
      url: "https://www.e-efka.gov.gr/el/epidomata",
      type: "html_listing" as const,
      enabled: true, // Re-enabled: page now loads again
    },
    {
      name: "ΕΦΚΑ Επιδόματα (efka.gov.gr)",
      url: "https://www.efka.gov.gr/",
      type: "html_catalog" as const,
      enabled: true, // Using efka.gov.gr and discovery
    },
    // NEW SOURCES
    // MITOS / ΕΜΔΔ (DISABLED: needs API key and specific endpoints)
    {
      name: "MITOS - EMDD API",
      url: "https://api.digigov.grnet.gr/v1",
      type: "api" as const,
      enabled: false, // Disabled: needs API key and specific endpoints (e.g., /services)
    },
    {
      name: "MITOS - EMDD API (Services)",
      url: "https://api.digigov.grnet.gr/v1/services",
      type: "api" as const,
      enabled: true, // Enabled: uses /v1/services endpoint with pagination
      config: {
        params: {
          page: 1,
          limit: 100, // Fetch first 100 services per page
        },
      },
    },
    // OPEKA Announcements (discovery)
    {
      name: "OPEKA - Ανακοινώσεις / Δελτία Τύπου (discovery)",
      url: "https://opeka.gr/",
      type: "html_listing" as const,
      enabled: true,
    },
    // ΔΥΠΑ Announcements (discovery)
    {
      name: "ΔΥΠΑ - Νέα/Ανακοινώσεις (discovery)",
      url: "https://www.dypa.gov.gr/",
      type: "html_listing" as const,
      enabled: true,
    },
    // ΔΥΠΑ Κοινωνικός Τουρισμός (single page program description)
    {
      name: "ΔΥΠΑ - Κοινωνικός Τουρισμός",
      url: "https://www.dypa.gov.gr/koinonikos-toyrismos",
      type: "single_page" as const,
      enabled: true,
    },
    // AADE myΘέρμανση (Greek page)
    {
      name: "AADE - myΘέρμανση (EL)",
      url: "https://www.aade.gr/mythermansi",
      type: "single_page" as const,
      enabled: true,
    },
    // Gov.gr category hub
    {
      name: "gov.gr - Υγεία & Πρόνοια (category hub)",
      url: "https://www.gov.gr/ipiresies/ugeia-kai-pronoia",
      type: "html_catalog" as const,
      enabled: true, // Re-enabled for retry; specific sub-pages are already covered too
    },
    // NEW SOURCES - Expanded data sources
    {
      name: "Vouchers Gov",
      url: "https://vouchers.gov.gr/",
      type: "html_listing" as const,
      enabled: true, // Target generic listing cards
    },
    {
      name: "ESPA Antagonistikotita",
      url: "http://epan2.antagonistikotita.gr/uploads/rss.xml",
      type: "rss" as const,
      enabled: true, // RSS feed for competitiveness programs
    },
    {
      name: "ΑΣΕΠ - Νέα",
      url: "https://www.asep.gr/guide/news.xml",
      type: "rss" as const,
      enabled: true,
    },
    {
      name: "ΔΥΠΑ - Δελτία Τύπου",
      url: "https://www.dypa.gov.gr/deltia-typou?format=feed&type=rss",
      type: "rss" as const,
      enabled: true,
    },
    {
      name: "TaxHeaven News",
      url: "https://www.taxheaven.gr/rss",
      type: "rss" as const,
      enabled: true, // RSS feed for tax-related announcements (catches "Spiti Mou" etc.)
    },
    {
      name: "ASEP Announcements",
      url: "https://www.asep.gr/rss/news",
      type: "rss" as const,
      enabled: true, // RSS feed for ASEP job announcements (more reliable than HTML)
    },
    {
      name: "Dentist Pass",
      url: "https://vouchers.gov.gr/dentistpass",
      type: "single_page" as const,
      enabled: true, // Dentist Pass specific page
    },
    // ESPA Extended
    {
      name: "ESPA Proclamations",
      url: "https://www.espa.gr/el/Pages/Rss.aspx?FeedType=Proclamations",
      type: "rss" as const,
      enabled: true,
    },
    {
      name: "ESPA Fisheries",
      url: "https://alieia.mc.gov.gr/metra-eniksis-tis-alieias/",
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
      name: "Ψηφιακός Μετασχηματισμός",
      url: "https://www.digitaltransform.gr/",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "ΟΠΣΚΕ",
      url: "https://app.opske.gr/",
      type: "single_page" as const,
      enabled: true, // Useful for cross-checking application portals
    },
    {
      name: "Diavgeia HTML Search",
      url: "https://diavgeia.gov.gr/search?query=%CE%B5%CF%80%CE%AF%CE%B4%CE%BF%CE%BC%CE%B1",
      type: "html_listing" as const,
      enabled: true,
    },
    // --- NEW SOURCES (User Request Jan 2026) ---
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
      enabled: true,
    },
    {
      name: "EPA (National Development)",
      url: "https://epa.gov.gr/",
      type: "html_listing" as const,
      enabled: true,
    },
    // --- NEW SOURCES (User Request Feb 2026) ---
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
    // Optional / high-coverage sources
    {
      name: "Diavgeia - Επιχορηγήσεις & Επιδόσεις",
      url: "https://diavgeia.gov.gr/",
      type: "html_listing" as const,
      enabled: true,
    },
    {
      name: "Oikogeneia - Οικογενειακά Επιδόματα",
      url: "https://www.oikogeneia.gov.gr/",
      type: "html_listing" as const,
      enabled: true,
    },
  ];

  // Check for duplicates and deduplicate, update broken URLs
  const seenUrls = new Set<string>();
  const duplicates: Array<{ name: string; url: string }> = [];
  const urlMigrations: Array<{ from: string; to: string; name?: string }> = [
    {
      from: "https://vouchers.gov.gr/tourism4all-%F0%9F%9B%A1%EF%B8%8F%202025",
      to: "https://vouchers.gov.gr/tourism4all-2025",
      name: "Tourism4All 2025 Page",
    },
    {
      from: "https://vouchers.gov.gr/tourism4all-%F0%9F%9B%A1%EF%B8%8F-2025",
      to: "https://vouchers.gov.gr/tourism4all-2025",
      name: "Tourism4All 2025 Page",
    },
  ];

  for (const migration of urlMigrations) {
    const existing = await Source.findOne({
      url: { $regex: new RegExp(`^${migration.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") }
    });

    if (existing) {
      console.log(`⚠️  Migrating broken URL: "${existing.url}" → "${migration.to}"`);
      existing.url = migration.to;
      if (migration.name) {
        existing.name = migration.name;
      }
      existing.enabled = true;
      await existing.save();
    }
  }

  for (const sourceData of sources) {
    const normalizedUrl = sourceData.url.toLowerCase().trim();
    
    // Check if exact URL already exists (case-insensitive)
    const exists = await Source.findOne({ 
      url: { $regex: new RegExp(`^${normalizedUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });
    
    if (exists) {
      // Exact URL match - update if needed
      if (exists.name !== sourceData.name) {
        console.log(`⚠️  Updating source name: "${exists.name}" → "${sourceData.name}"`);
        exists.name = sourceData.name;
      }
      if (!exists.enabled) {
        exists.enabled = true;
        console.log(`✅ Source enabled: ${sourceData.name}`);
      }
      await exists.save();
    } else {
      // Check for broken URLs that need updating (prosvasis without /el/)
      if (sourceData.url.includes("prosvasis.dypa.gov.gr") && sourceData.url.includes("/el/")) {
        // Check if there's an old version without /el/ (exact path match)
        const urlPath = new URL(sourceData.url).pathname;
        const oldPath = urlPath.replace("/el/", "/");
        const oldUrl = sourceData.url.replace(urlPath, oldPath);
        
        const oldExists = await Source.findOne({
          url: { $regex: new RegExp(`^${oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        });
        
        if (oldExists) {
          console.log(`⚠️  Updating broken URL: "${oldExists.url}" → "${sourceData.url}"`);
          oldExists.url = sourceData.url;
          oldExists.name = sourceData.name;
          oldExists.enabled = true;
          await oldExists.save();
          console.log(`✅ Source updated: ${sourceData.name}`);
          seenUrls.add(normalizedUrl);
          continue;
        }
      }
      
      // Check for duplicates in current batch
      if (seenUrls.has(normalizedUrl)) {
        // Duplicate in current batch
        duplicates.push({ name: sourceData.name, url: sourceData.url });
        console.log(`⚠️  Duplicate URL in batch: ${sourceData.name} (${sourceData.url})`);
      } else {
        // New source
        await Source.create(sourceData);
        seenUrls.add(normalizedUrl);
        console.log(`✅ Source created: ${sourceData.name}`);
      }
    }
  }

  if (duplicates.length > 0) {
    console.log(`⚠️  Found ${duplicates.length} duplicate URLs (kept first occurrence)`);
  }

  console.log("✅ Seeding completed");
}

export default seed;
