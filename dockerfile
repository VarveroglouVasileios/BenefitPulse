# Χρησιμοποιούμε Node.js 20
FROM node:20-alpine

# Ρυθμίζουμε τον φάκελο εργασίας
WORKDIR /app

# 1. Αντιγράφουμε το backend
COPY backend ./backend

# 2. Το Κόλπο: Αντιγράφουμε το shared ΜΕΣΑ στο backend
# Έτσι τα imports "../shared" και "../../shared" θα το βρίσκουν εκεί που περιμένουν!
COPY shared ./backend/shared

# 3. Μπαίνουμε στο backend και χτίζουμε
WORKDIR /app/backend
RUN npm install
RUN npm run build

# 4. Εκκίνηση
EXPOSE 3001
CMD ["node", "dist/src/main.js"]