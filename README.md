# BenefitPulse

MVP web platform για Ελλάδα που συγκεντρώνει επίσημες ανακοινώσεις (επιδόματα/vouchers/προγράμματα/προκηρύξεις) και δείχνει σε κάθε χρήστη τι "πιθανόν να τον αφορά" βάσει ενός απλού προφίλ.

## Αρχιτεκτονική

- **Backend**: Node.js + TypeScript (Express)
- **Database**: MongoDB (Mongoose)
- **Queue**: Redis + BullMQ
- **Frontend**: Vue 3 + Pinia + Vue Router
- **Search**: MongoDB text indexes

## Δομή Project

```
benefitpulse/
├── backend/              # Node.js API + workers
│   ├── src/
│   │   ├── main.ts       # Express server
│   │   ├── config/       # Configuration
│   │   ├── db/           # MongoDB connection
│   │   ├── models/       # Mongoose models
│   │   ├── modules/      # Feature modules (auth, profile, opportunities, etc.)
│   │   ├── jobs/         # BullMQ job definitions
│   │   ├── workers/      # BullMQ workers
│   │   ├── rules/        # Rules engine
│   │   └── utils/        # Utilities
├── frontend/             # Vue 3 app
│   ├── src/
│   │   ├── views/        # Vue views
│   │   ├── components/   # Vue components
│   │   ├── stores/       # Pinia stores
│   │   ├── router/       # Vue Router
│   │   └── api/          # API client
└── shared/               # Shared types/schemas
    └── src/
```

## Προαπαιτούμενα

- Node.js 18+
- MongoDB 6+
- Redis 6+

## Εγκατάσταση

### 1. Clone & Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

# Shared (optional, for type checking)
cd ../shared
npm install
```

### 2. Environment Variables

Δημιουργήστε `.env` στο `backend/` βασισμένο στο `.env.example`:

```bash
cp .env.example .env
```

Επεξεργαστείτε το `.env` και ορίστε:

- `MONGODB_URI`: MongoDB connection string
- `REDIS_HOST`, `REDIS_PORT`: Redis configuration
- `JWT_SECRET`: Secret για JWT tokens
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`: Admin credentials

### 3. Database Setup

Βεβαιωθείτε ότι το MongoDB τρέχει:

```bash
# Start MongoDB (depends on your setup)
mongod
```

### 4. Redis Setup

Βεβαιωθείτε ότι το Redis τρέχει:

```bash
# Start Redis (depends on your setup)
redis-server
```

### 5. Seed Database

Δημιουργήστε admin user και default sources:

```bash
cd backend
npm run seed
```

## Εκκίνηση

### Development Mode

**Terminal 1 - Backend API:**

```bash
cd backend
npm run dev
```

**Terminal 2 - Workers (ingestion + matching + aggregation):**

```bash
cd backend
npm run worker
```

**Terminal 3 - Frontend:**

```bash
cd frontend
npm run dev
```

Το backend θα τρέχει στο `http://localhost:3001` και το frontend στο `http://localhost:5174`.

### Production Build

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
# Serve dist/ folder with your web server
```

## Χρήση

### Admin Panel

1. Συνδεθείτε με τα admin credentials που ορίσατε στο `.env`
2. Πηγαίνετε στο `/admin` για dashboard
3. Χρησιμοποιήστε το `/admin/opportunities` για CMS
4. Το `/admin/drafts` δείχνει draft opportunities από ingestion

### CLI Commands

Για setup και migrations μόνο:

```bash
cd backend
npm run cli <command>
```

**Διαθέσιμα Commands:**

- `seed` - Seed database με admin user και default sources (μόνο για αρχική εγκατάσταση)
- `migrate:profiles` - Migration user profiles σε νέο schema (one-time migration)

**Παραδείγματα:**

```bash
npm run cli seed              # Seed database (μόνο πρώτη φορά)
npm run cli migrate:profiles   # One-time migration
npm run cli help              # Show help
```

### Admin API Actions

Οι περισσότερες λειτουργίες είναι διαθέσιμες μέσω Admin API (χρήση από Admin Panel ή API):

- `POST /api/admin/actions/ingest` - Trigger ingestion manually
- `POST /api/admin/actions/archive-expired` - Archive expired opportunities manually
- `POST /api/admin/actions/reset-bad-data` - Reset bad data (mark garbage opportunities)

**Παράδειγμα με curl:**

```bash
# Trigger ingestion (απαιτείται admin authentication)
curl -X POST http://localhost:3001/api/admin/actions/ingest \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Automated Jobs

