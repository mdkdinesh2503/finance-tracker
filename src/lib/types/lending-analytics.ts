import type { TransactionType } from "@/lib/db/schema";

export type LendingContactBalanceRow = {
  contactId: string;
  contactName: string;
  borrowed: number;
  repaid: number;
  /** max(0, borrowed − repaid); multiple partial repayments sum into `repaid`. */
  youOwe: number;
  lent: number;
  received: number;
  /** max(0, lent − received). */
  theyOweYou: number;
  /** Last transaction date for BORROW/REPAYMENT for this contact (`YYYY-MM-DD`). */
  lastBorrowActivityYmd: string | null;
  /** Last transaction date for LEND/RECEIVE for this contact (`YYYY-MM-DD`). */
  lastLendActivityYmd: string | null;
};

export type LendingMonthlyTrendRow = {
  ym: string; // YYYY-MM
  deltaYouOwe: number; // borrow − repay for that month
  deltaTheyOweYou: number; // lend − receive for that month
  netDelta: number; // deltaTheyOweYou − deltaYouOwe
};

export type LendingSubcategoryRow = {
  type: TransactionType;
  categoryName: string;
  total: number;
  count: number;
};

export type LendingTotalsRow = {
  borrowed: number;
  repaid: number;
  lent: number;
  received: number;
  youOwe: number;
  theyOweYou: number;
};

export type LendingAnalyticsSnapshot = {
  totals: LendingTotalsRow;
  /** Loan activity grouped by contact (only rows with a contact). */
  byContact: LendingContactBalanceRow[];
  /** Amounts with no contact (still included in `totals`). */
  noContact: Omit<LendingContactBalanceRow, "contactId" | "contactName">;
  /** Leaf category totals per transaction type (BORROW / REPAYMENT / LEND / RECEIVE). */
  bySubcategory: LendingSubcategoryRow[];
  /** Last 12 calendar months of deltas. */
  monthlyTrend: LendingMonthlyTrendRow[];
};
