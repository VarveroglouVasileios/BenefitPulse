# Χρησιμοποιούμε Node.js 20 Alpine
# Multi-stage: build με devDependencies (απαραίτητο όταν το Coolify περνά NODE_ENV=production στο build)
FROM node:20-alpine AS builder

WORKDIR /app

COPY backend/package*.json ./backend/

WORKDIR /app/backend
# --include=dev: το npm παραλείπει devDependencies όταν NODE_ENV=production (π.χ. Coolify build-time env)
RUN npm ci --include=dev

COPY backend/ .

# Coolify μπορεί να κόβει βήματα χωρίς output· heartbeat + λίγο περισσότερο heap για tsc σε μικρά VPS
RUN set -e; \
  (while true; do echo "[build] tsc $(date -u +%H:%M:%S)..."; sleep 15; done) & \
  hb=$!; trap 'kill $hb 2>/dev/null || true' EXIT; \
  NODE_OPTIONS="--max-old-space-size=3072" npm run build

RUN npm prune --omit=dev

# Runtime image: μόνο production deps + compiled dist
FROM node:20-alpine

WORKDIR /app/backend

ENV NODE_ENV=production

COPY --from=builder /app/backend/package*.json ./
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./dist

EXPOSE 3001
# ΠΡΟΣΟΧΗ: Το σωστό path είναι dist/main.js
CMD ["sh", "-c", "node dist/cli.js seed && node dist/cli.js create:indexes && node dist/main.js"]
