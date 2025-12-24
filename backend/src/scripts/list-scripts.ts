/**
 * List all available scripts with their status and purpose
 * Usage: npm run cli list-scripts
 */

interface ScriptInfo {
  name: string;
  file: string;
  category: "setup" | "migration" | "worker" | "maintenance" | "diagnostics" | "deprecated";
  status: "active" | "deprecated";
  description: string;
  usage: string;
  notes?: string;
}

const scripts: ScriptInfo[] = [
  {
    name: "seed",
    file: "seed.ts",
    category: "setup",
    status: "active",
    description: "Initial database setup (admin user + sources)",
    usage: "npm run cli seed",
  },
  {
    name: "migrate:profiles",
    file: "migrate-user-profiles.ts",
    category: "migration",
    status: "active",
    description: "Migrate user profiles to new schema",
    usage: "npm run cli migrate:profiles",
    notes: "One-time migration",
  },
  {
    name: "migrate:fix-sources",
    file: "fix-broken-sources.ts",
    category: "migration",
    status: "active",
    description: "Fix broken/404 source URLs",
    usage: "npm run cli migrate:fix-sources",
    notes: "One-time migration",
  },
  {
    name: "migrate:recompute-status",
    file: "recompute-status.ts",
    category: "migration",
    status: "active",
    description: "Recompute status for all opportunities",
    usage: "npm run cli migrate:recompute-status [--dry-run]",
  },
  {
    name: "workers:ingest",
    file: "run-workers.ts",
    category: "worker",
    status: "active",
    description: "Run ingestion worker manually",
    usage: "npm run cli workers:ingest",
    notes: "Prefer: npm run worker (background process)",
  },
  {
    name: "workers:archive",
    file: "run-workers.ts",
    category: "worker",
    status: "active",
    description: "Run archive worker manually",
    usage: "npm run cli workers:archive",
    notes: "Prefer: npm run worker (background process)",
  },
  {
    name: "workers:all",
    file: "run-workers.ts",
    category: "worker",
    status: "active",
    description: "Run all workers manually",
    usage: "npm run cli workers:all",
    notes: "Prefer: npm run worker (background process)",
  },
  {
    name: "archive:now",
    file: "run-archive-now.ts",
    category: "worker",
    status: "active",
    description: "Archive expired opportunities",
    usage: "npm run cli archive:now",
    notes: "Prefer: POST /api/admin/actions/archive-expired",
  },
  {
    name: "cleanup",
    file: "cleanup-opportunities.ts",
    category: "maintenance",
    status: "active",
    description: "Cleanup duplicates, broken URLs, invalid data",
    usage: "npm run cli cleanup",
  },
  {
    name: "check:sources",
    file: "check-sources.ts",
    category: "diagnostics",
    status: "active",
    description: "Check sources and data status",
    usage: "npm run cli check:sources",
  },
  {
    name: "check:drafts",
    file: "check-drafts.ts",
    category: "diagnostics",
    status: "active",
    description: "Check draft opportunities",
    usage: "npm run cli check:drafts",
  },
  {
    name: "run-ingestion-once",
    file: "run-ingestion-once.ts",
    category: "deprecated",
    status: "deprecated",
    description: "One-time ingestion (deprecated)",
    usage: "Use: npm run cli workers:ingest",
    notes: "Use workers:ingest instead",
  },
  {
    name: "archive-expired",
    file: "archive-expired.ts",
    category: "deprecated",
    status: "deprecated",
    description: "Archive expired (deprecated)",
    usage: "Use: npm run cli archive:now",
    notes: "Use archive:now instead",
  },
  {
    name: "reset-bad-data",
    file: "reset-bad-data.ts",
    category: "deprecated",
    status: "deprecated",
    description: "Reset bad data (deprecated)",
    usage: "Use: npm run cli cleanup",
    notes: "Use cleanup instead",
  },
];

function printScripts() {
  console.log("\n" + "=".repeat(80));
  console.log("📋 BenefitPulse Scripts Overview");
  console.log("=".repeat(80) + "\n");

  const categories = ["setup", "migration", "worker", "maintenance", "diagnostics", "deprecated"] as const;
  
  for (const category of categories) {
    const categoryScripts = scripts.filter(s => s.category === category);
    if (categoryScripts.length === 0) continue;

    const emoji = {
      setup: "🔧",
      migration: "🔄",
      worker: "⚙️",
      maintenance: "🧹",
      diagnostics: "📊",
      deprecated: "🗑️",
    }[category];

    console.log(`${emoji} ${category.toUpperCase()}`);
    console.log("-".repeat(80));

    for (const script of categoryScripts) {
      const statusIcon = script.status === "active" ? "✅" : "⚠️";
      console.log(`\n${statusIcon} ${script.name}`);
      console.log(`   File: ${script.file}`);
      console.log(`   Description: ${script.description}`);
      console.log(`   Usage: ${script.usage}`);
      if (script.notes) {
        console.log(`   Note: ${script.notes}`);
      }
    }
    console.log("");
  }

  console.log("=".repeat(80));
  console.log("\n📚 Full documentation: backend/src/scripts/SCRIPTS.md");
  console.log("💡 Quick help: npm run cli help\n");
}

export default printScripts;

