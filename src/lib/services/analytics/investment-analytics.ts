import type { Db } from "@/lib/db/core/client";
import type {
  InvestmentAnalyticsSnapshot,
  InvestmentRunRate,
} from "@/lib/types/investment-analytics";
import { formatLocalYMD, localCalendarMonthRange } from "@/lib/utilities/date-presets";

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
  const investedRows = await db`
    select
      coalesce(p.name, '') as parent_name,
      coalesce(sum(t.amount)::text, '0') as sub
    from transactions t
    left join categories p
      on p.id = t.parent_category_id and p.user_id = ${userId}
    where t.user_id = ${userId}
      and t.type = 'INVESTMENT'
      and t.transaction_date >= ${from}
      and t.transaction_date <= ${to}
    group by t.parent_category_id, p.name
  `;

  const usedRows = await db`
    select
      coalesce(p.name, '') as parent_name,
      coalesce(sum(t.investment_used_amount)::text, '0') as sub
    from transactions t
    left join categories p
      on p.id = t.investment_used_parent_category_id and p.user_id = ${userId}
    where t.user_id = ${userId}
      and t.type = 'EXPENSE'
      and t.investment_used_amount is not null
      and t.transaction_date >= ${from}
      and t.transaction_date <= ${to}
    group by t.investment_used_parent_category_id, p.name
  `;

  const usedByParent = new Map<string, number>();
  for (const r of usedRows as unknown as { parent_name: string; sub: string }[]) {
    usedByParent.set(r.parent_name ?? "", num(r.sub));
  }

  let total = 0;
  let financialObligationsTotal = 0;
  let cashSavingsTotal = 0;
  for (const r of investedRows as unknown as { parent_name: string; sub: string }[]) {
    const invested = num(r.sub);
    const used = usedByParent.get(r.parent_name ?? "") ?? 0;
    const t = invested - used;
    total += t;
    if (r.parent_name === FINANCIAL_PARENT) financialObligationsTotal += t;
    else if (r.parent_name === CASH_SAVINGS_PARENT) cashSavingsTotal += t;
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

function addAllTimeShares<T extends { total: number }>(
  rows: T[],
  allTimeTotal: number,
): (T & { shareOfAllTime: number })[] {
  const safe = allTimeTotal > 0 ? allTimeTotal : 1;
  return rows.map((r) => ({
    ...r,
    shareOfAllTime: (r.total / safe) * 100,
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

  const [allTimeGrossRow] = await db`
    select coalesce(sum(amount)::text, '0') as total
    from transactions
    where user_id = ${userId} and type = 'INVESTMENT'
  `;
  const [allTimeUsedRow] = await db`
    select coalesce(sum(investment_used_amount)::text, '0') as total
    from transactions
    where user_id = ${userId}
      and type = 'EXPENSE'
      and investment_used_amount is not null
  `;

  const allTimeGross = num((allTimeGrossRow as { total: string } | undefined)?.total);
  const usedInvestmentAllTime = num((allTimeUsedRow as { total: string } | undefined)?.total);
  const allTimeTotal = allTimeGross - usedInvestmentAllTime;

  const thisTotals = await periodTotals(db, userId, thisRange.from, thisRange.to);
  const lastTotals = await periodTotals(db, userId, lastRange.from, lastRange.to);

  const byParentRaw = await db`
    select
      coalesce(p.name, 'Uncategorized') as parent_name,
      coalesce(sum(t.amount)::text, '0') as total
    from transactions t
    left join categories p
      on p.id = t.parent_category_id and p.user_id = ${userId}
    where t.user_id = ${userId}
      and t.type = 'INVESTMENT'
      and t.transaction_date >= ${thisRange.from}
      and t.transaction_date <= ${thisRange.to}
    group by t.parent_category_id, p.name
  `;

  const byParentUsedRaw = await db`
    select
      coalesce(p.name, 'Uncategorized') as parent_name,
      coalesce(sum(t.investment_used_amount)::text, '0') as total
    from transactions t
    left join categories p
      on p.id = t.investment_used_parent_category_id and p.user_id = ${userId}
    where t.user_id = ${userId}
      and t.type = 'EXPENSE'
      and t.investment_used_amount is not null
      and t.transaction_date >= ${thisRange.from}
      and t.transaction_date <= ${thisRange.to}
    group by t.investment_used_parent_category_id, p.name
  `;

  const usedByParentName = new Map<string, number>();
  for (const r of byParentUsedRaw as unknown as { parent_name: string; total: string }[]) {
    usedByParentName.set(r.parent_name ?? "Uncategorized", num(r.total));
  }

  const byParentSorted = (byParentRaw as unknown as { parent_name: string; total: string }[])
    .map((r) => ({
      parentName: r.parent_name ?? "Uncategorized",
      total: num(r.total) - (usedByParentName.get(r.parent_name ?? "Uncategorized") ?? 0),
    }))
    .sort((a, b) => b.total - a.total);

  const byLeafRaw = await db`
    select
      coalesce(p.name, 'Uncategorized') as parent_name,
      coalesce(l.name, 'Uncategorized') as leaf_name,
      coalesce(sum(t.amount)::text, '0') as total
    from transactions t
    left join categories l on l.id = t.category_id and l.user_id = ${userId}
    left join categories p on p.id = t.parent_category_id and p.user_id = ${userId}
    where t.user_id = ${userId}
      and t.type = 'INVESTMENT'
      and t.transaction_date >= ${thisRange.from}
      and t.transaction_date <= ${thisRange.to}
    group by t.parent_category_id, p.name, t.category_id, l.name
  `;

  const byLeafUsedRaw = await db`
    select
      coalesce(p.name, 'Uncategorized') as parent_name,
      coalesce(l.name, 'Uncategorized') as leaf_name,
      coalesce(sum(t.investment_used_amount)::text, '0') as total
    from transactions t
    left join categories l on l.id = t.investment_used_category_id and l.user_id = ${userId}
    left join categories p on p.id = t.investment_used_parent_category_id and p.user_id = ${userId}
    where t.user_id = ${userId}
      and t.type = 'EXPENSE'
      and t.investment_used_amount is not null
      and t.transaction_date >= ${thisRange.from}
      and t.transaction_date <= ${thisRange.to}
    group by t.investment_used_parent_category_id, p.name, t.investment_used_category_id, l.name
  `;

  const usedByLeafKey = new Map<string, number>();
  for (const r of byLeafUsedRaw as unknown as { parent_name: string; leaf_name: string; total: string }[]) {
    const key = `${r.parent_name ?? "Uncategorized"}__${r.leaf_name ?? "Uncategorized"}`;
    usedByLeafKey.set(key, num(r.total));
  }

  const byLeafSorted = (byLeafRaw as unknown as { parent_name: string; leaf_name: string; total: string }[])
    .map((r) => ({
      parentName: r.parent_name ?? "Uncategorized",
      leafName: r.leaf_name ?? "Uncategorized",
      total:
        num(r.total) -
        (usedByLeafKey.get(
          `${r.parent_name ?? "Uncategorized"}__${r.leaf_name ?? "Uncategorized"}`,
        ) ?? 0),
    }))
    .sort((a, b) => b.total - a.total);

  const byLeafAllTimeRaw = await db`
    select
      coalesce(p.name, 'Uncategorized') as parent_name,
      coalesce(l.name, 'Uncategorized') as leaf_name,
      coalesce(sum(t.amount)::text, '0') as total
    from transactions t
    left join categories l on l.id = t.category_id and l.user_id = ${userId}
    left join categories p on p.id = t.parent_category_id and p.user_id = ${userId}
    where t.user_id = ${userId}
      and t.type = 'INVESTMENT'
    group by t.parent_category_id, p.name, t.category_id, l.name
  `;

  const byLeafAllTimeUsedRaw = await db`
    select
      coalesce(p.name, 'Uncategorized') as parent_name,
      coalesce(l.name, 'Uncategorized') as leaf_name,
      coalesce(sum(t.investment_used_amount)::text, '0') as total
    from transactions t
    left join categories l on l.id = t.investment_used_category_id and l.user_id = ${userId}
    left join categories p on p.id = t.investment_used_parent_category_id and p.user_id = ${userId}
    where t.user_id = ${userId}
      and t.type = 'EXPENSE'
      and t.investment_used_amount is not null
    group by t.investment_used_parent_category_id, p.name, t.investment_used_category_id, l.name
  `;

  const usedAllTimeByLeafKey = new Map<string, number>();
  for (const r of byLeafAllTimeUsedRaw as unknown as { parent_name: string; leaf_name: string; total: string }[]) {
    const key = `${r.parent_name ?? "Uncategorized"}__${r.leaf_name ?? "Uncategorized"}`;
    usedAllTimeByLeafKey.set(key, num(r.total));
  }

  const byLeafAllTimeSorted = (
    byLeafAllTimeRaw as unknown as {
      parent_name: string;
      leaf_name: string;
      total: string;
    }[]
  )
    .map((r) => ({
      parentName: r.parent_name ?? "Uncategorized",
      leafName: r.leaf_name ?? "Uncategorized",
      total:
        num(r.total) -
        (usedAllTimeByLeafKey.get(
          `${r.parent_name ?? "Uncategorized"}__${r.leaf_name ?? "Uncategorized"}`,
        ) ?? 0),
    }))
    .sort((a, b) => b.total - a.total);

  const monthlyInvestedRows = await db`
    select
      to_char(transaction_date, 'YYYY-MM') as ym,
      coalesce(sum(amount)::text, '0') as total
    from transactions
    where user_id = ${userId}
      and type = 'INVESTMENT'
      and transaction_date >= ${lookbackFrom}
      and transaction_date <= ${thisRange.to}
    group by to_char(transaction_date, 'YYYY-MM')
    order by 1
  `;

  const monthlyUsedRows = await db`
    select
      to_char(transaction_date, 'YYYY-MM') as ym,
      coalesce(sum(investment_used_amount)::text, '0') as total
    from transactions
    where user_id = ${userId}
      and type = 'EXPENSE'
      and investment_used_amount is not null
      and transaction_date >= ${lookbackFrom}
      and transaction_date <= ${thisRange.to}
    group by to_char(transaction_date, 'YYYY-MM')
    order by 1
  `;

  const investedByYm = new Map<string, number>();
  for (const r of monthlyInvestedRows as unknown as { ym: string; total: string }[]) {
    investedByYm.set(r.ym, num(r.total));
  }
  const usedByYm = new Map<string, number>();
  for (const r of monthlyUsedRows as unknown as { ym: string; total: string }[]) {
    usedByYm.set(r.ym, num(r.total));
  }

  const ymKeys = [...new Set([...investedByYm.keys(), ...usedByYm.keys()])].sort((a, b) =>
    a.localeCompare(b),
  );

  const monthlyTotals = ymKeys.map((ym) => ({
    ym,
    total: (investedByYm.get(ym) ?? 0) - (usedByYm.get(ym) ?? 0),
  }));

  const usedInvestmentLast12Months = ymKeys.reduce((s, ym) => s + (usedByYm.get(ym) ?? 0), 0);

  const runRate = computeRunRate(monthlyTotals, now);

  const periodTotal = thisTotals.total;

  return {
    allTimeGross,
    allTimeTotal,
    usedInvestmentAllTime,
    usedInvestmentLast12Months,
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
    byParentThisMonth: addShares(byParentSorted, periodTotal),
    byLeafThisMonth: addShares(byLeafSorted, periodTotal),
    byLeafAllTime: addAllTimeShares(byLeafAllTimeSorted, allTimeTotal),
    monthlyTotals,
    runRate,
  };
}

