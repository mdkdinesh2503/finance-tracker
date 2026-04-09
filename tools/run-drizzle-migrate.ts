import dotenv from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

import { postgresOptionsFromUrl } from "../src/lib/db/postgres";

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
const db = drizzle(sql);

try {
  await migrate(db, { migrationsFolder: "src/lib/db/migrations" });
  console.log("Migrations finished.");
} catch (err) {
  console.error(err);
  console.error(
    [
      "",
      "If the message looks like duplicate type/table (leftovers from an old migration journal), run:",
      "  bun run db:repair-migrate",
      "Or wipe and re-apply:",
      "  bun run db:reset",
    ].join("\n"),
  );
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
