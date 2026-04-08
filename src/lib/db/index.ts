import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  postgresClient: ReturnType<typeof postgres> | undefined;
};

/** Single connection options for postgres.js (prepare: false required for Supabase pooler). */
export function createPostgresClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  const useSsl =
    url.includes("supabase") ||
    url.includes("sslmode=require") ||
    url.includes("neon.tech");
  return postgres(url, {
    max: 1,
    prepare: false,
    ssl: useSsl ? "require" : undefined,
  });
}

export function getDb() {
  if (!globalForDb.postgresClient) {
    globalForDb.postgresClient = createPostgresClient();
  }
  return drizzle(globalForDb.postgresClient, { schema });
}
