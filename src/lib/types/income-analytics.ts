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

export type IncomeAnalyticsSnapshot = {
  thisMonth: IncomeMonthSummary;
  lastMonth: IncomeMonthSummary;
  /** This month: income grouped by parent category (Salary & Wages, Other Income, …). */
  byParentThisMonth: IncomeParentBreakdownRow[];
  /** This month: leaf totals with parent context. */
  byLeafThisMonth: IncomeLeafBreakdownRow[];
  /** Last ~12 months of Salary & Wages only (for chart / trend). */
  salaryWagesMonthly: SalaryHistoryRow[];
  projection: IncomeSalaryProjection;
};
