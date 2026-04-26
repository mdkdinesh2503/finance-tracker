import type postgres from "postgres";

export type Sql = postgres.Sql;

type Frag = postgres.PendingQuery<readonly postgres.MaybeRow[]>;

/** AND-combine SQL fragments; omits undefined entries. */
export function sqlAnd(sql: Sql, parts: (Frag | undefined)[]): Frag {
  const p = parts.filter((x): x is Frag => x != null);
  if (p.length === 0) return sql`true`;
  let acc = p[0]!;
  for (let i = 1; i < p.length; i++) {
    acc = sql`${acc} and ${p[i]}`;
  }
  return acc;
}

/** OR-combine SQL fragments. */
export function sqlOr(sql: Sql, parts: (Frag | undefined)[]): Frag {
  const p = parts.filter((x): x is Frag => x != null);
  if (p.length === 0) return sql`false`;
  let acc = p[0]!;
  for (let i = 1; i < p.length; i++) {
    acc = sql`${acc} or ${p[i]}`;
  }
  return acc;
}

