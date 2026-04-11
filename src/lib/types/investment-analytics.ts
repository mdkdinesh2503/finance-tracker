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
  allTimeTotal: number;
  thisMonth: InvestmentPeriodSummary;
  lastMonth: InvestmentPeriodSummary;
  byParentThisMonth: InvestmentParentBreakdownRow[];
  byLeafThisMonth: InvestmentLeafBreakdownRow[];
  /** Last 12 rolling months of INVESTMENT totals. */
  monthlyTotals: InvestmentMonthlyRow[];
  runRate: InvestmentRunRate;
};
