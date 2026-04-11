import { and, eq, gte, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { categories, transactions } from "@/lib/db/schema";
import type * as schemaTypes from "@/lib/db/schema";
import type {
  InvestmentAnalyticsSnapshot,
  InvestmentRunRate,
} from "@/lib/types/investment-analytics";
import { formatLocalYMD, localCalendarMonthRange } from "@/lib/utilities/date-presets";

type Db = PostgresJsDatabase<typeof schemaTypes>;

const FINANCIAL_PARENT = "Financial & Obligations";
const CASH_SAVINGS_PARENT = "Cash Savings";

function num(v: string | null | undefined): number {
  const n = Number(v ?? "0");
  return Number.isFinite(n) ? n : 0;
}

function previousCalendarMonthRange(now: Date) {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 15);
  return localCalendarMonthRange(d);
}

function currentYm(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function investmentInRange(userId: string, from: string, to: string) {
  return and(
    eq(transactions.userId, userId),
    eq(transactions.type, "INVESTMENT"),
    gte(transactions.transactionDate, from),
    lte(transactions.transactionDate, to),
  );
}

async function periodTotals(
  db: Db,
  userId: string,
  from: string,
  to: string,
): Promise<{
  total: number;
  financialObligationsTotal: number;
  cashSavingsTotal: number;
}> {
  const parentCat = alias(categories, "inv_par_tot");
  const base = investmentInRange(userId, from, to);

  const rows = await db
    .select({
      parentName: sql<string>`coalesce(${parentCat.name}, '')`,
      sub: sql<string>`coalesce(sum(${transactions.amount})::text, '0')`,
    })
    .from(transactions)
    .leftJoin(
      parentCat,
      and(
        eq(transactions.parentCategoryId, parentCat.id),
        eq(parentCat.userId, userId),
      ),
    )
    .where(base)
    .groupBy(transactions.parentCategoryId, parentCat.name);

  let total = 0;
  let financialObligationsTotal = 0;
  let cashSavingsTotal = 0;
  for (const r of rows) {
    const t = num(r.sub);
    total += t;
    if (r.parentName === FINANCIAL_PARENT) financialObligationsTotal += t;
    else if (r.parentName === CASH_SAVINGS_PARENT) cashSavingsTotal += t;
  }
  return { total, financialObligationsTotal, cashSavingsTotal };
}

function addShares<T extends { total: number }>(
  rows: T[],
  periodTotal: number,
): (T & { shareOfPeriod: number })[] {
  const safe = periodTotal > 0 ? periodTotal : 1;
  return rows.map((r) => ({
    ...r,
    shareOfPeriod: (r.total / safe) * 100,
  }));
}

function computeRunRate(
  monthly: { ym: string; total: number }[],
  now: Date,
): InvestmentRunRate {
  const cur = currentYm(now);
  const completed = monthly
    .filter((r) => r.ym < cur)
    .sort((a, b) => a.ym.localeCompare(b.ym))
    .slice(-6);

  if (completed.length === 0) {
    return {
      averageMonthlyLastCompleted: null,
      monthsAveraged: 0,
      impliedAnnualFromRecentPace: null,
    };
  }

  const sum = completed.reduce((a, r) => a + r.total, 0);
  const averageMonthlyLastCompleted = sum / completed.length;
  return {
    averageMonthlyLastCompleted,
    monthsAveraged: completed.length,
    impliedAnnualFromRecentPace: averageMonthlyLastCompleted * 12,
  };
}

export async function investmentAnalyticsSnapshot(
  db: Db,
  userId: string,
  now = new Date(),
): Promise<InvestmentAnalyticsSnapshot> {
  const thisRange = localCalendarMonthRange(now);
  const lastRange = previousCalendarMonthRange(now);

  const lookbackStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const lookbackFrom = formatLocalYMD(lookbackStart);

  const parentCat = alias(categories, "inv_parent");
  const leafCat = alias(categories, "inv_leaf");

  const thisMonthCond = investmentInRange(
    userId,
    thisRange.from,
    thisRange.to,
  );

  const [allTimeRow] = await db
    .select({
      total: sql<string>`coalesce(sum(${transactions.amount})::text, '0')`,
    })
    .from(transactions)
    .where(
      and(eq(transactions.userId, userId), eq(transactions.type, "INVESTMENT")),
    );

  const allTimeTotal = num(allTimeRow?.total);

  const [thisTotals, lastTotals, byParentRaw, byLeafRaw, monthlyRows] =
    await Promise.all([
      periodTotals(db, userId, thisRange.from, thisRange.to),
      periodTotals(db, userId, lastRange.from, lastRange.to),
      db
        .select({
          parentName: sql<string>`coalesce(${parentCat.name}, 'Uncategorized')`,
          total: sql<string>`coalesce(sum(${transactions.amount})::text, '0')`,
        })
        .from(transactions)
        .leftJoin(
          parentCat,
          and(
            eq(transactions.parentCategoryId, parentCat.id),
            eq(parentCat.userId, userId),
          ),
        )
        .where(thisMonthCond)
        .groupBy(transactions.parentCategoryId, parentCat.name)
        .then((rows) =>
          rows
            .map((r) => ({
              parentName: r.parentName ?? "Uncategorized",
              total: num(r.total),
            }))
            .sort((a, b) => b.total - a.total),
        ),
      db
        .select({
          parentName: sql<string>`coalesce(${parentCat.name}, 'Uncategorized')`,
          leafName: sql<string>`coalesce(${leafCat.name}, 'Uncategorized')`,
          total: sql<string>`coalesce(sum(${transactions.amount})::text, '0')`,
        })
        .from(transactions)
        .leftJoin(
          leafCat,
          and(
            eq(transactions.categoryId, leafCat.id),
            eq(leafCat.userId, userId),
          ),
        )
        .leftJoin(
          parentCat,
          and(
            eq(transactions.parentCategoryId, parentCat.id),
            eq(parentCat.userId, userId),
          ),
        )
        .where(thisMonthCond)
        .groupBy(
          transactions.parentCategoryId,
          parentCat.name,
          transactions.categoryId,
          leafCat.name,
        )
        .then((rows) =>
          rows
            .map((r) => ({
              parentName: r.parentName ?? "Uncategorized",
              leafName: r.leafName ?? "Uncategorized",
              total: num(r.total),
            }))
            .sort((a, b) => b.total - a.total),
        ),
      db
        .select({
          ym: sql<string>`to_char(${transactions.transactionDate}, 'YYYY-MM')`,
          total: sql<string>`coalesce(sum(${transactions.amount})::text, '0')`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.type, "INVESTMENT"),
            gte(transactions.transactionDate, lookbackFrom),
            lte(transactions.transactionDate, thisRange.to),
          ),
        )
        .groupBy(sql`to_char(${transactions.transactionDate}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${transactions.transactionDate}, 'YYYY-MM')`),
    ]);

  const monthlyTotals = monthlyRows.map((r) => ({
    ym: r.ym,
    total: num(r.total),
  }));

  const runRate = computeRunRate(monthlyTotals, now);

  const periodTotal = thisTotals.total;

  return {
    allTimeTotal,
    thisMonth: {
      label: thisRange.label,
      from: thisRange.from,
      to: thisRange.to,
      total: thisTotals.total,
      financialObligationsTotal: thisTotals.financialObligationsTotal,
      cashSavingsTotal: thisTotals.cashSavingsTotal,
    },
    lastMonth: {
      label: lastRange.label,
      from: lastRange.from,
      to: lastRange.to,
      total: lastTotals.total,
      financialObligationsTotal: lastTotals.financialObligationsTotal,
      cashSavingsTotal: lastTotals.cashSavingsTotal,
    },
    byParentThisMonth: addShares(byParentRaw, periodTotal),
    byLeafThisMonth: addShares(byLeafRaw, periodTotal),
    monthlyTotals,
    runRate,
  };
}
