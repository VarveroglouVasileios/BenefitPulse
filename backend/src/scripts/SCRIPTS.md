# Scripts Documentation

## 📋 Overview

Αυτή η σελίδα περιγράφει όλα τα διαθέσιμα scripts και πώς να τα χρησιμοποιήσεις.

## 🗂️ Κατηγορίες Scripts

### 1. **Setup & Initialization**
- **`seed.ts`** - Αρχική εγκατάσταση DB (admin user + sources)
  - Usage: `npm run cli seed`
  - Τρέχει μόνο μία φορά κατά το setup

### 2. **Migrations (One-time)**
- **`migrate-user-profiles.ts`** - Migration προφίλ χρηστών σε νέο schema
  - Usage: `npm run cli migrate:profiles`
  - ⚠️ One-time migration

- **`fix-broken-sources.ts`** - Διόρθωση broken/404 source URLs
  - Usage: `npm run cli migrate:fix-sources`
  - ⚠️ One-time migration

- **`recompute-status.ts`** - Recompute status για όλα τα opportunities
  - Usage: `npm run cli migrate:recompute-status [--dry-run]`
  - Μπορεί να τρέξει πολλές φορές αν χρειάζεται

### 3. **Workers (Background Jobs)**
- **`run-workers.ts`** - Manual execution των workers
  - Usage: `npm run cli workers:ingest | workers:archive | workers:all`
  - ⚠️ Προτιμήστε να χρησιμοποιήσετε το worker process: `npm run worker`

- **`run-ingestion-once.ts`** - One-time ingestion (deprecated)
  - ⚠️ Use `workers:ingest` ή Admin API αντί για αυτό

- **`run-archive-now.ts`** - Manual archive execution
  - Usage: `npm run cli archive:now`
  - ⚠️ Προτιμήστε Admin API: `POST /api/admin/actions/archive-expired`

### 4. **Maintenance & Cleanup**
- **`cleanup-opportunities.ts`** - Cleanup duplicates, broken URLs, invalid data
  - Usage: `npm run cli cleanup`
  - Καθαρίζει duplicates, canonicalizes URLs, recomputes status

- **`reset-bad-data.ts`** - Reset garbage data (deprecated)
  - ⚠️ Use `cleanup` script αντί για αυτό

- **`archive-expired.ts`** - Archive expired opportunities (deprecated)
  - ⚠️ Use `run-archive-now.ts` ή Admin API αντί για αυτό

### 5. **Diagnostics & Checks**
- **`check-sources.ts`** - Check sources status και raw items
  - Usage: `npm run cli check:sources`
  - Εμφανίζει statistics για sources, raw items, opportunities

- **`check-drafts.ts`** - Check draft opportunities και γιατί δεν είναι published
  - Usage: `npm run cli check:drafts`
  - Εμφανίζει top 10 drafts με metadata

## 🚀 Quick Reference

### Most Common Commands

```bash
# Setup (first time only)
npm run cli seed

# Check system status
npm run cli check:sources
npm run cli check:drafts

# Run workers manually (if needed)
npm run cli workers:ingest
npm run cli workers:archive

# Cleanup duplicates/broken data
npm run cli cleanup

# Migrations (one-time)
npm run cli migrate:fix-sources
npm run cli migrate:recompute-status --dry-run
```

### Admin API (Preferred)

Αντί για scripts, μπορείτε να χρησιμοποιήσετε το Admin API:

```bash
# Ingestion
curl -X POST http://localhost:3000/api/admin/actions/ingest

# Archive expired
curl -X POST http://localhost:3000/api/admin/actions/archive-expired

# Reset bad data
curl -X POST http://localhost:3000/api/admin/actions/reset-bad-data
```

## 📊 Script Status

| Script | Status | Notes |
|--------|--------|-------|
| `seed.ts` | ✅ Active | Setup only |
| `migrate-user-profiles.ts` | ✅ Active | One-time migration |
| `fix-broken-sources.ts` | ✅ Active | One-time migration |
| `recompute-status.ts` | ✅ Active | Can run multiple times |
| `run-workers.ts` | ✅ Active | Manual worker execution |
| `run-archive-now.ts` | ✅ Active | Manual archive |
| `cleanup-opportunities.ts` | ✅ Active | Maintenance |
| `check-sources.ts` | ✅ Active | Diagnostics |
| `check-drafts.ts` | ✅ Active | Diagnostics |
| `run-ingestion-once.ts` | ⚠️ Deprecated | Use `workers:ingest` |
| `archive-expired.ts` | ⚠️ Deprecated | Use `run-archive-now.ts` |
| `reset-bad-data.ts` | ⚠️ Deprecated | Use `cleanup` |

## 🔄 Recommended Workflow

### Daily Operations
1. **Automatic**: Workers run via `npm run worker` (scheduled)
2. **Manual checks**: `npm run cli check:sources` για monitoring

### Weekly Maintenance
1. `npm run cli cleanup` - Cleanup duplicates/broken data
2. `npm run cli check:drafts` - Review drafts

### One-time Migrations
1. `npm run cli migrate:fix-sources` - Fix broken URLs
2. `npm run cli migrate:recompute-status --dry-run` - Test status recompute
3. `npm run cli migrate:recompute-status` - Apply status recompute

## 🗑️ Scripts to Consider Removing

Τα παρακάτω scripts είναι deprecated και μπορούν να αφαιρεθούν:

1. **`archive-expired.ts`** - Αντικαταστάθηκε από `run-archive-now.ts` και Admin API
2. **`reset-bad-data.ts`** - Αντικαταστάθηκε από `cleanup-opportunities.ts`
3. **`run-ingestion-once.ts`** - Αντικαταστάθηκε από `workers:ingest`

## 📝 Notes

- Όλα τα scripts χρειάζονται MongoDB connection (auto-handled)
- Scripts με `--dry-run` flag: test mode, δεν κάνουν changes
- Προτιμήστε Admin API για production operations
- Workers τρέχουν αυτόματα αν χρησιμοποιείτε `npm run worker`

