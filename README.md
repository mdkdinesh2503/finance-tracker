## Finance Tracker

Personal finance tracker built with **Next.js App Router** and **PostgreSQL** (no ORM).

## Local setup

### Prerequisites

- **Node.js** (>= 20)
- **Bun** (recommended for scripts)
- **PostgreSQL** (local or hosted)

### Environment variables

Create `.env.local` (or `.env`) and set:

- **`DATABASE_URL`**: Postgres connection string
- **`JWT_SECRET`**: long random secret for signing sessions

### Install + run

```bash
npm install

# Apply SQL migrations (idempotent)
bun run db:migrate

# Seed default reference data (categories + optional admin)
bun run db:seed

# Start Next.js
npm run dev
```

Open `http://localhost:3000`.

### Seed admin user (optional)

If you want a ready-to-login seeded admin, add these to `.env.local` before running `db:seed`:

- `SEED_ADMIN_USER_ID=<uuid>`
- `SEED_ADMIN_EMAIL=<email>`
- `SEED_ADMIN_PASSWORD=<password>`

### Import historical transactions from CSV (optional)

After seeding, you can import transactions into the seeded admin user:

```bash
bun run db:data
```

Env vars (optional):

- `DATA_IMPORT_CSV` (default `data/historical-transactions.csv`)
- `DATA_IMPORT_ACCOUNT_NAME` (default `Cash`)
- `DATA_IMPORT_DEFAULT_LOCATION` (default `Hyderabad`)
- `DATA_IMPORT_EMAIL` (safety check; must match the seeded user’s email)
- `DATA_IMPORT_DRY_RUN=1` (validate only, no inserts)

## Commands

- `npm run dev`: dev server
- `npm run build`: production build
- `npm run start`: run production server
- `npm run lint`: lint
- `npm run typecheck`: typecheck
- `bun run db:migrate`: apply SQL migrations (`src/lib/db/migrations/*.sql`)
- `bun run db:reset`: drop all tables/enums then re-apply migrations (dangerous)
- `bun run db:seed`: seed default categories + optional admin user
- `bun run db:data`: import transactions from CSV
