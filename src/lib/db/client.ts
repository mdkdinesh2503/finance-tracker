import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "./schema";
import { requireEnv } from "@/lib/env";
import { postgresOptionsFromUrl } from "./postgres-options";

const globalForDb = globalThis as unknown as {
  __postgres?: ReturnType<typeof postgres>;
};

const databaseUrl = requireEnv("DATABASE_URL");

const sql =
  globalForDb.__postgres ??
  postgres(databaseUrl, postgresOptionsFromUrl(databaseUrl));

if (process.env.NODE_ENV !== "production") globalForDb.__postgres = sql;

export const db = drizzle(sql, { schema });

/** Call from CLI scripts only; closes the shared pool so the process can exit cleanly. */
export async function closeDatabaseConnection(): Promise<void> {
  await sql.end({ timeout: 5 });
}

