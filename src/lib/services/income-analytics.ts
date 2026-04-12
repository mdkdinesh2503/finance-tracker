import { and, eq, gte, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { categories, companies, transactions } from "@/lib/db/schema";
import type * as schemaTypes from "@/lib/db/schema";
import type {
  EmployerSalaryInsight,
  IncomeAnalyticsScope,
  IncomeAnalyticsSnapshot,
  IncomeSalaryProjection,
  IncomeSalaryRaiseInsight,
  SalaryEmployerMonthlyCell,
} from "@/lib/types/income-analytics";
import { formatLocalYMD, localCalendarMonthRange } from "@/lib/utilities/date-presets";

type Db = PostgresJsDatabase<typeof schemaTypes>;

const SALARY_WAGES_PARENT = "Salary & Wages";
const OTHER_INCOME_PARENT = "Other Income";
const FAMILY_SUPPORT_LEAF = "Family Support";

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

function parseLocalYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map((x) => Number.parseInt(x, 10));
  return new Date(y, m - 1, d);
}

/** Paycheck on last calendar day of M → attributed to spend month M+1 (local dates). */
function spendMonthYmForSalaryCredit(ymd: string): string {
  const dt = parseLocalYmd(ymd);
  const lastDom = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
  if (dt.getDate() !== lastDom) {
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
  }
  const next = new Date(dt.getFullYear(), dt.getMonth() + 1, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}

function computeSalaryRaiseInsight(
  salaryWagesMonthly: { ym: string; total: number }[],
): IncomeSalaryRaiseInsight {
  const sorted = [...salaryWagesMonthly]
    .filter((r) => r.total > 0)
    .sort((a, b) => a.ym.localeCompare(b.ym));

  if (sorted.length === 0) {
    return {
      firstSalaryMonthYm: null,
      firstSalaryAmount: 0,
      latestSalaryMonthYm: null,
      latestSalaryAmount: 0,
      totalGrowthFromFirstToLatest: 0,
      pctGrowthFromFirstToLatest: null,
      firstMomIncreaseYm: null,
      amountBeforeFirstIncrease: 0,
      amountAfterFirstIncrease: 0,
    };
  }

  const first = sorted[0]!;
  const latest = sorted[sorted.length - 1]!;
  const growth = latest.total - first.total;
  const pct =
    first.total > 0 ? (growth / first.total) * 100 : null;

  let firstMomIncreaseYm: string | null = null;
  let amountBeforeFirstIncrease = 0;
  let amountAfterFirstIncrease = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const cur = sorted[i]!;
    if (cur.total > prev.total) {
      firstMomIncreaseYm = cur.ym;
      amountBeforeFirstIncrease = prev.total;
      amountAfterFirstIncrease = cur.total;
      break;
    }
  }

  return {
    firstSalaryMonthYm: first.ym,
    firstSalaryAmount: first.total,
    latestSalaryMonthYm: latest.ym,
    latestSalaryAmount: latest.total,
    totalGrowthFromFirstToLatest: growth,
    pctGrowthFromFirstToLatest: pct,
    firstMomIncreaseYm,
    amountBeforeFirstIncrease,
    amountAfterFirstIncrease,
  };
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

async function loadLifetimeIncomeAnalytics(db: Db, userId: string) {
  const base = and(eq(transactions.userId, userId), eq(transactions.type, "INCOME"));
  const lp = alias(categories, "life_par");
  const byParentRows = await db
    .select({
      parentName: sql<string>`coalesce(${lp.name}, 'Uncategorized')`,
      total: sql<string>`coalesce(sum(${transactions.amount})::text, '0')`,
    })
    .from(transactions)
    .leftJoin(
      lp,
      and(eq(transactions.parentCategoryId, lp.id), eq(lp.userId, userId)),
    )
    .where(base)
    .groupBy(transactions.parentCategoryId, lp.name);

  let totalIncome = 0;
  let salaryWagesTotal = 0;
  let otherIncomeTotal = 0;
  const lifetimeByParent = byParentRows
    .map((r) => {
      const t = num(r.total);
      totalIncome += t;
      const name = r.parentName ?? "Uncategorized";
      if (name === SALARY_WAGES_PARENT) salaryWagesTotal += t;
      else if (name === OTHER_INCOME_PARENT) otherIncomeTotal += t;
      return { parentName: name, total: t };
    })
    .sort((a, b) => b.total - a.total);

  const leafCat = alias(categories, "life_leaf");
  const parCat = alias(categories, "life_leaf_par");
  const lifetimeByLeaf = await db
    .select({
      parentName: sql<string>`coalesce(${parCat.name}, 'Uncategorized')`,
      leafName: sql<string>`coalesce(${leafCat.name}, 'Uncategorized')`,
      total: sql<string>`coalesce(sum(${transactions.amount})::text, '0')`,
    })
    .from(transactions)
    .leftJoin(
      leafCat,
      and(eq(transactions.categoryId, leafCat.id), eq(leafCat.userId, userId)),
    )
    .leftJoin(
      parCat,
      and(eq(transactions.parentCategoryId, parCat.id), eq(parCat.userId, userId)),
    )
    .where(base)
    .groupBy(
      transactions.parentCategoryId,
      parCat.name,
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

  const famLeaf = alias(categories, "fam_sup_leaf");
  const famPar = alias(categories, "fam_sup_par");
  const [famRow] = await db
    .select({
      total: sql<string>`coalesce(sum(${transactions.amount})::text, '0')`,
    })
    .from(transactions)
    .innerJoin(
      famLeaf,
      and(eq(transactions.categoryId, famLeaf.id), eq(famLeaf.userId, userId)),
    )
    .innerJoin(
      famPar,
      and(eq(famLeaf.parentId, famPar.id), eq(famPar.userId, userId)),
    )
    .where(
      and(
        base,
        eq(famPar.name, OTHER_INCOME_PARENT),
        eq(famLeaf.name, FAMILY_SUPPORT_LEAF),
      ),
    );

  const salPar = alias(categories, "sal_emp_par");
  const co = alias(companies, "sal_emp_co");
  const employerRows = await db
    .select({
      companyName: sql<string>`coalesce(${co.name}, 'Unspecified')`,
      total: sql<string>`coalesce(sum(${transactions.amount})::text, '0')`,
    })
    .from(transactions)
    .innerJoin(
      salPar,
      and(
        eq(transactions.parentCategoryId, salPar.id),
        eq(salPar.userId, userId),
        eq(salPar.name, SALARY_WAGES_PARENT),
      ),
    )
    .leftJoin(co, and(eq(transactions.companyId, co.id), eq(co.userId, userId)))
    .where(base)
    .groupBy(transactions.companyId, co.name)
    .then((rows) =>
      rows
        .map((r) => ({
          companyName: r.companyName ?? "Unspecified",
          total: num(r.total),
        }))
        .sort((a, b) => b.total - a.total),
    );

  return {
    totalIncome,
    salaryWagesTotal,
    otherIncomeTotal,
    lifetimeByParent,
    lifetimeByLeaf,
    lifetimeFamilySupportTotal: num(famRow?.total),
    lifetimeSalaryByEmployer: employerRows,
  };
}

async function fetchSalaryEmployerMonthlyCells(
  db: Db,
  userId: string,
): Promise<SalaryEmployerMonthlyCell[]> {
  const salPar = alias(categories, "sal_co_mo_par");
  const co = alias(companies, "sal_co_mo_co");
  const rows = await db
    .select({
      ym: sql<string>`to_char(${transactions.transactionDate}, 'YYYY-MM')`,
      companyName: sql<string>`coalesce(${co.name}, 'Unspecified')`,
      total: sql<string>`coalesce(sum(${transactions.amount})::text, '0')`,
    })
    .from(transactions)
    .innerJoin(
      salPar,
      and(
        eq(transactions.parentCategoryId, salPar.id),
        eq(salPar.userId, userId),
        eq(salPar.name, SALARY_WAGES_PARENT),
      ),
    )
    .leftJoin(co, and(eq(transactions.companyId, co.id), eq(co.userId, userId)))
    .where(and(eq(transactions.userId, userId), eq(transactions.type, "INCOME")))
    .groupBy(
      sql`to_char(${transactions.transactionDate}, 'YYYY-MM')`,
      transactions.companyId,
      co.name,
    )
    .orderBy(sql`to_char(${transactions.transactionDate}, 'YYYY-MM')`);

  return rows.map((r) => ({
    ym: r.ym,
    companyName: r.companyName ?? "Unspecified",
    total: num(r.total),
  }));
}

function buildEmployerSalaryInsights(
  cells: SalaryEmployerMonthlyCell[],
): EmployerSalaryInsight[] {
  const byCompany = new Map<string, Map<string, number>>();
  for (const c of cells) {
    let ymMap = byCompany.get(c.companyName);
    if (!ymMap) {
      ymMap = new Map();
      byCompany.set(c.companyName, ymMap);
    }
    ymMap.set(c.ym, (ymMap.get(c.ym) ?? 0) + c.total);
  }

  const lifetimeTotal = (name: string) =>
    cells.filter((x) => x.companyName === name).reduce((s, x) => s + x.total, 0);

  const out: EmployerSalaryInsight[] = [];
  for (const [companyName, ymMap] of byCompany) {
    const monthly = [...ymMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([ym, total]) => ({ ym, total }));

    const first = monthly[0];
    let stepUpMonthYm: string | null = null;
    let amountBeforeStepUp = 0;
    let amountAfterStepUp = 0;
    for (let i = 1; i < monthly.length; i++) {
      const prev = monthly[i - 1]!.total;
      const cur = monthly[i]!.total;
      if (cur > prev) {
        stepUpMonthYm = monthly[i]!.ym;
        amountBeforeStepUp = prev;
        amountAfterStepUp = cur;
        break;
      }
    }

    out.push({
      companyName,
      monthly,
      firstMonthYm: first?.ym ?? null,
      firstAmount: first?.total ?? 0,
      stepUpMonthYm,
      amountBeforeStepUp,
      amountAfterStepUp,
    });
  }

  out.sort((a, b) => lifetimeTotal(b.companyName) - lifetimeTotal(a.companyName));
  return out;
}

function emptyRaiseInsight(): IncomeSalaryRaiseInsight {
  return {
    firstSalaryMonthYm: null,
    firstSalaryAmount: 0,
    latestSalaryMonthYm: null,
    latestSalaryAmount: 0,
    totalGrowthFromFirstToLatest: 0,
    pctGrowthFromFirstToLatest: null,
    firstMomIncreaseYm: null,
    amountBeforeFirstIncrease: 0,
    amountAfterFirstIncrease: 0,
  };
}

export async function incomeAnalyticsSnapshot(
  db: Db,
  userId: string,
  now = new Date(),
  scope: IncomeAnalyticsScope = "salary",
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

  const otherMoPar = alias(categories, "other_mo_par");
  const otherIncomeRows = await db
    .select({
      ym: sql<string>`to_char(${transactions.transactionDate}, 'YYYY-MM')`,
      total: sql<string>`coalesce(sum(${transactions.amount})::text, '0')`,
    })
    .from(transactions)
    .innerJoin(
      otherMoPar,
      and(
        eq(transactions.parentCategoryId, otherMoPar.id),
        eq(otherMoPar.userId, userId),
        eq(otherMoPar.name, OTHER_INCOME_PARENT),
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

  const otherIncomeMonthly = otherIncomeRows.map((r) => ({
    ym: r.ym,
    total: num(r.total),
  }));

  const projection = computeSalaryProjection(salaryWagesMonthly, now);

  const salaryTxLines = await db
    .select({
      transactionDate: transactions.transactionDate,
      amount: transactions.amount,
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
    );

  const spendMap = new Map<string, number>();
  for (const line of salaryTxLines) {
    const ym = spendMonthYmForSalaryCredit(String(line.transactionDate));
    spendMap.set(ym, (spendMap.get(ym) ?? 0) + num(String(line.amount)));
  }
  const salaryWagesSpendAlignedMonthly = [...spendMap.entries()]
    .map(([ym, total]) => ({ ym, total }))
    .sort((a, b) => a.ym.localeCompare(b.ym));

  const raiseInsight = computeSalaryRaiseInsight(salaryWagesMonthly);
  const lifetime = await loadLifetimeIncomeAnalytics(db, userId);

  if (scope === "salary") {
    const salaryEmployerMonthlyCells = await fetchSalaryEmployerMonthlyCells(db, userId);
    const employerSalaryInsights =
      buildEmployerSalaryInsights(salaryEmployerMonthlyCells);

    return {
      scope: "salary",
      thisMonth: {
        label: thisRange.label,
        from: thisRange.from,
        to: thisRange.to,
        totalIncome: thisTotals.salaryWagesTotal,
        salaryWagesTotal: thisTotals.salaryWagesTotal,
        otherIncomeParentTotal: 0,
      },
      lastMonth: {
        label: lastRange.label,
        from: lastRange.from,
        to: lastRange.to,
        totalIncome: lastTotals.salaryWagesTotal,
        salaryWagesTotal: lastTotals.salaryWagesTotal,
        otherIncomeParentTotal: 0,
      },
      byParentThisMonth: byParentThisMonth.filter(
        (r) => r.parentName === SALARY_WAGES_PARENT,
      ),
      byLeafThisMonth: byLeafThisMonth.filter(
        (r) => r.parentName === SALARY_WAGES_PARENT,
      ),
      salaryWagesMonthly,
      salaryWagesSpendAlignedMonthly,
      otherIncomeMonthly: [],
      projection,
      raiseInsight,
      lifetimeTotalIncome: lifetime.salaryWagesTotal,
      lifetimeSalaryWagesTotal: lifetime.salaryWagesTotal,
      lifetimeOtherIncomeParentTotal: 0,
      lifetimeFamilySupportTotal: 0,
      lifetimeByParent: lifetime.lifetimeByParent.filter(
        (r) => r.parentName === SALARY_WAGES_PARENT,
      ),
      lifetimeByLeaf: lifetime.lifetimeByLeaf.filter(
        (r) => r.parentName === SALARY_WAGES_PARENT,
      ),
      lifetimeSalaryByEmployer: lifetime.lifetimeSalaryByEmployer,
      salaryEmployerMonthlyCells,
      employerSalaryInsights,
    };
  }

  return {
    scope: "other",
    thisMonth: {
      label: thisRange.label,
      from: thisRange.from,
      to: thisRange.to,
      totalIncome: thisTotals.otherIncomeTotal,
      salaryWagesTotal: 0,
      otherIncomeParentTotal: thisTotals.otherIncomeTotal,
    },
    lastMonth: {
      label: lastRange.label,
      from: lastRange.from,
      to: lastRange.to,
      totalIncome: lastTotals.otherIncomeTotal,
      salaryWagesTotal: 0,
      otherIncomeParentTotal: lastTotals.otherIncomeTotal,
    },
    byParentThisMonth: byParentThisMonth.filter(
      (r) => r.parentName === OTHER_INCOME_PARENT,
    ),
    byLeafThisMonth: byLeafThisMonth.filter(
      (r) => r.parentName === OTHER_INCOME_PARENT,
    ),
    salaryWagesMonthly: [],
    salaryWagesSpendAlignedMonthly: [],
    otherIncomeMonthly,
    projection: computeSalaryProjection([], now),
    raiseInsight: emptyRaiseInsight(),
    lifetimeTotalIncome: lifetime.otherIncomeTotal,
    lifetimeSalaryWagesTotal: 0,
    lifetimeOtherIncomeParentTotal: lifetime.otherIncomeTotal,
    lifetimeFamilySupportTotal: lifetime.lifetimeFamilySupportTotal,
    lifetimeByParent: lifetime.lifetimeByParent.filter(
      (r) => r.parentName === OTHER_INCOME_PARENT,
    ),
    lifetimeByLeaf: lifetime.lifetimeByLeaf.filter(
      (r) => r.parentName === OTHER_INCOME_PARENT,
    ),
    lifetimeSalaryByEmployer: [],
    salaryEmployerMonthlyCells: [],
    employerSalaryInsights: [],
  };
}
