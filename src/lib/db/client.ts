import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "./schema";
import { requireEnv } from "@/lib/env";

const globalForDb = globalThis as unknown as {
  __postgres?: ReturnType<typeof postgres>;
};

const sql =
  globalForDb.__postgres ??
  postgres(requireEnv("DATABASE_URL"), {
    prepare: true,
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") globalForDb.__postgres = sql;

export const db = drizzle(sql, { schema });

