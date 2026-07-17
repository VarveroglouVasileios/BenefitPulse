import { Opportunity } from "../../models/opportunity.model";
import { OpportunityKind, OpportunityType, Region } from "../../shared/types";
import { invalidateCache } from "../../utils/cache";

type CanonicalApplicationStatus = "open" | "closed" | "upcoming";

interface CanonicalOpportunity {
  title: string;
  summary: string;
  officialUrl: string;
  source: string;
  type: OpportunityType;
  kind: OpportunityKind;
  applicationStatus: CanonicalApplicationStatus;
  status: "published" | "archived";
  tags: string[];
  applicationStartAt?: Date;
  applicationEndAt?: Date;
  region?: Region;
}

export const CANONICAL_OPPORTUNITIES: CanonicalOpportunity[] = [
  {
    title: "Ελάχιστο Εγγυημένο Εισόδημα",
    summary:
      "Προνοιακή εισοδηματική ενίσχυση για νοικοκυριά που διαβιούν σε συνθήκες ακραίας φτώχειας. Η αίτηση υποβάλλεται ηλεκτρονικά με κωδικούς Taxisnet.",
    officialUrl:
      "https://opeka.gr/elachisto-engyimeno-eisodima/ilektronikes-ypiresies/",
    source: "ΟΠΕΚΑ – Ελάχιστο Εγγυημένο Εισόδημα",
    type: "subsidy",
    kind: "benefit",
    applicationStatus: "open",
    status: "published",
    tags: ["opeka", "eisodima", "koinoniki-prostasia"],
  },
  {
    title: "Επίδομα Στέγασης",
    summary:
      "Επιδότηση ενοικίου για νοικοκυριά που μισθώνουν την κύρια κατοικία τους. Απαιτείται ενεργό ηλεκτρονικό μισθωτήριο.",
    officialUrl:
      "https://opeka.gr/stegasi/epidoma-stegasis/ilektronikes-ypiresies/",
    source: "ΟΠΕΚΑ – Επίδομα Στέγασης",
    type: "subsidy",
    kind: "benefit",
    applicationStatus: "open",
    status: "published",
    tags: ["opeka", "stegasi", "enoikio"],
  },
  {
    title: "Επίδομα Γέννησης",
    summary:
      "Οικονομική ενίσχυση μετά τη γέννηση παιδιού. Η αίτηση υποβάλλεται ηλεκτρονικά στην εφαρμογή του ΟΠΕΚΑ ή κατά τη δήλωση γέννησης.",
    officialUrl:
      "https://opeka.gr/oikogeneia/epidoma-gennisis/ilektronikes-ypiresies/",
    source: "ΟΠΕΚΑ – Επίδομα Γέννησης",
    type: "subsidy",
    kind: "benefit",
    applicationStatus: "open",
    status: "published",
    tags: ["opeka", "oikogeneia", "goneis"],
  },
  {
    title: "Επίδομα Παιδιού Α21 – 2026",
    summary:
      "Το επίδομα παιδιού υποβάλλεται σε κύκλους. Ο τελευταίος επιβεβαιωμένος κύκλος αιτήσεων έκλεισε στις 8 Μαΐου 2026· αναμένεται νέα επίσημη ανακοίνωση για επόμενο άνοιγμα.",
    officialUrl:
      "https://opeka.gr/oikogeneia/epidoma-paidiou-a21/ilektronikes-ypiresies/",
    source: "ΟΠΕΚΑ – Επίδομα Παιδιού Α21",
    type: "subsidy",
    kind: "benefit",
    applicationStatus: "closed",
    status: "archived",
    applicationStartAt: new Date("2026-03-31T05:00:00.000Z"),
    applicationEndAt: new Date("2026-05-08T15:00:00.000Z"),
    tags: ["opeka", "oikogeneia", "children"],
  },
  {
    title: "Τουρισμός για Όλους 2026–2027",
    summary:
      "Το Υπουργείο Τουρισμού ανακοίνωσε νέο διετές πρόγραμμα. Η πρώτη φάση αιτήσεων αναμένεται να ανοίξει τον Αύγουστο 2026.",
    officialUrl:
      "https://mintour.gov.gr/toyrismos-gia-oloys-2026-2027-perissoteroi-dikaioychoi-megalyteri-diarkeia-ischyroteri-koinoniki-stirixi/",
    source: "Υπουργείο Τουρισμού",
    type: "voucher",
    kind: "voucher_pass",
    applicationStatus: "upcoming",
    status: "published",
    tags: ["tourism", "voucher", "upcoming"],
  },
  {
    title: "Νέο Εξοικονομώ για νοικοκυριά",
    summary:
      "Ανακοινωμένο πρόγραμμα ενεργειακής αναβάθμισης κατοικιών μέσω του Κοινωνικού Κλιματικού Ταμείου. Οι πρώτες δράσεις αναμένονται μέσα στο 2026.",
    officialUrl:
      "https://minfin.gov.gr/53-dis-evro-gia-perivallon-stegasi-metafores-meso-tou-koinonikou-klimatikou-tameiou/",
    source: "Υπουργείο Εθνικής Οικονομίας και Οικονομικών",
    type: "subsidy",
    kind: "program",
    applicationStatus: "upcoming",
    status: "published",
    tags: ["energeia", "stegasi", "upcoming"],
  },
  {
    title: "Youth Pass 2026",
    summary:
      "Ετήσια ψηφιακή κάρτα 150€ για νέους 18 και 19 ετών. Οι αιτήσεις του 2026 ολοκληρώθηκαν στις 15 Μαΐου.",
    officialUrl: "https://vouchers.gov.gr/youthpass",
    source: "vouchers.gov.gr",
    type: "voucher",
    kind: "voucher_pass",
    applicationStatus: "closed",
    status: "archived",
    applicationStartAt: new Date("2026-04-01T00:00:00.000Z"),
    applicationEndAt: new Date("2026-05-15T23:59:59.999Z"),
    tags: ["youth", "voucher"],
  },
  {
    title: "Chios–Kythira Pass 2026",
    summary:
      "Τουριστική ενίσχυση για Χίο και Κύθηρα. Οι αιτήσεις ολοκληρώθηκαν στις 18 Μαΐου 2026 και ακολούθησε κλήρωση δικαιούχων.",
    officialUrl: "https://vouchers.gov.gr/chioskythirapass2026",
    source: "vouchers.gov.gr",
    type: "voucher",
    kind: "voucher_pass",
    applicationStatus: "closed",
    status: "archived",
    applicationStartAt: new Date("2026-05-14T00:00:00.000Z"),
    applicationEndAt: new Date("2026-05-18T23:59:59.999Z"),
    tags: ["tourism", "voucher", "aegean-islands", "ionian-islands"],
  },
  {
    title: "Voucher κατάρτισης εργαζομένων ΔΥΠΑ 2026",
    summary:
      "Κατάρτιση εργαζομένων ιδιωτικού τομέα με εκπαιδευτικό επίδομα έως 750€ μικτά. Οι αιτήσεις ολοκληρώθηκαν στις 12 Μαρτίου 2026.",
    officialUrl:
      "https://www.dypa.gov.gr/anighoyn-simera-oi-aitiseis-ghia-ti-nea-drasi-katartisis-erghazomenon-tis-dypa",
    source: "ΔΥΠΑ",
    type: "voucher",
    kind: "program",
    applicationStatus: "closed",
    status: "archived",
    applicationStartAt: new Date("2026-03-10T10:00:00.000Z"),
    applicationEndAt: new Date("2026-03-12T10:00:00.000Z"),
    tags: ["employee", "training", "voucher"],
  },
  {
    title: "Κοινωνικός Τουρισμός ΔΥΠΑ 2026–2027",
    summary:
      "Οι αιτήσεις δικαιούχων έχουν ολοκληρωθεί και έχουν αναρτηθεί οι οριστικοί πίνακες. Το πρόγραμμα διακοπών παραμένει σε υλοποίηση για τους δικαιούχους.",
    officialUrl:
      "https://www.dypa.gov.gr/anartithikan-oi-oristiki-pinakes-koinonikou-toyrismou-periodoy-2026-2027",
    source: "ΔΥΠΑ",
    type: "voucher",
    kind: "voucher_pass",
    applicationStatus: "closed",
    status: "archived",
    applicationEndAt: new Date("2026-04-29T20:59:59.999Z"),
    tags: ["tourism", "voucher", "results"],
  },
];

