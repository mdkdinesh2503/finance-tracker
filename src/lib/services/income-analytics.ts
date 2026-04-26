import type { Db } from "@/lib/db/client";
import type {
  EmployerSalaryInsight,
  IncomeAnalyticsScope,
  IncomeAnalyticsSnapshot,
  IncomeSalaryProjection,
  IncomeSalaryRaiseInsight,
  SalaryEmployerMonthlyCell,
} from "@/lib/types/income-analytics";
import { formatLocalYMD, localCalendarMonthRange } from "@/lib/utilities/date-presets";

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
  const rows = await db`
    select
      coalesce(p.name, '') as parent_name,
      coalesce(sum(t.amount)::text, '0') as total
    from transactions t
    left join categories p
      on p.id = t.parent_category_id and p.user_id = ${userId}
    where t.user_id = ${userId}
      and t.type = 'INCOME'
      and t.transaction_date >= ${from}
      and t.transaction_date <= ${to}
    group by t.parent_category_id, p.name
  `;

  let totalIncome = 0;
  let salaryWagesTotal = 0;
  let otherIncomeTotal = 0;
  for (const r of rows as unknown as { parent_name: string; total: string }[]) {
    const t = num(r.total);
    totalIncome += t;
    if (r.parent_name === SALARY_WAGES_PARENT) salaryWagesTotal += t;
    else if (r.parent_name === OTHER_INCOME_PARENT) otherIncomeTotal += t;
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
  const byParentRows = await db`
    select
      coalesce(lp.name, 'Uncategorized') as parent_name,
      coalesce(sum(t.amount)::text, '0') as total
    from transactions t
    left join categories lp
      on lp.id = t.parent_category_id and lp.user_id = ${userId}
    where t.user_id = ${userId} and t.type = 'INCOME'
    group by t.parent_category_id, lp.name
  `;

  let totalIncome = 0;
  let salaryWagesTotal = 0;
  let otherIncomeTotal = 0;
  const lifetimeByParent = (
    byParentRows as unknown as { parent_name: string; total: string }[]
  )
    .map((r) => {
      const t = num(r.total);
      totalIncome += t;
      const name = r.parent_name ?? "Uncategorized";
      if (name === SALARY_WAGES_PARENT) salaryWagesTotal += t;
      else if (name === OTHER_INCOME_PARENT) otherIncomeTotal += t;
      return { parentName: name, total: t };
    })
    .sort((a, b) => b.total - a.total);

  const leafRows = await db`
    select
      coalesce(par.name, 'Uncategorized') as parent_name,
      coalesce(leaf.name, 'Uncategorized') as leaf_name,
      coalesce(sum(t.amount)::text, '0') as total
    from transactions t
    left join categories leaf on leaf.id = t.category_id and leaf.user_id = ${userId}
    left join categories par on par.id = t.parent_category_id and par.user_id = ${userId}
    where t.user_id = ${userId} and t.type = 'INCOME'
    group by t.parent_category_id, par.name, t.category_id, leaf.name
  `;

  const lifetimeByLeaf = (
    leafRows as unknown as { parent_name: string; leaf_name: string; total: string }[]
  )
    .map((r) => ({
      parentName: r.parent_name ?? "Uncategorized",
      leafName: r.leaf_name ?? "Uncategorized",
      total: num(r.total),
    }))
    .sort((a, b) => b.total - a.total);

  const [famRow] = await db`
    select coalesce(sum(t.amount)::text, '0') as total
    from transactions t
    inner join categories fam_leaf on fam_leaf.id = t.category_id and fam_leaf.user_id = ${userId}
    inner join categories fam_par on fam_leaf.parent_id = fam_par.id and fam_par.user_id = ${userId}
    where t.user_id = ${userId}
      and t.type = 'INCOME'
      and fam_par.name = ${OTHER_INCOME_PARENT}
      and fam_leaf.name = ${FAMILY_SUPPORT_LEAF}
  `;

  const employerRaw = await db`
    select
      coalesce(co.name, 'Unspecified') as company_name,
      coalesce(sum(t.amount)::text, '0') as total
    from transactions t
    inner join categories sal_par
      on sal_par.id = t.parent_category_id
      and sal_par.user_id = ${userId}
      and sal_par.name = ${SALARY_WAGES_PARENT}
    left join companies co on co.id = t.company_id and co.user_id = ${userId}
    where t.user_id = ${userId} and t.type = 'INCOME'
    group by t.company_id, co.name
  `;

  const employerRows = (
    employerRaw as unknown as { company_name: string; total: string }[]
  )
    .map((r) => ({
      companyName: r.company_name ?? "Unspecified",
      total: num(r.total),
    }))
    .sort((a, b) => b.total - a.total);

  return {
    totalIncome,
    salaryWagesTotal,
    otherIncomeTotal,
    lifetimeByParent,
    lifetimeByLeaf,
    lifetimeFamilySupportTotal: num(
      (famRow as { total: string } | undefined)?.total,
    ),
    lifetimeSalaryByEmployer: employerRows,
  };
}

