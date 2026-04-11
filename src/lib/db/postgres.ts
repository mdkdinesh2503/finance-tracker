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
export function postgresOptionsFromUrl(databaseUrl: string) {
  const lower = databaseUrl.toLowerCase();

  const isSupabaseHost =
    lower.includes("supabase.co") || lower.includes("pooler.supabase.com");

  const useSsl =
    process.env.DATABASE_SSL === "require" ||
    lower.includes("sslmode=require") ||
    lower.includes("sslmode=verify-full") ||
    isSupabaseHost ||
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

  // Supabase (direct + pooler) commonly documents Node/serverless clients with
  // `rejectUnauthorized: false` to avoid TLS chain issues. Stricter verify: set
  // DATABASE_SSL_VERIFY=1 to use `ssl: "require"` instead.
  const sslVerifyStrict = process.env.DATABASE_SSL_VERIFY === "1";
  const ssl =
    !useSsl
      ? undefined
      : isSupabaseHost && !sslVerifyStrict
        ? ({ rejectUnauthorized: false } as const)
        : ("require" as const);

  return {
    prepare: !disablePrepare,
    max,
    idle_timeout: 20,
    connect_timeout: connectTimeout,
    ssl,
  };
}

/** Walk error.cause chain (Drizzle → postgres.js) for a Postgres SQLSTATE code. */
export function postgresSqlState(error: unknown): string | undefined {
  let current: unknown = error;
  for (let i = 0; i < 6 && current != null; i++) {
    if (
      typeof current === "object" &&
      current !== null &&
      "code" in current &&
      typeof (current as { code: unknown }).code === "string"
    ) {
      return (current as { code: string }).code;
    }
    if (
      typeof current === "object" &&
      current !== null &&
      "cause" in current
    ) {
      current = (current as { cause: unknown }).cause;
    } else {
      break;
    }
  }
  return undefined;
}

/** e.g. 42P01 = undefined_table */
export function isUndefinedTableError(error: unknown): boolean {
  return postgresSqlState(error) === "42P01";
}
