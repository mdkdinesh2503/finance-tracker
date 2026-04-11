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
};
