import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const url =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5432/postgres";

const sql = postgres(url, { max: 1, prepare: false });

try {
  const tables = await sql`
    select table_schema, table_name
    from information_schema.tables
    where table_schema = 'public'
    order by table_name
  `;
  console.log("public tables:", tables);

  const mig = await sql`
    select name, applied_at
    from schema_migrations
    order by applied_at
  `.catch((e) => ({ error: String(e?.message ?? e) }));
  console.log("schema_migrations:", mig);
} finally {
  await sql.end({ timeout: 5 });
}

