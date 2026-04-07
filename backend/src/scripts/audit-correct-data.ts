import * as fs from "fs";
import * as path from "path";
import { connectMongo, disconnectMongo } from "../db/mongo";
import { Opportunity } from "../models/opportunity.model";

type ParsedEntry = {
  index: number;
  title: string;
  sourceSection: string;
  expectedStatus?: string;
  link: string;
};

type OpportunityRow = {
  title: string;
  officialUrl: string;
  source: string;
  status: string;
  applicationStatus?: string;
  updatedAt?: Date;
};

function canonicalizeUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    u.hash = "";
    u.search = "";
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    let pathname = u.pathname;
    if (pathname.endsWith("/") && pathname !== "/") {
      pathname = pathname.slice(0, -1);
    }
    return `${u.protocol}//${host}${pathname}`;
  } catch {
    return url.trim();
  }
}

function parseCorrectData(fileContent: string): ParsedEntry[] {
  const lines = fileContent.split(/\r?\n/);
  const entries: ParsedEntry[] = [];
  let currentSection = "Unknown";
  let pending: Omit<ParsedEntry, "link"> | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const sectionMatch = line.match(/^──\s+(.+?)\s+──$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      continue;
    }

    const entryMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (entryMatch) {
      pending = {
        index: Number(entryMatch[1]),
        title: entryMatch[2].trim(),
        sourceSection: currentSection,
      };
      continue;
    }

    if (pending) {
      const statusMatch = line.match(/^Κατάσταση\s*:\s*(.+)$/i);
      if (statusMatch) {
        pending.expectedStatus = statusMatch[1].trim();
      }

      const linkMatch = line.match(/^Link\s*:\s*(https?:\/\/\S+)$/i);
      if (linkMatch) {
        entries.push({
          ...pending,
          link: linkMatch[1].trim(),
        });
        pending = null;
      }
    }
  }

  return entries;
}

export default async function main() {
  const maybeArg = process.argv[3] || process.argv[2];
  const explicitPath =
    maybeArg && maybeArg !== "audit:correct-data" && maybeArg.endsWith(".txt")
      ? maybeArg
      : undefined;
  const correctDataPath = explicitPath
    ? path.resolve(process.cwd(), explicitPath)
    : path.resolve(process.cwd(), "../CorrectData.txt");

  if (!fs.existsSync(correctDataPath)) {
    throw new Error(`CorrectData file not found: ${correctDataPath}`);
  }

  const content = fs.readFileSync(correctDataPath, "utf-8");
  const parsed = parseCorrectData(content);

  if (parsed.length === 0) {
    throw new Error("No entries parsed from CorrectData.txt");
  }

  await connectMongo();
  const dbRows = (await Opportunity.find({ deletedAt: null })
    .select("title officialUrl source status applicationStatus updatedAt")
    .lean()) as unknown as OpportunityRow[];

  const byCanonicalUrl = new Map<string, OpportunityRow[]>();
  for (const row of dbRows) {
    const key = canonicalizeUrl(row.officialUrl || "");
    if (!byCanonicalUrl.has(key)) byCanonicalUrl.set(key, []);
    byCanonicalUrl.get(key)!.push(row);
  }

  const results = parsed.map((entry) => {
    const key = canonicalizeUrl(entry.link);
    const matches = byCanonicalUrl.get(key) || [];
    const published = matches.filter((m) => m.status === "published");
    const archived = matches.filter((m) => m.status === "archived");

    let verdict: "published" | "archived_only" | "missing" = "missing";
    if (published.length > 0) verdict = "published";
    else if (archived.length > 0) verdict = "archived_only";

    return {
      ...entry,
      canonicalUrl: key,
      verdict,
      matches: matches.map((m) => ({
        title: m.title,
        source: m.source,
        status: m.status,
        applicationStatus: m.applicationStatus || "unknown",
        updatedAt: m.updatedAt || null,
      })),
    };
  });

  const summary = {
    totalExpected: results.length,
    published: results.filter((r) => r.verdict === "published").length,
    archivedOnly: results.filter((r) => r.verdict === "archived_only").length,
    missing: results.filter((r) => r.verdict === "missing").length,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    correctDataPath,
    summary,
    missingItems: results.filter((r) => r.verdict === "missing"),
    archivedOnlyItems: results.filter((r) => r.verdict === "archived_only"),
    allItems: results,
  };

  const outputPath = path.resolve(
    process.cwd(),
    "correct-data-audit-report.json",
  );
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  console.log("=".repeat(72));
  console.log("CorrectData vs Production Audit");
  console.log("=".repeat(72));
  console.log(`Expected entries: ${summary.totalExpected}`);
  console.log(`Published match : ${summary.published}`);
  console.log(`Archived only   : ${summary.archivedOnly}`);
  console.log(`Missing         : ${summary.missing}`);
  console.log(`\nReport saved to: ${outputPath}`);

  if (summary.missing > 0) {
    console.log("\nTop missing items:");
    for (const item of report.missingItems.slice(0, 15)) {
      console.log(`- [${item.index}] ${item.title}`);
      console.log(`  ${item.link}`);
    }
  }

  await disconnectMongo();
}

if (require.main === module) {
  main().catch(async (error) => {
    console.error("Audit failed:", error);
    try {
      await disconnectMongo();
    } catch {
      // ignore
    }
    process.exit(1);
  });
}

