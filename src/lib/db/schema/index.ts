/**
 * Database types and enums — no ORM. Table DDL lives in `src/lib/db/migrations/*.sql`.
 */

export const TRANSACTION_TYPES = [
  "EXPENSE",
  "INCOME",
  "BORROW",
  "REPAYMENT",
  "LEND",
  "RECEIVE",
  "INVESTMENT",
  "ADJUSTMENT",
] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export type UserRow = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
};

export type CategoryRow = {
  id: string;
  userId: string;
  name: string;
  parentId: string | null;
  type: TransactionType;
  isSelectable: boolean;
  sortOrder: number;
};

export type AccountRow = {
  id: string;
  userId: string;
  name: string;
};

export type LocationRow = {
  id: string;
  userId: string;
  name: string;
};

export type ContactRow = {
  id: string;
  userId: string;
  name: string;
};

export type CompanyRow = {
  id: string;
  userId: string;
  name: string;
};

export type RuleRow = {
  id: string;
  userId: string;
  keyword: string;
  note: string | null;
  categoryId: string | null;
  locationId: string | null;
  contactId: string | null;
};

export type TransactionRow = {
  id: string;
  userId: string;
  type: TransactionType;
  amount: string;
  categoryId: string | null;
  parentCategoryId: string | null;
  investmentUsedAmount?: string | null;
  investmentUsedCategoryId?: string | null;
  investmentUsedParentCategoryId?: string | null;
  locationId: string | null;
  contactId: string | null;
  companyId: string | null;
  accountId: string | null;
  note: string | null;
  transactionDate: string;
  transactionTime: string;
  createdAt: Date;
};
