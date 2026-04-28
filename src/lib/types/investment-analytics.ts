export type InvestmentParentBreakdownRow = {
  parentName: string;
  total: number;
  shareOfPeriod: number;
};

export type InvestmentLeafBreakdownRow = {
  parentName: string;
  leafName: string;
  total: number;
  shareOfPeriod: number;
};

export type InvestmentLeafAllTimeRow = {
  parentName: string;
  leafName: string;
  total: number;
  shareOfAllTime: number;
};

export type InvestmentMonthlyRow = {
  ym: string;
  total: number;
};

export type InvestmentPeriodSummary = {
  label: string;
  from: string;
  to: string;
  total: number;
  financialObligationsTotal: number;
  cashSavingsTotal: number;
};

export type InvestmentRunRate = {
  /** Mean of last N completed calendar months (excludes current partial month). */
  averageMonthlyLastCompleted: number | null;
  monthsAveraged: number;
  /** `averageMonthlyLastCompleted * 12` when average is non-null. */
  impliedAnnualFromRecentPace: number | null;
};

export type InvestmentAnalyticsSnapshot = {
  /** Sum of INVESTMENT totals across all time (before withdrawals used for expenses). */
  allTimeGross: number;
  allTimeTotal: number;
  /** Sum of EXPENSE `investment_used_amount` across all time. */
  usedInvestmentAllTime: number;
  /** Sum of EXPENSE `investment_used_amount` in the same 12-month window as `monthlyTotals`. */
  usedInvestmentLast12Months: number;
  thisMonth: InvestmentPeriodSummary;
  lastMonth: InvestmentPeriodSummary;
  byParentThisMonth: InvestmentParentBreakdownRow[];
  byLeafThisMonth: InvestmentLeafBreakdownRow[];
  byLeafAllTime: InvestmentLeafAllTimeRow[];
  /** Last 12 rolling months of NET investment totals (`invested - used`). */
  monthlyTotals: InvestmentMonthlyRow[];
  runRate: InvestmentRunRate;
};
