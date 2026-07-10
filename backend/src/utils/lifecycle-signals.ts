export const CLOSED_LIFECYCLE_KEYWORDS = [
  "ολοκληρωθηκαν",
  "ολοκληρωθηκε",
  "εληξε",
  "εκλεισε",
  "εκλεισαν",
  "τελειωσε",
  "κλειστο",
  "μη διαθεσιμο",
  "δεν δεχεται αιτησεις",
  "η προθεσμια εληξε",
  "ολοκληρωση αιτησεων",
  "ολοκληρωση υποβολης",
  "completed",
  "closed",
  "ended",
  "finished",
] as const;

const RESULTS_TITLE_KEYWORDS = [
  "αναρτηθηκαν πινακες",
  "αναρτηθηκαν οι πινακες",
  "ανακοινωθηκαν πινακες",
  "ανακοινωθηκαν οι πινακες",
  "οριστικοι πινακες",
  "προσωρινοι πινακες",
  "πινακες αποτελεσματων",
  "αναρτηθηκαν αποτελεσματα",
  "ανακοινωθηκαν αποτελεσματα",
  "οριστικα αποτελεσματα",
  "προσωρινα αποτελεσματα",
] as const;

export function normalizeLifecycleText(text: string): string {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasClosedLifecycleSignal(text: string): boolean {
  const normalized = normalizeLifecycleText(text);
  return CLOSED_LIFECYCLE_KEYWORDS.some((keyword) =>
    normalized.includes(keyword),
  );
}

export function isResultsAnnouncementTitle(title: string): boolean {
  const normalized = normalizeLifecycleText(title);
  return RESULTS_TITLE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}
