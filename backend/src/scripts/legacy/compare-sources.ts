/**
 * Compare `sources` collection between two MongoDB databases (e.g. dev vs production).
 *
 * Usage:
 *   MONGODB_URI_DEV="mongodb+srv://..." MONGODB_URI_PROD="mongodb+srv://..." npx ts-node src/scripts/compare-sources.ts
 *
 * Or pass URIs as arguments (overrides env):
 *   npx ts-node src/scripts/compare-sources.ts "DEV_URI" "PROD_URI"
 *
 * Compares by normalized URL (lowercase, trimmed). Reports:
 *   - sources only in dev / only in prod
 *   - same URL but different name, type, enabled, or url string
 *
 * Runtime health fields (lastFetchedAt, lastError, etc.) are ignored in diffs unless --verbose
 */

import mongoose from "mongoose";

const CORE_FIELDS = ["name", "url", "type", "enabled", "config"] as const;

function normalizeUrl(u: string): string {
  return (u || "").trim().toLowerCase();
}

function pickCore(doc: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of CORE_FIELDS) {
    if (k === "config") {
      out[k] = JSON.stringify(doc[k] ?? {});
    } else {
      out[k] = doc[k];
    }
  }
  return out;
}

function coreEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function loadSources(uri: string, label: string): Promise<Map<string, Record<string, unknown>>> {
  await mongoose.connect(uri);
  const col = mongoose.connection.collection("sources");
  const rows = await col.find({}).toArray();
  await mongoose.disconnect();

  const byUrl = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    const url = normalizeUrl(String(row.url ?? ""));
    if (!url) {
      console.warn(`⚠️  [${label}] Skipping document without url: _id=${row._id}`);
      continue;
    }
    if (byUrl.has(url)) {
      console.warn(`⚠️  [${label}] Duplicate normalized URL (using first): ${url}`);
      continue;
    }
    byUrl.set(url, row as Record<string, unknown>);
  }
  console.log(`📥 [${label}] Loaded ${byUrl.size} sources (unique by URL)\n`);
  return byUrl;
}

async function main() {
  const devUri =
    process.argv[2] || process.env.MONGODB_URI_DEV || process.env.MONGODB_DEV_URI;
  const prodUri =
    process.argv[3] || process.env.MONGODB_URI_PROD || process.env.MONGODB_PROD_URI;

  const verbose = process.argv.includes("--verbose");

  if (!devUri || !prodUri) {
    console.error(`
Missing database URIs.

Set env:
  MONGODB_URI_DEV=...  MONGODB_URI_PROD=...  npx ts-node src/scripts/compare-sources.ts

Or pass as args:
  npx ts-node src/scripts/compare-sources.ts "<dev_uri>" "<prod_uri>"
`);
    process.exit(1);
  }

  if (devUri === prodUri) {
    console.error("❌ DEV and PROD URIs are identical — refusing to compare.");
    process.exit(1);
  }

  console.log("🔍 Comparing collection: sources\n");

  const devMap = await loadSources(devUri, "DEV");
  const prodMap = await loadSources(prodUri, "PROD");

  const onlyDev: string[] = [];
  const onlyProd: string[] = [];
  const different: Array<{ url: string; dev: Record<string, unknown>; prod: Record<string, unknown> }> =
    [];

  for (const url of devMap.keys()) {
    if (!prodMap.has(url)) onlyDev.push(url);
  }
  for (const url of prodMap.keys()) {
    if (!devMap.has(url)) onlyProd.push(url);
  }

  for (const url of devMap.keys()) {
    if (!prodMap.has(url)) continue;
    const d = devMap.get(url)!;
    const p = prodMap.get(url)!;
    if (!coreEqual(pickCore(d), pickCore(p))) {
      different.push({ url, dev: d, prod: p });
    }
  }

  console.log("══════════════════════════════════════════════════════════════");
  console.log(" SUMMARY");
  console.log("══════════════════════════════════════════════════════════════");
  console.log(`  Only in DEV:  ${onlyDev.length}`);
  console.log(`  Only in PROD: ${onlyProd.length}`);
  console.log(`  Same URL, different core fields: ${different.length}`);
  console.log("══════════════════════════════════════════════════════════════\n");

  if (onlyDev.length) {
    console.log("📗 ONLY IN DEV (missing in production) — by URL:\n");
    for (const url of onlyDev.sort()) {
      const s = devMap.get(url)!;
      console.log(`  • ${s.name}`);
      console.log(`    ${s.url}  [enabled=${s.enabled}, type=${s.type}]\n`);
    }
  }

  if (onlyProd.length) {
    console.log("📕 ONLY IN PROD (missing in dev) — by URL:\n");
    for (const url of onlyProd.sort()) {
      const s = prodMap.get(url)!;
      console.log(`  • ${s.name}`);
      console.log(`    ${s.url}  [enabled=${s.enabled}, type=${s.type}]\n`);
    }
  }

  if (different.length) {
    console.log("📙 SAME URL (normalized) BUT DIFFERENT core fields (name/type/enabled/url/config):\n");
    for (const { url, dev, prod } of different) {
      console.log(`  URL key: ${url}`);
      for (const k of CORE_FIELDS) {
        const dv = k === "config" ? JSON.stringify(dev[k] ?? {}) : dev[k];
        const pv = k === "config" ? JSON.stringify(prod[k] ?? {}) : prod[k];
        if (JSON.stringify(dv) !== JSON.stringify(pv)) {
          console.log(`    ${k}:`);
          console.log(`      DEV:  ${String(dv).slice(0, 200)}${String(dv).length > 200 ? "…" : ""}`);
          console.log(`      PROD: ${String(pv).slice(0, 200)}${String(pv).length > 200 ? "…" : ""}`);
        }
      }
      if (verbose) {
        console.log("    (verbose) health-ish fields DEV:", {
          lastFetchedAt: dev.lastFetchedAt,
          lastError: dev.lastError,
          consecutiveFailures: dev.consecutiveFailures,
        });
        console.log("    (verbose) health-ish fields PROD:", {
          lastFetchedAt: prod.lastFetchedAt,
          lastError: prod.lastError,
          consecutiveFailures: prod.consecutiveFailures,
        });
      }
      console.log("");
    }
  }

  if (!onlyDev.length && !onlyProd.length && !different.length) {
    console.log("✅ Core fields match for every source present in both DBs (by normalized URL).\n");
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
