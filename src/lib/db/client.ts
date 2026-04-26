import postgres from "postgres";

import { postgresOptionsFromUrl } from "./postgres";

const globalForDb = globalThis as unknown as {
  __postgres?: ReturnType<typeof postgres>;
};

/** Avoid `@/lib/env/server` here so CLI scripts can import the pool without `server-only`. */
function requireDatabaseUrl(): string {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) throw new Error("DATABASE_URL is required");
  return value;
}

const databaseUrl = requireDatabaseUrl();

export const sql =
  globalForDb.__postgres ??
  postgres(databaseUrl, postgresOptionsFromUrl(databaseUrl));

if (process.env.NODE_ENV !== "production") globalForDb.__postgres = sql;

/** Alias for `sql` — same tagged-template Postgres client (no ORM). */
export const db = sql;

export type Db = typeof sql;

/** Cheap round-trip on the shared pool (dashboard diagnostics; hangs → connectivity / pooler). */
export async function pingPostgres(): Promise<void> {
  await sql`select 1`;
}

/** Call from CLI scripts only; closes the shared pool so the process can exit cleanly. */
export async function closeDatabaseConnection(): Promise<void> {
  await sql.end({ timeout: 5 });
}
