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
