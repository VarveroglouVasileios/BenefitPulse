# AGENTS.md

Guidance for coding agents working in this repository.

## Project at a glance

- Monorepo with:
  - `backend/`: Node.js + TypeScript API/workers (Express-based runtime)
  - `frontend/`: Vue 3 + Vite + TypeScript app
- Main backend dependencies include MongoDB and Redis for full runtime behavior.

## Working rules

- Keep changes scoped to the user request; avoid unrelated refactors.
- Do not run destructive scripts (data cleanup/reset/migration/seed) unless the user explicitly asks.
- Prefer small, reviewable commits.
- If both backend and frontend are touched, validate each side independently.

## Install

Run installs in each package you touch:

- `cd backend && npm install`
- `cd frontend && npm install`

## Run (development)

- Backend API: `cd backend && npm run dev`
- Backend worker: `cd backend && npm run worker`
- Frontend: `cd frontend && npm run dev`

Expected local ports (from project docs):

- Backend: `http://localhost:3001`
- Frontend: `http://localhost:5174`

## Validation checklist

Use the smallest set of high-signal checks relevant to your diff.

### Backend changes

- Build/typecheck: `cd backend && npm run build`
- If you changed behavior that depends on worker flows, run worker too:
  - `cd backend && npm run worker`

### Frontend changes

- Build/typecheck: `cd frontend && npm run build`
- For UI changes, run frontend dev server and manually verify affected screens/flows.

### Full-stack changes

- Validate backend build and frontend build.
- Smoke-test the changed end-to-end flow manually.

## Scripts to use with care

Only run when the task requires them:

- `cd backend && npm run seed`
- `cd backend && npm run cli <command>`
- `cd backend && npm run cleanup`

## Cursor Cloud specific instructions

- Prefer targeted checks over running the entire test surface.
- For UI-impacting changes, capture at least one screenshot and one short demo recording that shows the updated flow working.
- Leave dev servers running after validation unless cleanup is explicitly requested.
