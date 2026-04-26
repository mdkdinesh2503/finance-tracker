import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type postgres from "postgres";

const MIGRATIONS_DIR = path.join(process.cwd(), "src/lib/db/migrations");

function splitMigrationStatements(content: string): string[] {
  return content
    .split(/\n--> statement-breakpoint\n/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Applies `*.sql` in `src/lib/db/migrations` once each, tracked in `schema_migrations`.
 */
export async function runSqlMigrations(sql: postgres.Sql): Promise<void> {
  await sql`
    create table if not exists schema_migrations (
      id serial primary key,
      name text not null unique,
      applied_at timestamptz not null default now()
    )
  `;

  const names = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const name of names) {
    const applied = await sql`
      select 1 as x from schema_migrations where name = ${name} limit 1
    `;
    if (applied.length > 0) continue;

    const fullPath = path.join(MIGRATIONS_DIR, name);
    const body = await readFile(fullPath, "utf8");
    const statements = splitMigrationStatements(body);

    await sql.begin(async (tx) => {
      for (const stmt of statements) {
        await tx.unsafe(stmt);
      }
      await tx`
        insert into schema_migrations ${tx({ name })}
      `;
    });
  }
}