Το σύστημα τρέχει αυτόματα:

- **Ingestion**: Κάθε 30 λεπτά - Ελέγχει και φέρνει νέα δεδομένα από όλες τις enabled sources
- **Archive Expired**: Κάθε 2 ώρες - Αρχειοθετεί αυτόματα expired opportunities (deadline passed, keywords detected, ή Cleaner validation)

Για manual trigger, χρησιμοποιήστε τα Admin API endpoints παραπάνω.

## AI Extractor (Stub)

Το `backend/src/modules/ingestion/extractor.ts` είναι ένα stub που επιστρέφει mock data.

**Για να το αντικαταστήσετε με πραγματικό LLM:**

1. Ορίστε `AI_EXTRACTOR_URL` και `AI_EXTRACTOR_API_KEY` στο `.env`
2. Το LLM API πρέπει να δέχεται POST request με:
   ```json
   {
     "text": "content to extract from"
   }
   ```
3. Να επιστρέφει JSON matching το `ExtractedOpportunity` interface:
   ```typescript
   {
     type: OpportunityType;
     title: string;
     summary: string;
     deadlineAt?: Date;
     tags: string[];
     region?: Region;
     criteriaJson: Record<string, any>;
     criteriaRulesJson: CriteriaRules;
     confidence: number;
   }
   ```

## API Endpoints

### Public

- `GET /api/opportunities` - List opportunities
- `GET /api/opportunities/:id` - Get opportunity detail
- `GET /api/opportunities/trending` - Get trending

### Auth

- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### User

- `GET /api/profile` - Get profile
- `PUT /api/profile` - Update profile
- `GET /api/me/opportunities/matched` - Matched opportunities
- `GET /api/me/opportunities/today` - Today's opportunities
- `GET /api/me/opportunities/new-since-last-visit` - New since last visit
- `GET /api/me/opportunities/expiring-soon` - Expiring soon
- `GET /api/me/bookmarks` - Get bookmarks
- `POST /api/me/bookmarks/:opportunityId` - Add bookmark
- `DELETE /api/me/bookmarks/:opportunityId` - Remove bookmark

### Admin

- `GET /api/admin/opportunities` - List all opportunities
- `POST /api/admin/opportunities` - Create opportunity
- `PUT /api/admin/opportunities/:id` - Update opportunity
- `POST /api/admin/opportunities/:id/publish` - Publish
- `POST /api/admin/opportunities/:id/unpublish` - Unpublish
- `DELETE /api/admin/opportunities/:id` - Soft delete
- `GET /api/admin/metrics/overview` - Overview metrics
- `GET /api/admin/draft-queue` - Draft queue
- `GET /api/admin/audit` - Audit log

### Events

- `POST /api/events` - Track event (pageview, opportunity_view, etc.)

## Rules Engine

Το rules engine (`backend/src/rules/evaluate.ts`) είναι deterministic και βασίζεται σε:

- Age range matching
- Income range matching
- Status flags matching
- Region matching
- Education level matching

Μια ευκαιρία θεωρείται "matched" αν τουλάχιστον 50% των conditions πληρούνται.

## GDPR & Privacy

- Data minimization: ranges, όχι exact values
- No special-category data στο MVP
- First-party analytics only
- Session-based tracking
- DSAR endpoints (to be implemented)

## Testing

```bash
# Rules engine tests
cd backend
npm test  # (requires test setup)
```

## Notes

- Το MVP είναι "pull-first": no push notifications, email, SMS
- In-app badges/alerts only
- Focus σε sessions/pageviews/time-on-site
- Traffic-first / ads model

## License

MIT
