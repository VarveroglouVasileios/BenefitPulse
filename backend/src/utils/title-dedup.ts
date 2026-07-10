const STOP_WORDS = new Set([
  "το",
  "τα",
  "τον",
  "την",
  "τους",
  "τις",
  "ο",
  "η",
  "οι",
  "για",
  "και",
  "της",
  "του",
  "στο",
  "στη",
  "στον",
  "στην",
  "με",
  "απο",
  "προγραμμα",
  "program",
  "the",
  "for",
  "of",
  "νεο",
  "new",
  "νεα",
  "δραση",
  "δρασης",
]);

const TOKEN_ALIASES: Record<string, string> = {
  vouchers: "voucher",
  κουπονι: "voucher",
  κουπονια: "voucher",
  συνδεσιμοτητα: "connectivity",
  συνδεσιμοτητας: "connectivity",
  ετοιμοτητα: "readiness",
  ετοιμοτητας: "readiness",
  εξυπνη: "smart",
  εξυπνης: "smart",
};

function normalizedWords(title: string): string[] {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[«»"'()[\]{}\-–—]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function extractTitleTokens(title: string): Set<string> {
  const words = normalizedWords(title);
  const tokens = new Set(
    words
      .map((token) => TOKEN_ALIASES[token] || token)
      .filter((token) => token.length >= 4 && !STOP_WORDS.has(token)),
  );

  // Known bilingual program vocabulary: make both language variants converge
  // without treating every one-word "voucher" title as the same program.
  if (
    tokens.has("gigabit") &&
    (tokens.has("voucher") || tokens.has("connectivity"))
  ) {
    tokens.add("voucher");
    tokens.add("connectivity");
  }
  if (
    (tokens.has("smart") || words.some((word) => word.startsWith("εξυπν"))) &&
    tokens.has("readiness")
  ) {
    tokens.add("smart");
    tokens.add("readiness");
  }

  return tokens;
}

export function titleTokenOverlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const shared = [...a].filter((token) => b.has(token)).length;
  return shared / Math.min(a.size, b.size);
}
