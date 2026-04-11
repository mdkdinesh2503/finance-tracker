import dotenv from "dotenv";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import { postgresOptionsFromUrl } from "../postgres";

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DB_RESET !== "1") {
    console.error(
      "Refusing to reset: NODE_ENV=production. Set ALLOW_DB_RESET=1 only if you intend to wipe this database.",
    );
    process.exit(1);
  }

  dotenv.config({ path: ".env.local" });
  dotenv.config({ path: ".env" });
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");

  const sql = postgres(url, {
    ...postgresOptionsFromUrl(url),
    max: 1,
    prepare: false,
  });
  const db = drizzle(sql);

  // Drop all app objects (safe for personal project reset)
  // - tables in public
  // - enums in public
  // - drizzle migrations schema
  await sql.unsafe(`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
      FOR r IN (
        SELECT t.typname
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public' AND t.typtype = 'e'
      ) LOOP
        EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
      END LOOP;
    END $$;
  `);
  await sql.unsafe(`DROP SCHEMA IF EXISTS drizzle CASCADE;`);

  await migrate(db, { migrationsFolder: "src/lib/db/migrations" });
  await sql.end({ timeout: 5 });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

