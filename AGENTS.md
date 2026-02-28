# AGENTS.md

## Cursor Cloud specific instructions

### Product overview
BenefitPulse is a Greek-language web platform aggregating government subsidies/programs. It has three packages: `shared/`, `backend/`, and `frontend/`.

### Required infrastructure
- **MongoDB** (port 27017): Primary datastore. Backend exits on connection failure.
- **Redis** (port 6379): BullMQ job queue broker. Required by both the API server and the worker process.

To start them locally:
```bash
sudo mongod --dbpath /data/db --fork --logpath /var/log/mongod.log
sudo redis-server --daemonize yes
```

### Services

| Service | Directory | Command | Port | Notes |
|---------|-----------|---------|------|-------|
| Backend API | `backend/` | `npm run dev` | 3001 | Express server with `ts-node-dev` hot reload |
| BullMQ Worker | `backend/` | `npm run worker` | — | Background job processor (ingestion, matching, archival) |
| Frontend | `frontend/` | `npm run dev` | 5174 | Vite dev server; proxies `/api` to backend :3001 |

### Backend `.env`
Copy `backend/.env.example` to `backend/.env` before first run. Default values work for local development. The seed script (`npm run seed` in `backend/`) creates an admin user (`admin@benefitpulse.gr` / `change-me-in-production`) and ~30 data sources.

### Running tests
Backend tests use Jest (with `ts-jest`). Run from `backend/`:
```bash
npx jest
```
Note: 1 pre-existing test failure in `evaluate.test.ts` (last test case expects `statusFlags` in `missingFields` but the engine reports `employmentStatus` instead). All other tests pass.

### Build check
- Backend: `npx tsc --noEmit` in `backend/`
- Frontend: `npx vue-tsc --noEmit` in `frontend/`

### Gotchas
- The `shared/` package must be built (`npm run build` in `shared/`) before the backend can compile, since backend imports from `@benefitpulse/shared` via the `dist/` output.
- The backend's `prebuild` script handles this automatically for `npm run build`, but for `npm run dev` you must ensure `shared/dist/` exists first.
- Jest is not listed in the original `backend/package.json` — it was added as a dev dependency during setup. If tests fail with "jest not found", run `npm install` in `backend/`.
- No lockfiles exist in the repo; each package uses `npm install` independently (no workspaces).
