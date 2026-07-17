import assert from "node:assert/strict";
import { cleanAndValidate } from "../modules/ingestion/cleaner";
import {
  hasClosedLifecycleSignal,
} from "./lifecycle-signals";
import { computeStatus } from "./status-engine";
import {
  extractTitleTokens,
  haveConflictingTitleYears,
  titleTokenOverlap,
} from "./title-dedup";

const now = new Date("2026-07-10T07:00:00.000Z");

assert.equal(
  hasClosedLifecycleSignal("Έκλεισαν οι αιτήσεις"),
  true,
  "Greek plural closure must be recognized",
);

const bilingualOverlap = titleTokenOverlap(
  extractTitleTokens("Gigabit Connectivity Voucher"),
  extractTitleTokens("Κουπόνι συνδεσιμότητας Gigabit"),
);
assert.ok(
  bilingualOverlap >= 0.65,
  `Bilingual Gigabit titles must deduplicate (overlap=${bilingualOverlap})`,
);
assert.equal(
  haveConflictingTitleYears("Κοινωνικός Τουρισμός 2025", "Κοινωνικός Τουρισμός 2026"),
  true,
  "Different annual cycles must never deduplicate",
);
const genericContainmentOverlap = titleTokenOverlap(
  extractTitleTokens("Voucher εργαζομένων"),
  extractTitleTokens("Voucher εργαζομένων 2026 κατάρτιση ψηφιακές δεξιότητες"),
);
assert.ok(
  genericContainmentOverlap < 0.65,
  `A short generic title must not absorb a richer program title (overlap=${genericContainmentOverlap})`,
);

const activeWindow = computeStatus(
  {
    title: "Ανακοίνωση 01/05/2026 – αιτήσεις",
    applicationStartAt: new Date("2026-07-01T00:00:00.000Z"),
    applicationEndAt: new Date("2026-08-01T00:00:00.000Z"),
  },
  now,
);
assert.equal(activeWindow.applicationStatus, "open");
assert.equal(activeWindow.status, "published");

const closedWithoutDeadline = computeStatus(
  {
    title: "Πρόγραμμα κατάρτισης",
    pageSignals: ["Έκλεισαν οι αιτήσεις"],
  },
  now,
);
assert.equal(closedWithoutDeadline.applicationStatus, "closed");
assert.equal(closedWithoutDeadline.status, "archived");

const resultsAnnouncement = cleanAndValidate({
  nowIso: now.toISOString(),
  source: "Gov",
  sourceUrl: "https://www.gov.gr",
  itemUrl: "https://www.gov.gr/test-results",
  rawTitle: "Αναρτήθηκαν οι οριστικοί πίνακες δικαιούχων",
  rawContent:
    "Αναρτήθηκαν οι οριστικοί πίνακες. Τα vouchers χρησιμοποιούνται από 1 Ιανουαρίου 2027 έως 31 Ιανουαρίου 2027.",
  rawFetchedAtIso: now.toISOString(),
});
assert.equal(resultsAnnouncement.applicationStatus, "results");
assert.equal(resultsAnnouncement.status, "archived");
assert.equal(resultsAnnouncement.startAt, null);
assert.equal(resultsAnnouncement.deadlineAt, null);
assert.equal(resultsAnnouncement.applicationStartAt, null);
assert.equal(resultsAnnouncement.applicationEndAt, null);

const diavgeiaSeminarMention = cleanAndValidate({
  nowIso: now.toISOString(),
  source: "Διαύγεια RSS",
  sourceUrl: "https://diavgeia.gov.gr",
  itemUrl: "https://diavgeia.gov.gr/decision/view/example",
  rawTitle: "Έγκριση συμμετοχής σε σεμινάριο με θέμα το ΕΕΕ",
  rawContent:
    "Ο Δήμαρχος εγκρίνει τη συμμετοχή υπαλλήλου σε σεμινάριο για το πρόγραμμα Ελάχιστο Εγγυημένο Εισόδημα.",
  rawFetchedAtIso: now.toISOString(),
});
assert.equal(diavgeiaSeminarMention.kind, "service_info");
assert.equal(diavgeiaSeminarMention.status, "rejected");

const implementationNotice = cleanAndValidate({
  nowIso: now.toISOString(),
  source: "ΔΥΠΑ – Νέα/Ανακοινώσεις",
  sourceUrl: "https://www.dypa.gov.gr",
  itemUrl: "https://www.dypa.gov.gr/prothesmies-ilopoiisis-katartisis",
  rawTitle: "Προθεσμίες υλοποίησης κατάρτισης ανοιχτού τύπου",
  rawContent:
    "Διοικητική ανακοίνωση προς παρόχους για τις προθεσμίες υλοποίησης των ήδη εγκεκριμένων προγραμμάτων.",
  rawFetchedAtIso: now.toISOString(),
});
assert.equal(implementationNotice.kind, "service_info");
assert.equal(implementationNotice.status, "rejected");

const ordinaryArticleWithApo = cleanAndValidate({
  nowIso: now.toISOString(),
  source: "Υπουργείο",
  sourceUrl: "https://www.gov.gr",
  itemUrl: "https://www.gov.gr/example-article",
  rawTitle: "Ενημέρωση για πρόγραμμα κοινωνικής πολιτικής",
  rawContent:
    "Το πρόγραμμα παρουσιάστηκε από το Υπουργείο και περιγράφει τις δράσεις κοινωνικής πολιτικής χωρίς ανακοίνωση έναρξης ή υποβολής αιτήσεων.",
  rawFetchedAtIso: now.toISOString(),
});
assert.notEqual(ordinaryArticleWithApo.applicationStatus, "upcoming");
assert.notEqual(ordinaryArticleWithApo.status, "published");

console.log("Lifecycle regression smoke tests passed.");
