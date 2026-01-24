# Χρησιμοποιούμε Node.js 20
FROM node:20-alpine

# Ρυθμίζουμε τον φάκελο εργασίας
WORKDIR /app

# 1. Αντιγράφουμε το backend
COPY backend ./backend

# 2. Shared module: Αντιγράφουμε στο root για να είναι sibling του backend
COPY shared ./shared

# 2b. Install shared dependencies
WORKDIR /app/shared
RUN npm install

# 3. Μπαίνουμε στο backend και χτίζουμε
WORKDIR /app/backend
RUN npm install
RUN npm run build

# 4. Εκκίνηση
EXPOSE 3001
CMD ["node", "dist/backend/src/main.js"]