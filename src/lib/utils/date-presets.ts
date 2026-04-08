import type { SQL } from "drizzle-orm";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { transactions } from "@/lib/db/schema";
import type { DatePreset } from "@/features/filters/types";

export function formatLocalYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Local calendar month containing `d` → YYYY-MM-DD bounds + human label (e.g. April 2026). */
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

/** Bounds shown in From/To inputs when a preset is chosen (DB still uses the preset, except CUSTOM_RANGE). */
export function dateBoundsForPreset(
  preset: Exclude<DatePreset, "CUSTOM_RANGE">,
  now = new Date()
): { fromDate: string | null; toDate: string | null } {
  switch (preset) {
    case "ALL_TIME":
      return { fromDate: null, toDate: null };
    case "THIS_YEAR": {
      const y = now.getFullYear();
      return {
        fromDate: formatLocalYMD(startOfYear(y)),
        toDate: formatLocalYMD(endOfYear(y)),
      };
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
  fromDate: string | null,
  toDate: string | null
): SQL | undefined {
  const parts: SQL[] = [];
  if (fromDate && YMD.test(fromDate)) {
    parts.push(gte(transactions.transactionDate, fromDate));
  }
  if (toDate && YMD.test(toDate)) {
    parts.push(lte(transactions.transactionDate, toDate));
  }
  if (parts.length === 0) return undefined;
  return parts.length === 1 ? parts[0]! : and(...parts)!;
}

export function resolveTransactionDateCondition(
  preset: DatePreset,
  fromDate: string | null,
  toDate: string | null,
  now = new Date()
): SQL | undefined {
  if (preset === "CUSTOM_RANGE") {
    return customDateRangeFilter(fromDate, toDate);
  }
  return transactionDateFilter(preset, now);
}

/** Calendar month number 1–12 for "last month" relative to `now`. */
export function lastCalendarMonth(now: Date): number {
  const d = new Date(now);
  d.setMonth(d.getMonth() - 1);
  return d.getMonth() + 1;
}

export function transactionDateFilter(
  preset: DatePreset,
  now = new Date()
): SQL | undefined {
  switch (preset) {
    case "CUSTOM_RANGE":
      return undefined;
    case "ALL_TIME":
      return undefined;
    case "THIS_YEAR": {
      const y = now.getFullYear();
      return and(
        gte(transactions.transactionDate, formatLocalYMD(startOfYear(y))),
        lte(transactions.transactionDate, formatLocalYMD(endOfYear(y)))
      );
    }
    case "THIS_AND_PREVIOUS_YEAR": {
      const y = now.getFullYear();
      return and(
        gte(transactions.transactionDate, formatLocalYMD(startOfYear(y - 1))),
        lte(transactions.transactionDate, formatLocalYMD(endOfYear(y)))
      );
    }
    case "THIS_MONTH": {
      const s = startOfMonth(now);
      const e = endOfMonth(now);
      return and(
        gte(transactions.transactionDate, formatLocalYMD(s)),
        lte(transactions.transactionDate, formatLocalYMD(e))
      );
    }
    case "LAST_MONTH": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      const s = startOfMonth(d);
      const e = endOfMonth(d);
      return and(
        gte(transactions.transactionDate, formatLocalYMD(s)),
        lte(transactions.transactionDate, formatLocalYMD(e))
      );
    }
    case "THIS_MONTH_ALL_YEARS": {
      const m = now.getMonth() + 1;
      return eq(sql<number>`extract(month from ${transactions.transactionDate})`, m);
    }
    case "LAST_MONTH_ALL_YEARS": {
      const m = lastCalendarMonth(now);
      return eq(sql<number>`extract(month from ${transactions.transactionDate})`, m);
    }
    default:
      return undefined;
  }
}
