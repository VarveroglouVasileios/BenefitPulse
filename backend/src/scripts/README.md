# Scripts Directory

Αυτός ο φάκελος περιέχει utility scripts για maintenance, migrations, και diagnostics.

## 📁 Structure

```
scripts/
├── SCRIPTS.md              # Full documentation (read this!)
├── README.md               # This file
│
├── setup/
│   └── seed.ts            # Initial database setup
│
├── migrations/
│   ├── migrate-user-profiles.ts
│   ├── fix-broken-sources.ts
│   └── recompute-status.ts
│
├── workers/
│   ├── run-workers.ts
│   ├── run-archive-now.ts
│   └── run-ingestion-once.ts (deprecated)
│
├── maintenance/
│   ├── cleanup-opportunities.ts
│   ├── archive-expired.ts (deprecated)
│   └── reset-bad-data.ts (deprecated)
│
└── diagnostics/
    ├── check-sources.ts
    └── check-drafts.ts
```

## 🚀 Quick Start

```bash
# See all available commands
npm run cli help

# Most common
npm run cli seed                    # Setup (first time)
npm run cli check:sources          # Check status
npm run cli cleanup                # Cleanup duplicates
```

## 📖 Full Documentation

Δείτε [SCRIPTS.md](./SCRIPTS.md) για πλήρη documentation.

