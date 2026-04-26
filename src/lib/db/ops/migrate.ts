import dotenv from "dotenv";
import postgres from "postgres";

import { postgresOptionsFromUrl } from "../core/postgres";
import { runSqlMigrations } from "../migrations/run";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const url = process.env.DATABASE_URL;
const jwtSecret = process.env.JWT_SECRET;
if (!url || !jwtSecret) {
  const missing = [
    ...(url ? [] : ["DATABASE_URL"]),
    ...(jwtSecret ? [] : ["JWT_SECRET"]),
  ];
  console.error(
    [
      `Missing required env: ${missing.join(", ")}`,
      "",
      "Update `.env` (or `.env.local`) with:",
      "  DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DATABASE",
      "  JWT_SECRET=your-long-random-secret",
    ].join("\n"),
  );
  process.exit(1);
}

const sql = postgres(url, {
  ...postgresOptionsFromUrl(url),
  max: 1,
  prepare: false,
});

try {
  await runSqlMigrations(sql);
  console.log("Migrations finished.");
} catch (err) {
  console.error(err);
  console.error(
    [
      "",
      "Baseline migration is idempotent (IF NOT EXISTS). If you still see errors, try a clean slate:",
      "  bun run db:reset",
    ].join("\n"),
  );
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}

