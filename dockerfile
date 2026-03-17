# Χρησιμοποιούμε Node.js 20 Alpine
FROM node:20-alpine

WORKDIR /app

# 1. Caching: Αντιγράφουμε ΜΟΝΟ το package.json πρώτα
COPY backend/package*.json ./backend/

WORKDIR /app/backend
RUN npm install

# 2. Αντιγράφουμε τον κώδικα (To shared είναι ήδη μέσα στο backend/src)
COPY backend/ .

# 3. Build
# Coolify can kill long-running steps with no output; keep a small heartbeat while tsc runs
RUN (while true; do echo "[build] tsc running..."; sleep 15; done) & \
  HEARTBEAT_PID=$! && \
  npm run build && \
  kill $HEARTBEAT_PID

# 4. Εκκίνηση
EXPOSE 3001
# ΠΡΟΣΟΧΗ: Το σωστό path είναι dist/main.js
CMD ["node", "dist/main.js"]