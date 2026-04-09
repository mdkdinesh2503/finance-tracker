import type { TransactionType } from "@/lib/db/schema";

export type TransactionRowDTO = {
  id: string;
  type: TransactionType;
  amount: string;
  categoryId: string | null;
  parentCategoryId: string | null;
  locationId: string | null;
  contactId: string | null;
  note: string | null;
  transactionDate: string;
  transactionTime: string;
  categoryName: string | null;
  parentCategoryName: string | null;
  locationName: string | null;
  contactName: string | null;
};

export type CreateTransactionInput = {
  amount: string;
  categoryId: string;
  locationId: string;
  contactId?: string;
  transactionDate: string;
  transactionTime: string;
  note?: string;
};

/** Aggregates for a single calendar month (income, expense, etc.). */
export type DashboardMonthSlice = {
  income: number;
  expense: number;
  investment: number;
  borrowed: number;
  repaid: number;
  lent: number;
  received: number;
};

/** Row for the dashboard “Recent activity” list. */
export type DashboardRecentRow = {
  id: string;
  type: TransactionType;
  amount: number;
  title: string;
  transactionDate: string;
  transactionTime: string;
  locationName: string | null;
};

/** Full dashboard: monthly slices, cumulative metrics, trend chart, recent list. */
export type DashboardPayload = {
  thisMonth: DashboardMonthSlice;
  cumulativeBalance: number;
  cumulativePendingLiability: number;
  cumulativePendingReceivable: number;
  /** Last N calendar months, expense only; missing months are zero. */
  monthlyExpenseTrend: { month: string; expense: number }[];
  recentActivity: DashboardRecentRow[];
};

export type SuggestionDTO = {
  categoryId: string | null;
  amount: string | null;
  locationId: string | null;
};
