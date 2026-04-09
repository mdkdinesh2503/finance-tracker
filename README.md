## Finance Tracker

Personal finance tracker built with **Next.js App Router**, **PostgreSQL**, and **Drizzle**.

## Local setup

### Prerequisites

- **Bun**
- **PostgreSQL** (local or hosted)

### Environment variables

Create `.env.local` from `.env.example` and set:

- **`DATABASE_URL`**: Postgres connection string
- **`JWT_SECRET`**: long random secret for signing sessions

### Install + run

```bash
bun install
bun run db:migrate
bun run db:seed
bun dev
```

Open `http://localhost:3000`.

## Commands

- `bun run dev`: dev server
- `bun run build`: production build
- `bun run start`: run production server
- `bun run lint`: lint
- `bun run typecheck`: typecheck
- `bun run db:migrate`: run SQL migrations
- `bun run db:seed`: seed default categories
