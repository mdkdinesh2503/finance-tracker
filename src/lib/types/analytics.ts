/** Chart-ready rows produced by server analytics actions. */
export type MonthlyTrendPoint = {
  key: string;
  income: number;
  expense: number;
  investment: number;
};

export type BreakdownRow = { name: string; total: number };
