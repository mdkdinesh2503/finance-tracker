export type IncomeParentBreakdownRow = {
  parentName: string;
  total: number;
};

export type IncomeLeafBreakdownRow = {
  parentName: string;
  leafName: string;
  total: number;
};

export type SalaryHistoryRow = {
  ym: string;
  total: number;
};

export type IncomeMonthSummary = {
  label: string;
  from: string;
  to: string;
  totalIncome: number;
  salaryWagesTotal: number;
  otherIncomeParentTotal: number;
};

export type IncomeSalaryProjection = {
  /** Based on last completed months only (excludes current partial month). */
  completedMonthsUsed: number;
  averageMoMChangePercent: number | null;
  /** Naive forecast: last completed month × (1 + avg MoM). Null if not enough history. */
  projectedNextMonthSalary: number | null;
  lastCompletedMonthYm: string | null;
  lastCompletedMonthSalary: number;
};

export type IncomeSalaryEmployerRow = {
  companyName: string;
  total: number;
};

/** One cell: salary credited in a calendar month for one employer. */
export type SalaryEmployerMonthlyCell = {
  ym: string;
  companyName: string;
  total: number;
};

/** Per-employer timeline and first detected month-over-month increase (e.g. 12,580 → 29,800). */
export type EmployerSalaryInsight = {
  companyName: string;
  monthly: SalaryHistoryRow[];
  firstMonthYm: string | null;
  firstAmount: number;
  /** First month where this employer’s monthly total exceeded the prior month. */
  stepUpMonthYm: string | null;
  amountBeforeStepUp: number;
  amountAfterStepUp: number;
};

/** When take-home lands on the last calendar day of month M, attribute it to spend month M+1 (local calendar). */
export type IncomeSalaryRaiseInsight = {
  firstSalaryMonthYm: string | null;
  firstSalaryAmount: number;
  latestSalaryMonthYm: string | null;
  latestSalaryAmount: number;
  totalGrowthFromFirstToLatest: number;
  pctGrowthFromFirstToLatest: number | null;
  /** First calendar month where Salary & Wages exceeded the prior month (MoM increase). */
  firstMomIncreaseYm: string | null;
  amountBeforeFirstIncrease: number;
  amountAfterFirstIncrease: number;
};

export type IncomeAnalyticsScope = "salary" | "other";

export type IncomeAnalyticsSnapshot = {
  scope: IncomeAnalyticsScope;
  thisMonth: IncomeMonthSummary;
  lastMonth: IncomeMonthSummary;
  /** This month: income grouped by parent category (Salary & Wages, Other Income, …). */
  byParentThisMonth: IncomeParentBreakdownRow[];
  /** This month: leaf totals with parent context. */
  byLeafThisMonth: IncomeLeafBreakdownRow[];
  /** Last ~12 months of Salary & Wages only (for chart / trend). */
  salaryWagesMonthly: SalaryHistoryRow[];
  /**
   * Same window as salaryWagesMonthly, but paychecks dated on the **last day** of a month
   * are counted toward the **following** month (budget / spend month).
   */
  salaryWagesSpendAlignedMonthly: SalaryHistoryRow[];
  /** Last ~12 months of Other Income parent (for other-income page chart). */
  otherIncomeMonthly: SalaryHistoryRow[];
  projection: IncomeSalaryProjection;
  raiseInsight: IncomeSalaryRaiseInsight;
  /** All-time INCOME totals. */
  lifetimeTotalIncome: number;
  lifetimeSalaryWagesTotal: number;
  lifetimeOtherIncomeParentTotal: number;
  /** Other Income · Family Support leaf (non-repayable family cash). */
  lifetimeFamilySupportTotal: number;
  lifetimeByParent: IncomeParentBreakdownRow[];
  lifetimeByLeaf: IncomeLeafBreakdownRow[];
  /** Salary & Wages only, grouped by employer (company). */
  lifetimeSalaryByEmployer: IncomeSalaryEmployerRow[];
  /** All-time Salary & Wages, per month per employer (for multi-line chart). Salary scope only. */
  salaryEmployerMonthlyCells: SalaryEmployerMonthlyCell[];
  /** Derived per-employer series + step-up detection. Salary scope only. */
  employerSalaryInsights: EmployerSalaryInsight[];
};