async function fetchSalaryEmployerMonthlyCells(
  db: Db,
  userId: string,
): Promise<SalaryEmployerMonthlyCell[]> {
  const rows = await db`
    select
      to_char(t.transaction_date, 'YYYY-MM') as ym,
      coalesce(co.name, 'Unspecified') as company_name,
      coalesce(sum(t.amount)::text, '0') as total
    from transactions t
    inner join categories sal_par
      on sal_par.id = t.parent_category_id
      and sal_par.user_id = ${userId}
      and sal_par.name = ${SALARY_WAGES_PARENT}
    left join companies co on co.id = t.company_id and co.user_id = ${userId}
    where t.user_id = ${userId} and t.type = 'INCOME'
    group by to_char(t.transaction_date, 'YYYY-MM'), t.company_id, co.name
    order by 1
  `;

  return (rows as unknown as { ym: string; company_name: string; total: string }[]).map(
    (r) => ({
      ym: r.ym,
      companyName: r.company_name ?? "Unspecified",
      total: num(r.total),
    }),
  );
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

  const byParentRaw = await db`
    select
      coalesce(p.name, 'Uncategorized') as parent_name,
      coalesce(sum(t.amount)::text, '0') as total
    from transactions t
    left join categories p on p.id = t.parent_category_id and p.user_id = ${userId}
    where t.user_id = ${userId}
      and t.type = 'INCOME'
      and t.transaction_date >= ${thisRange.from}
      and t.transaction_date <= ${thisRange.to}
    group by t.parent_category_id, p.name
  `;

  const byParentThisMonth = (
    byParentRaw as unknown as { parent_name: string; total: string }[]
  )
    .map((r) => ({
      parentName: r.parent_name ?? "Uncategorized",
      total: num(r.total),
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
      and t.type = 'INCOME'
      and t.transaction_date >= ${thisRange.from}
      and t.transaction_date <= ${thisRange.to}
    group by t.parent_category_id, p.name, t.category_id, l.name
  `;

  const byLeafThisMonth = (
    byLeafRaw as unknown as { parent_name: string; leaf_name: string; total: string }[]
  )
    .map((r) => ({
      parentName: r.parent_name ?? "Uncategorized",
      leafName: r.leaf_name ?? "Uncategorized",
      total: num(r.total),
    }))
    .sort((a, b) => b.total - a.total);

  const thisTotals = await monthIncomeTotals(db, userId, thisRange.from, thisRange.to);
  const lastTotals = await monthIncomeTotals(db, userId, lastRange.from, lastRange.to);

  const lookbackStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const lookbackFrom = formatLocalYMD(lookbackStart);

  const salaryRows = await db`
    select
      to_char(t.transaction_date, 'YYYY-MM') as ym,
      coalesce(sum(t.amount)::text, '0') as total
    from transactions t
    inner join categories sp
      on sp.id = t.parent_category_id
      and sp.user_id = ${userId}
      and sp.name = ${SALARY_WAGES_PARENT}
    where t.user_id = ${userId}
      and t.type = 'INCOME'
      and t.transaction_date >= ${lookbackFrom}
      and t.transaction_date <= ${thisRange.to}
    group by to_char(t.transaction_date, 'YYYY-MM')
    order by 1
  `;

  const salaryWagesMonthly = (salaryRows as unknown as { ym: string; total: string }[]).map(
    (r) => ({
      ym: r.ym,
      total: num(r.total),
    }),
  );

  const otherIncomeRows = await db`
    select
      to_char(t.transaction_date, 'YYYY-MM') as ym,
      coalesce(sum(t.amount)::text, '0') as total
    from transactions t
    inner join categories op
      on op.id = t.parent_category_id
      and op.user_id = ${userId}
      and op.name = ${OTHER_INCOME_PARENT}
    where t.user_id = ${userId}
      and t.type = 'INCOME'
      and t.transaction_date >= ${lookbackFrom}
      and t.transaction_date <= ${thisRange.to}
    group by to_char(t.transaction_date, 'YYYY-MM')
    order by 1
  `;

  const otherIncomeMonthly = (otherIncomeRows as unknown as { ym: string; total: string }[]
  ).map((r) => ({
    ym: r.ym,
    total: num(r.total),
  }));

  const projection = computeSalaryProjection(salaryWagesMonthly, now);

  const salaryTxLines = await db`
    select t.transaction_date::text as transaction_date, t.amount::text as amount
    from transactions t
    inner join categories sp2
      on sp2.id = t.parent_category_id
      and sp2.user_id = ${userId}
      and sp2.name = ${SALARY_WAGES_PARENT}
    where t.user_id = ${userId}
      and t.type = 'INCOME'
      and t.transaction_date >= ${lookbackFrom}
      and t.transaction_date <= ${thisRange.to}
  `;

  const spendMap = new Map<string, number>();
  for (const line of salaryTxLines as unknown as {
    transaction_date: string;
    amount: string;
  }[]) {
    const ym = spendMonthYmForSalaryCredit(String(line.transaction_date));
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
