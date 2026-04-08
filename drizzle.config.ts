import dotenv from "dotenv";
import type { Config } from "drizzle-kit";

// Match Next.js: prefer .env.local so `db:migrate` hits the same DB as `next dev`.
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const databaseUrl =
  process.env.DATABASE_URL ??
  (() => {
    throw new Error(
      "DATABASE_URL is not set. Create `.env.local` (or `.env`) with DATABASE_URL and JWT_SECRET before running drizzle-kit.",
    );
  })();

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
} satisfies Config;
