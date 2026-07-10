import assert from "node:assert/strict";
import { cleanAndValidate } from "../modules/ingestion/cleaner";
import {
  hasClosedLifecycleSignal,
} from "./lifecycle-signals";
import { computeStatus } from "./status-engine";
import {
  extractTitleTokens,
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

console.log("Lifecycle regression smoke tests passed.");
