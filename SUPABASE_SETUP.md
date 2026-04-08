# Supabase setup (PostgreSQL + Auth + RLS)

This app uses **Supabase Auth** in the browser and **Drizzle ORM** on the server with your database connection string. Follow the steps below on a free Supabase project.

## 1. Create a project

1. Open [https://supabase.com](https://supabase.com) and create a project (free tier).
2. Wait for the database to finish provisioning.

## 2. Environment variables

Copy `.env.example` to `.env.local` (or `.env`) and set:

| Variable | Where to find it |
|----------|------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project **Settings → API → Project URL** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project **Settings → API → anon public** |
| `DATABASE_URL` | Project **Settings → Database → Connection string → URI**. Prefer the **Transaction pooler** (port `6543`) for serverless/Vercel. Include the password you set for the database user. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Settings → API → service_role** (secret). **Server / CLI only** — never commit or expose to the browser. Used when running `db:lookups` to create or confirm the admin Auth user (see below). Optional if you manage users only in the dashboard. |

Example pooler URI shape:

`postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`

## 3. Database CLI commands

| Script | What it does |
|--------|----------------|
| `bun run db:generate` | Regenerate SQL from `lib/db/schema.ts` into `drizzle/` (run when you change the schema). |
| `bun run db:migrate` | Apply pending migrations only (`drizzle-kit migrate`). |
| `bun run db:seed` or `bun run db:lookups` | Sync shared **locations** + **category** tree (idempotent). If `SUPABASE_SERVICE_ROLE_KEY` is set, also syncs **Supabase Auth** for `ADMIN_EMAIL` (confirmed email, no confirmation step). |
| `bun run db:import-csv` | Append `data/historical-expenses.csv` for the admin user (**no delete**; can duplicate if run twice). |
| `bun run db:reset-and-import` | **Delete** admin transactions + borrow data, then import that CSV (clean reload). |

Typical first-time setup (after `.env` has `DATABASE_URL`):

```bash
bun run db:migrate
bun run db:lookups
```

**`db:seed` / `db:lookups`** is idempotent: inserts missing locations/categories; updates existing categories if `type` / `sort_order` / `is_selectable` changed in code.

**Auth sync (optional):** With `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL` (or `SUPABASE_URL`) in `.env`, the same command ensures `ADMIN_EMAIL` has **`email_confirm: true`** in GoTrue. If the user does not exist yet, set **`ADMIN_PASSWORD`** so the script can create them. If they already exist, the script confirms the email and updates `display_name` from `ADMIN_DISPLAY_NAME`; it only updates the password when `ADMIN_PASSWORD` is set.

## 4. Row Level Security

Open the Supabase **SQL Editor**, paste the contents of `supabase/rls.sql`, and run it once.

That script:

- Adds foreign keys from `transactions.user_id` and `borrow_accounts.user_id` to `auth.users(id)`.
- Enables RLS on all app tables.
- Creates policies so each authenticated user only sees rows where `user_id = auth.uid()` (and borrow links only through owned borrow accounts).
- Allows **read** access to global `categories` and `locations` for any signed-in user.

### Important: Drizzle and RLS

Server-side queries use the **database role from `DATABASE_URL`** (typically the `postgres` role or a dedicated user). That connection **bypasses RLS** in Postgres. **Application code always filters by `user_id` from `auth.getUser()`** so data stays isolated. RLS still protects data if you later query the same tables through the Supabase client with the user’s JWT, or add Edge Functions using the anon key.

## 5. Admin env (your account = same as any user in the app)

Set in `.env` (see `.env.example`):

| Variable | Purpose |
|----------|---------|
| `ADMIN_DISPLAY_NAME` | Label (e.g. DINESHKUMAR) |
| `ADMIN_EMAIL` | Supabase Auth email; used for CSV scripts, admin resolution, and optional Auth sync on seed |
| `ADMIN_PASSWORD` | Optional: required **only** to **create** a new admin user during seed; if set and the user already exists, seed updates their password. Not used by the login page (no prefilled fields). |
| `ADMIN_USER_ID` | Optional **UUID** from **Authentication → Users** (not a custom label — values like `DINESHKUMAR001` are ignored and email lookup is used) |

Legacy: `SEED_USER_ID` / `ADMIN_AUTH_UID` work like `ADMIN_USER_ID`.

You use transactions like everyone else. **`db:reset-and-import`** only wipes/reloads this admin user’s transaction + borrow rows. **`db:import-csv`** only appends CSV rows. Other users are unchanged and can add **shared locations** under Settings.

## 6. CSV import (`db:import-csv` vs `db:reset-and-import`)

- **`bun run db:import-csv`** — adds rows from `data/historical-expenses.csv` without deleting anything (rerunning may duplicate lines).
- **`bun run db:reset-and-import`** — deletes admin `borrow_links`, `transactions`, and `borrow_accounts`, then imports the CSV (full refresh).

Both need a resolvable admin user: **`ADMIN_USER_ID`** (or `SEED_USER_ID` / `ADMIN_AUTH_UID`), or an `auth.users` row matching **`ADMIN_EMAIL`**.

This removes `borrow_links`, your `transactions`, and your `borrow_accounts` only. It does **not** remove categories or global locations; it **adds** any new location names from the CSV (e.g. Erode, Bangalore). Categories in the CSV must match selectable names from the reference tree (`Food & dining`, `Rent & utilities`, `Transport`, `Brokerage / ETFs`, etc.).

The CSV is built from your pasted line items (including 2026 through early April). Your note **“Total − 5,58,046”** may use a different cutoff or grouping than summing every captured row; the file keeps **all individual entries** so nothing is dropped. July 2024 had no amounts in the source, so three **₹1** placeholders preserve those dates/locations.

## 7. Auth settings

- For email/password sign-in, in **Authentication → Providers**, ensure **Email** is enabled.

### “Email not confirmed” (`email_not_confirmed`)

Supabase blocks sign-in until the address is confirmed. Fix it in one of these ways:

1. **Re-run lookups seed with the service role** — Put `SUPABASE_SERVICE_ROLE_KEY` in `.env` and run `bun run db:seed`; the script sets **`email_confirm: true`** for `ADMIN_EMAIL` (see §3).
2. **Use the email link** — After sign-up, Supabase sends a confirmation email; click the link (check spam).
3. **Confirm manually** — Dashboard → **Authentication** → **Users** → select the user → **Confirm user** (or the three-dots menu → confirm).
4. **Dev / personal project** — **Authentication** → **Providers** → **Email** → turn off **“Confirm email”** so sign-in works immediately (avoid this for production if you need verified emails).

Set **`ADMIN_EMAIL`** in `.env` to the same address as in Supabase so `db:data` / CSV scripts and Auth sync target the correct user.

## 8. Deploy on Vercel

1. Push the repo to GitHub/GitLab and import the project in Vercel.
2. Add **`NEXT_PUBLIC_SUPABASE_URL`**, **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**, and **`DATABASE_URL`** in **Vercel → Project → Settings → Environment Variables**. Do **not** add **`SUPABASE_SERVICE_ROLE_KEY`** to the web app unless you have a dedicated server/CI step that needs it; keep the service role off edge/browser runtimes.
3. Use the **pooler** `DATABASE_URL` and keep **Transaction** mode for serverless functions.
4. Redeploy after changing env vars.

## 9. Optional: local Postgres

For local development without Supabase, point `DATABASE_URL` at a local Postgres instance, run `bun run db:migrate` then `bun run db:lookups`, and skip the RLS script (or adapt policies if you add Supabase later). CSV scripts need `auth.users` or `ADMIN_USER_ID` if you use Supabase-style auth.
