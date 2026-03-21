#!/usr/bin/env node
/**
 * Unified CLI for BenefitPulse Backend
 * 
 * Usage:
 *   npm run cli <command>
 * 
 * Commands:
 *   seed                    - Seed database with admin user and default sources (setup only)
 *   migrate:profiles        - Migrate user profiles to new schema (one-time migration)
 * 
 * Note: Most operations are now available via Admin API:
 *   - POST /api/admin/actions/ingest          - Trigger ingestion
 *   - POST /api/admin/actions/archive-expired - Archive expired opportunities
 *   - POST /api/admin/actions/reset-bad-data  - Reset bad data
 */

// Polyfill for Node 16 (needed for axios/undici dependencies)
if (!(global as any).Blob) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Blob: BufferBlob } = require("buffer");
  (global as any).Blob = BufferBlob;
}
if (!(global as any).File) {
  // Minimal File polyfill using Blob
  class PolyfillFile extends (global as any).Blob {
    name: string;
    lastModified: number;
    constructor(parts: any[], name: string, options: any = {}) {
      super(parts, options);
      this.name = name;
      this.lastModified = options.lastModified || Date.now();
    }
  }
  (global as any).File = PolyfillFile;
}
// Minimal DOMException polyfill
if (!(global as any).DOMException) {
  class PolyfillDOMException extends Error {
    name: string;
    constructor(message = "", name = "DOMException") {
      super(message);
      this.name = name;
    }
  }
  (global as any).DOMException = PolyfillDOMException;
}
// eslint-disable-next-line @typescript-eslint/no-var-requires
require("web-streams-polyfill/polyfill");

import { seed } from "./scripts/seed";

const command = process.argv[2];

async function runCommand() {
  try {
    switch (command) {
      case "seed": {
        console.log("🌱 Seeding database...");
        await seed();
        process.exit(0);
        break;
      }

      case "migrate:profiles": {
        console.log("🔄 Migrating user profiles...");
        console.log("⚠️  Note: This is a one-time migration script");
        const migrateModule = await import("./scripts/migrate-user-profiles");
        await migrateModule.default();
        process.exit(0);
        break;
      }

      case "migrate:fix-sources": {
        console.log("🔧 Fixing broken/404 sources...");
        const fixModule = await import("./scripts/fix-broken-sources");
        await fixModule.fixBrokenSources();
        process.exit(0);
        break;
      }

      case "create:indexes": {
        console.log("⚡ Creating database indexes...");
        const indexesModule = await import("./scripts/create-indexes");
        await indexesModule.createIndexes();
        process.exit(0);
        break;
      }

      case "migrate:recompute-status": {
        const dryRun = process.argv.includes("--dry-run");
        console.log("🔄 Recomputing status for all opportunities...");
        const recomputeModule = await import("./scripts/recompute-status");
        await recomputeModule.recomputeStatus(dryRun);
        process.exit(0);
        break;
      }

      case "archive:now": {
        console.log("🔍 Running archive expired opportunities...");
        const archiveModule = await import("./scripts/run-archive-now");
        await archiveModule.default();
        process.exit(0);
        break;
      }

      case "check:sources": {
        console.log("📊 Checking sources and data status...");
        const checkModule = await import("./scripts/check-sources");
        await checkModule.default();
        process.exit(0);
        break;
      }

      case "check:drafts": {
        console.log("📋 Checking draft opportunities...");
        const draftsModule = await import("./scripts/check-drafts");
        await draftsModule.default();
        process.exit(0);
        break;
      }

      case "workers:ingest": {
        console.log("🔄 Running ingestion worker manually...");
        const workersModule = await import("./scripts/run-workers");
        await workersModule.runWorkers("ingest");
        process.exit(0);
        break;
      }

      case "workers:archive": {
        console.log("🔍 Running archive worker manually...");
        const workersModule = await import("./scripts/run-workers");
        await workersModule.runWorkers("archive");
        process.exit(0);
        break;
      }

      case "workers:all": {
        console.log("🚀 Running all workers manually...");
        const workersModule = await import("./scripts/run-workers");
        await workersModule.runWorkers("all");
        process.exit(0);
        break;
      }

      case "cleanup": {
        console.log("🧹 Running opportunity cleanup...");
        const cleanupModule = await import("./scripts/cleanup-opportunities");
        await cleanupModule.cleanupOpportunities();
        process.exit(0);
        break;
      }

      case "ingest":
      case "archive":
      case "reset:bad-data": {
        console.error(`❌ Command '${command}' has been moved to Admin API.`);
        console.error(`   Use: POST /api/admin/actions/${command === "ingest" ? "ingest" : command === "archive" ? "archive-expired" : "reset-bad-data"}`);
        console.error(`   Or use the Admin Panel in the frontend.`);
        console.error(`   Or use: npm run cli workers:${command === "ingest" ? "ingest" : "archive"}`);
        process.exit(1);
        break;
      }

      case "help":
      case "--help":
      case "-h":
      case undefined:
        console.log(`
BenefitPulse CLI - Unified command runner

Usage:
  npm run cli <command> [options]

📋 COMMANDS BY CATEGORY:

🔧 Setup & Initialization:
  seed                    Seed database with admin user and default sources (setup only)

🔄 Migrations (One-time):
  migrate:profiles        Migrate user profiles to new schema
  migrate:fix-sources     Fix broken/404 sources URLs in database
  migrate:recompute-status  Recompute status for all opportunities (use --dry-run to test)

⚙️  Workers (Manual Execution):
  workers:ingest         Run ingestion worker manually (process all sources)
  workers:archive       Run archive expired opportunities worker manually
  workers:all           Run both ingestion and archive workers manually
  archive:now           Archive expired opportunities (direct execution)

🧹 Maintenance:
  cleanup                Cleanup duplicates, broken URLs, invalid data

📊 Diagnostics:
  check:sources         Check sources and data status
  check:drafts          Check draft opportunities and why they're not published

📖 Documentation:
  help                  Show this help message
  docs                  Open scripts documentation

💡 Admin API Endpoints (Preferred for production):
  POST /api/admin/actions/ingest          - Trigger ingestion
  POST /api/admin/actions/archive-expired - Archive expired opportunities
  POST /api/admin/actions/reset-bad-data  - Reset bad data

📝 Examples:
  npm run cli seed
  npm run cli check:sources
  npm run cli cleanup
  npm run cli migrate:recompute-status --dry-run
  npm run cli workers:ingest

📚 For detailed documentation, see: backend/src/scripts/SCRIPTS.md
        `);
        process.exit(0);
        break;

      case "docs":
        console.log(`
📚 Scripts Documentation

Full documentation available at:
  backend/src/scripts/SCRIPTS.md

Quick reference:
  - Setup: seed
  - Migrations: migrate:*
  - Workers: workers:*
  - Maintenance: cleanup
  - Diagnostics: check:*

For help with a specific command:
  npm run cli help
        `);
        process.exit(0);
        break;

      case "list-scripts": {
        console.log("📋 Listing all scripts...");
        const listModule = await import("./scripts/list-scripts");
        await listModule.default();
        process.exit(0);
        break;
      }

      default:
        console.error(`❌ Unknown command: ${command}`);
        console.error(`Run 'npm run cli help' for usage information`);
        process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error running command:", error);
    process.exit(1);
  }
}

runCommand();

