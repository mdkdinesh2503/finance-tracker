import type { Options } from "postgres";

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

/**
 * postgres.js options for production-style URLs: TLS for cloud providers,
 * optional pool size, and disabled prepared statements when the URL suggests
 * PgBouncer / pooler mode (or `DATABASE_DISABLE_PREPARE=1`).
 */
export function postgresOptionsFromUrl(databaseUrl: string): Options<{}> {
  const lower = databaseUrl.toLowerCase();

  const useSsl =
    process.env.DATABASE_SSL === "require" ||
    lower.includes("sslmode=require") ||
    lower.includes("sslmode=verify-full") ||
    lower.includes("supabase.co") ||
    lower.includes("neon.tech") ||
    lower.includes(".neon.tech") ||
    lower.includes("render.com") ||
    lower.includes("amazonaws.com") ||
    lower.includes("azure.com");

  const disablePrepare =
    process.env.DATABASE_DISABLE_PREPARE === "1" ||
    lower.includes("pooler") ||
    lower.includes("pgbouncer=true");

  const max = Math.min(
    100,
    Math.max(1, parsePositiveInt(process.env.DATABASE_POOL_MAX, 10)),
  );

  const connectTimeout = Math.min(
    120,
    Math.max(1, parsePositiveInt(process.env.DATABASE_CONNECT_TIMEOUT, 10)),
  );

  return {
    prepare: !disablePrepare,
    max,
    idle_timeout: 20,
    connect_timeout: connectTimeout,
    ssl: useSsl ? "require" : undefined,
  };
}
