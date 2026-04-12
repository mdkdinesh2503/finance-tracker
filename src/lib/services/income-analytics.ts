import { and, eq, gte, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { categories, transactions } from "@/lib/db/schema";
import type * as schemaTypes from "@/lib/db/schema";
import type {
  IncomeAnalyticsSnapshot,
  IncomeSalaryProjection,
} from "@/lib/types/income-analytics";
import { formatLocalYMD, localCalendarMonthRange } from "@/lib/utilities/date-presets";

type Db = PostgresJsDatabase<typeof schemaTypes>;

const SALARY_WAGES_PARENT = "Salary & Wages";
const OTHER_INCOME_PARENT = "Other Income";

function num(v: string | null | undefined): number {
  const n = Number(v ?? "0");
  return Number.isFinite(n) ? n : 0;
}

function previousCalendarMonthRange(now: Date): {
  from: string;
  to: string;
  label: string;
} {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 15);
  return localCalendarMonthRange(d);
}

function currentYm(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function incomeInRange(
  userId: string,
  from: string,
  to: string,
): ReturnType<typeof and> {
  return and(
    eq(transactions.userId, userId),
    eq(transactions.type, "INCOME"),
    gte(transactions.transactionDate, from),
    lte(transactions.transactionDate, to),
  );
}

async function monthIncomeTotals(
  db: Db,
  userId: string,
  from: string,
  to: string,
): Promise<{
  totalIncome: number;
  salaryWagesTotal: number;
  otherIncomeTotal: number;
}> {
  const parentCat = alias(categories, "inc_par_tot");
  const base = incomeInRange(userId, from, to);

  const rows = await db
    .select({
      parentName: sql<string>`coalesce(${parentCat.name}, '')`,
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
    .where(base)
    .groupBy(transactions.parentCategoryId, parentCat.name);

  let totalIncome = 0;
  let salaryWagesTotal = 0;
  let otherIncomeTotal = 0;
  for (const r of rows) {
    const t = num(r.total);
    totalIncome += t;
    if (r.parentName === SALARY_WAGES_PARENT) salaryWagesTotal += t;
    else if (r.parentName === OTHER_INCOME_PARENT) otherIncomeTotal += t;
  }
  return { totalIncome, salaryWagesTotal, otherIncomeTotal };
}

function computeSalaryProjection(
  salaryHistory: { ym: string; total: number }[],
  now: Date,
): IncomeSalaryProjection {
  const cur = currentYm(now);
  const completed = salaryHistory
    .filter((r) => r.ym < cur)
    .sort((a, b) => a.ym.localeCompare(b.ym))
    .slice(-6);

  const last = completed[completed.length - 1];
  const lastCompletedMonthYm = last?.ym ?? null;
  const lastCompletedMonthSalary = last?.total ?? 0;

  if (completed.length < 2) {
    return {
      completedMonthsUsed: completed.length,
      averageMoMChangePercent: null,
      projectedNextMonthSalary: null,
      lastCompletedMonthYm,
      lastCompletedMonthSalary,
    };
  }

  const growths: number[] = [];
  for (let i = 1; i < completed.length; i++) {
    const prev = completed[i - 1]!.total;
    const curr = completed[i]!.total;
    if (prev > 0) growths.push((curr - prev) / prev);
  }

  if (growths.length === 0) {
    return {
      completedMonthsUsed: completed.length,
      averageMoMChangePercent: null,
      projectedNextMonthSalary: lastCompletedMonthSalary,
      lastCompletedMonthYm,
      lastCompletedMonthSalary,
    };
  }

  const avgGrowth =
    growths.reduce((a, b) => a + b, 0) / growths.length;
  const projectedNextMonthSalary = lastCompletedMonthSalary * (1 + avgGrowth);

  return {
    completedMonthsUsed: completed.length,
    averageMoMChangePercent: avgGrowth * 100,
    projectedNextMonthSalary,
    lastCompletedMonthYm,
    lastCompletedMonthSalary,
  };
}

export async function incomeAnalyticsSnapshot(
  db: Db,
  userId: string,
  now = new Date(),
): Promise<IncomeAnalyticsSnapshot> {
  const thisRange = localCalendarMonthRange(now);
  const lastRange = previousCalendarMonthRange(now);

  const parentCat = alias(categories, "inc_parent");
  const leafCat = alias(categories, "inc_leaf");

  const thisMonthCond = incomeInRange(
    userId,
    thisRange.from,
    thisRange.to,
  );

  const byParentThisMonth = await db
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
    );

  const byLeafThisMonth = await db
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
    );

  const thisTotals = await monthIncomeTotals(db, userId, thisRange.from, thisRange.to);
  const lastTotals = await monthIncomeTotals(db, userId, lastRange.from, lastRange.to);

  const salaryParent = alias(categories, "salary_parent");
  const lookbackStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const lookbackFrom = formatLocalYMD(lookbackStart);

  const salaryRows = await db
    .select({
      ym: sql<string>`to_char(${transactions.transactionDate}, 'YYYY-MM')`,
      total: sql<string>`coalesce(sum(${transactions.amount})::text, '0')`,
    })
    .from(transactions)
    .innerJoin(
      salaryParent,
      and(
        eq(transactions.parentCategoryId, salaryParent.id),
        eq(salaryParent.userId, userId),
        eq(salaryParent.name, SALARY_WAGES_PARENT),
      ),
    )
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "INCOME"),
        gte(transactions.transactionDate, lookbackFrom),
        lte(transactions.transactionDate, thisRange.to),
      ),
    )
    .groupBy(sql`to_char(${transactions.transactionDate}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${transactions.transactionDate}, 'YYYY-MM')`);

  const salaryWagesMonthly = salaryRows.map((r) => ({
    ym: r.ym,
    total: num(r.total),
  }));

  const projection = computeSalaryProjection(salaryWagesMonthly, now);

  return {
    thisMonth: {
      label: thisRange.label,
      from: thisRange.from,
      to: thisRange.to,
      totalIncome: thisTotals.totalIncome,
      salaryWagesTotal: thisTotals.salaryWagesTotal,
      otherIncomeParentTotal: thisTotals.otherIncomeTotal,
    },
    lastMonth: {
      label: lastRange.label,
      from: lastRange.from,
      to: lastRange.to,
      totalIncome: lastTotals.totalIncome,
      salaryWagesTotal: lastTotals.salaryWagesTotal,
      otherIncomeParentTotal: lastTotals.otherIncomeTotal,
    },
    byParentThisMonth,
    byLeafThisMonth,
    salaryWagesMonthly,
    projection,
  };
}
