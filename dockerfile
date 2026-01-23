# Χρησιμοποιούμε Node.js 20
FROM node:20-alpine

# Ρυθμίζουμε τον φάκελο εργασίας
WORKDIR /app

# Αντιγράφουμε τα αρχεία του project (shared & backend)
COPY shared ./shared
COPY backend ./backend

# Μπαίνουμε στο backend για εγκατάσταση και build
WORKDIR /app/backend
RUN npm install
RUN npm run build

# Ανοίγουμε την πόρτα 3001
EXPOSE 3001

# Εντολή εκκίνησης (για το Backend)
CMD ["node", "dist/src/main.js"]