export async function syncCanonicalOpportunities(): Promise<{
  upserted: number;
  corrected: number;
}> {
  let upserted = 0;

  for (const opportunity of CANONICAL_OPPORTUNITIES) {
    const urlWithoutTrailingSlash = opportunity.officialUrl.replace(/\/$/, "");
    const result = await Opportunity.updateOne(
      {
        $or: [
          { officialUrl: opportunity.officialUrl },
          { officialUrl: urlWithoutTrailingSlash },
          { title: opportunity.title },
        ],
      },
      {
        $set: {
          ...opportunity,
          sourceType: "manual",
          sourcePriority: 1,
          confidence: 1,
          criteriaUnknown: false,
          criteriaJson: {
            applicationStatus: opportunity.applicationStatus,
          },
          criteriaRulesJson: {},
          isLocked: true,
          deletedAt: null,
        },
        $setOnInsert: {
          publishedAt: new Date(),
        },
      },
      { upsert: true },
    );
    upserted += result.upsertedCount + result.modifiedCount;
  }

  const corrections = await Promise.all([
    Opportunity.updateMany(
      {
        source: { $regex: /διαύγεια/i },
        title: { $regex: /(?:\bΕΕΕ\b|Ελάχιστο Εγγυημένο Εισόδημα)/i },
      },
      {
        $set: {
          status: "rejected",
          kind: "decision",
          applicationStatus: "unknown",
          rejectionReason: "Administrative Diavgeia mention; not a citizen application",
        },
      },
    ),
    Opportunity.updateMany(
      { title: { $regex: /προθεσμί(?:α|ες) υλοποίησης κατάρτισης/i } },
      {
        $set: {
          status: "rejected",
          kind: "news",
          applicationStatus: "news",
          rejectionReason: "Implementation notice; no citizen application",
        },
      },
    ),
    Opportunity.updateMany(
      { title: { $regex: /^Πρόγραμμα «?Σπίτι μου»?$/i } },
      {
        $set: {
          status: "archived",
          applicationStatus: "closed",
          source: "ΔΥΠΑ – Στεγαστική Πολιτική",
          kind: "program",
        },
      },
    ),
    Opportunity.updateMany(
      { title: { $regex: /Κοινωνικός Τουρισμός 2026/i } },
      {
        $set: {
          status: "archived",
          applicationStatus: "closed",
          "criteriaJson.applicationStatus": "closed",
        },
      },
    ),
    Opportunity.updateMany(
      { title: { $regex: /250 ανέργων.*Θεσσαλί/i } },
      {
        $set: {
          region: "thessaly",
          source: "ΔΥΠΑ – Ανοικτά Προγράμματα",
        },
        $unset: {
          "criteriaJson.regionConflict": "",
        },
      },
    ),
  ]);

  const corrected = corrections.reduce(
    (total, result) => total + result.modifiedCount,
    0,
  );

  await invalidateCache("feed_*");
  return { upserted, corrected };
}
