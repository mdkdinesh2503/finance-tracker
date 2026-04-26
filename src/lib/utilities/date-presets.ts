import type postgres from "postgres";

import type { Sql } from "@/lib/db/sql-fragments";
import { sqlAnd } from "@/lib/db/sql-fragments";
import type { DatePreset } from "@/lib/types/filters";

type PgFrag = postgres.PendingQuery<any>;

/** Qualified `transactions` alias `t` (must match `from transactions t` in queries). */
function tCol(sql: Sql, name: string) {
  return sql.unsafe(`t.${name}`);
}

export function formatLocalYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function localCalendarMonthRange(d: Date): {
  from: string;
  to: string;
  label: string;
} {
  const s = new Date(d.getFullYear(), d.getMonth(), 1);
  const e = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const label = s.toLocaleString(undefined, { month: "long", year: "numeric" });
  return { from: formatLocalYMD(s), to: formatLocalYMD(e), label };
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function startOfYear(y: number): Date {
  return new Date(y, 0, 1);
}

function endOfYear(y: number): Date {
  return new Date(y, 11, 31);
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function dateBoundsForPreset(
  preset: Exclude<DatePreset, "CUSTOM_RANGE">,
  now = new Date(),
): { fromDate: string | null; toDate: string | null } {
  switch (preset) {
    case "ALL_TIME":
      return { fromDate: null, toDate: null };
    case "THIS_YEAR": {
      const y = now.getFullYear();
      return { fromDate: formatLocalYMD(startOfYear(y)), toDate: formatLocalYMD(endOfYear(y)) };
    }
    case "THIS_AND_PREVIOUS_YEAR": {
      const y = now.getFullYear();
      return {
        fromDate: formatLocalYMD(startOfYear(y - 1)),
        toDate: formatLocalYMD(endOfYear(y)),
      };
    }
    case "THIS_MONTH": {
      const s = startOfMonth(now);
      const e = endOfMonth(now);
      return { fromDate: formatLocalYMD(s), toDate: formatLocalYMD(e) };
    }
    case "LAST_MONTH": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      const s = startOfMonth(d);
      const e = endOfMonth(d);
      return { fromDate: formatLocalYMD(s), toDate: formatLocalYMD(e) };
    }
    case "THIS_MONTH_ALL_YEARS": {
      const m = now.getMonth();
      const y = now.getFullYear();
      const s = new Date(y, m, 1);
      const e = new Date(y, m + 1, 0);
      return { fromDate: formatLocalYMD(s), toDate: formatLocalYMD(e) };
    }
    case "LAST_MONTH_ALL_YEARS": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      const s = startOfMonth(d);
      const e = endOfMonth(d);
      return { fromDate: formatLocalYMD(s), toDate: formatLocalYMD(e) };
    }
    default: {
      const _exhaustive: never = preset;
      return _exhaustive;
    }
  }
}

export function customDateRangeFilter(
  sql: Sql,
  fromDate: string | null,
  toDate: string | null,
): PgFrag | undefined {
  const parts: PgFrag[] = [];
  if (fromDate && YMD.test(fromDate)) {
    parts.push(sql`${tCol(sql, "transaction_date")} >= ${fromDate}`);
  }
  if (toDate && YMD.test(toDate)) {
    parts.push(sql`${tCol(sql, "transaction_date")} <= ${toDate}`);
  }
  if (parts.length === 0) return undefined;
  return parts.length === 1 ? parts[0]! : sqlAnd(sql, parts);
}

export function resolveTransactionDateCondition(
  sql: Sql,
  preset: DatePreset,
  fromDate: string | null,
  toDate: string | null,
  now = new Date(),
): PgFrag | undefined {
  if (preset === "CUSTOM_RANGE") {
    return customDateRangeFilter(sql, fromDate, toDate);
  }
  return transactionDateFilter(sql, preset, now);
}

export function lastCalendarMonth(now: Date): number {
  const d = new Date(now);
  d.setMonth(d.getMonth() - 1);
  return d.getMonth() + 1;
}

export function transactionDateFilter(
  sql: Sql,
  preset: DatePreset,
  now = new Date(),
): PgFrag | undefined {
  switch (preset) {
    case "CUSTOM_RANGE":
      return undefined;
    case "ALL_TIME":
      return undefined;
    case "THIS_YEAR": {
      const y = now.getFullYear();
      return sqlAnd(sql, [
        sql`${tCol(sql, "transaction_date")} >= ${formatLocalYMD(startOfYear(y))}`,
        sql`${tCol(sql, "transaction_date")} <= ${formatLocalYMD(endOfYear(y))}`,
      ]);
    }
    case "THIS_AND_PREVIOUS_YEAR": {
      const y = now.getFullYear();
      return sqlAnd(sql, [
        sql`${tCol(sql, "transaction_date")} >= ${formatLocalYMD(startOfYear(y - 1))}`,
        sql`${tCol(sql, "transaction_date")} <= ${formatLocalYMD(endOfYear(y))}`,
      ]);
    }
    case "THIS_MONTH": {
      const s = startOfMonth(now);
      const e = endOfMonth(now);
      return sqlAnd(sql, [
        sql`${tCol(sql, "transaction_date")} >= ${formatLocalYMD(s)}`,
        sql`${tCol(sql, "transaction_date")} <= ${formatLocalYMD(e)}`,
      ]);
    }
    case "LAST_MONTH": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      const s = startOfMonth(d);
      const e = endOfMonth(d);
      return sqlAnd(sql, [
        sql`${tCol(sql, "transaction_date")} >= ${formatLocalYMD(s)}`,
        sql`${tCol(sql, "transaction_date")} <= ${formatLocalYMD(e)}`,
      ]);
    }
    case "THIS_MONTH_ALL_YEARS": {
      const m = now.getMonth() + 1;
      return sql`extract(month from ${tCol(sql, "transaction_date")}) = ${m}`;
    }
    case "LAST_MONTH_ALL_YEARS": {
      const m = lastCalendarMonth(now);
      return sql`extract(month from ${tCol(sql, "transaction_date")}) = ${m}`;
    }
    default:
      return undefined;
  }
}
