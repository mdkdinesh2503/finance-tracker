import type { TransactionType } from "@/lib/db/schema";

export type CategorySeedChild = {
  name: string;
  sortOrder: number;
};

export type CategorySeedParent = {
  type: TransactionType;
  name: string;
  children: readonly CategorySeedChild[];
};

/** Default parents and linked children: used by `seed.ts` and login-time sync. */
export const CATEGORY_SEED_WITH_CHILDREN: readonly CategorySeedParent[] = [
  {
    type: "EXPENSE",
    name: "Essential Housing & Utilities",
    children: [
      { name: "Rent", sortOrder: 0 },
      { name: "Electricity Bill", sortOrder: 1 },
      { name: "Water Bill", sortOrder: 2 },
      { name: "Gas Bill", sortOrder: 3 },
      { name: "Mobile Recharge", sortOrder: 4 },
      { name: "Internet / WiFi", sortOrder: 5 },
      { name: "DTH / Cable", sortOrder: 6 },
      { name: "Home Repairs", sortOrder: 7 },
      { name: "Home Loan EMI", sortOrder: 8 },
      { name: "Advance / Deposit", sortOrder: 9 },
    ],
  },
  {
    type: "EXPENSE",
    name: "Food & Dining",
    children: [
      { name: "Groceries", sortOrder: 0 },
      { name: "Eating Out", sortOrder: 1 },
      { name: "Snacks", sortOrder: 2 },
      { name: "Treats & Parties", sortOrder: 3 },
    ],
  },
  {
    type: "EXPENSE",
    name: "Shopping & Lifestyle",
    children: [
      { name: "Clothing", sortOrder: 0 },
      { name: "Electronics & Gadgets", sortOrder: 1 },
      { name: "Household Items", sortOrder: 2 },
      { name: "Repairs & Accessories", sortOrder: 3 },
      { name: "Personal Purchases", sortOrder: 4 }
    ],
  },
  {
    type: "EXPENSE",
    name: "Transport",
    children: [
      { name: "Local Travel", sortOrder: 0 },
      { name: "Travel Outstation", sortOrder: 1 },
      { name: "Fuel", sortOrder: 2 },
      { name: "Trips & Vacations", sortOrder: 3 },
      { name: "Vehicle Maintenance", sortOrder: 4 },
      { name: "Vehicle Insurance", sortOrder: 5 },
    ],
  },
  {
    type: "EXPENSE",
    name: "Health & Wellness",
    children: [
      { name: "Personal Care", sortOrder: 0 },
      { name: "Hospital", sortOrder: 1 },
      { name: "Medicines", sortOrder: 2 },
      { name: "Laundry & Cleaning", sortOrder: 3 },
      { name: "Fitness", sortOrder: 4 },
      { name: "Health Insurance", sortOrder: 5 },
    ],
  },
  {
    type: "EXPENSE",
    name: "Subscriptions & Entertainment",
    children: [
      { name: "OTT Subscriptions", sortOrder: 0 },
      { name: "Software Subscriptions", sortOrder: 1 },
      { name: "Movies & Outings", sortOrder: 2 },
    ],
  },
  {
    type: "EXPENSE",
    name: "Gifts & Occasions",
    children: [
      { name: "Birthday Gifts", sortOrder: 0 },
      { name: "Public Festivals", sortOrder: 1 },
      { name: "Family Festivals", sortOrder: 2 },
      { name: "Personal Gifts", sortOrder: 3 },
    ],
  },
  {
    type: "EXPENSE",
    name: "Miscellaneous",
    children: [{ name: "Cash Amount", sortOrder: 0 }],
  },
  {
    type: "INVESTMENT",
    name: "Financial & Obligations",
    children: [
      { name: "Mutual Funds", sortOrder: 0 },
      { name: "Stocks", sortOrder: 1 },
      { name: "Recurring Deposit (RD)", sortOrder: 2 },
      { name: "Fixed Deposit", sortOrder: 3 },
      { name: "Taxes", sortOrder: 4 },
    ],
  },
  {
    type: "INVESTMENT",
    name: "Savings & Contributions",
    children: [
      { name: "Chit Fund", sortOrder: 0 },
      { name: "Emergency Fund", sortOrder: 1 },
      { name: "Partial Fund (PF)", sortOrder: 2 },
    ],
  },
  {
    type: "INCOME",
    name: "Salary & Wages",
    children: [
      { name: "Primary Salary", sortOrder: 0 },
      { name: "Bonus", sortOrder: 1 },
      { name: "Overtime", sortOrder: 2 },
      { name: "Freelance Income", sortOrder: 3 },
    ],
  },
  {
    type: "INCOME",
    name: "Other Income",
    children: [
      { name: "Rental Income", sortOrder: 0 },
      { name: "Cash Gifts Received", sortOrder: 1 },
      { name: "Family Support", sortOrder: 2 },
    ],
  },
  {
    type: "LEND",
    name: "Friends & Family Loan",
    children: [
      { name: "Loan to Friend", sortOrder: 0 },
      { name: "Loan to Family", sortOrder: 1 },
      { name: "Emergency Help", sortOrder: 2 },
    ],
  },
  {
    type: "RECEIVE",
    name: "Loan Recovery",
    children: [
      { name: "Full Loan Recovery", sortOrder: 0 },
      { name: "Partial Loan Recovery", sortOrder: 1 },
      { name: "Interest Received", sortOrder: 2 },
    ],
  },
  {
    type: "BORROW",
    name: "Personal Borrowing",
    children: [
      { name: "Borrow from Friend", sortOrder: 0 },
      { name: "Borrow from Family", sortOrder: 1 },
      { name: "Emergency Borrowing", sortOrder: 2 },
    ],
  },
  {
    type: "REPAYMENT",
    name: "Debt Settlement",
    children: [
      { name: "Full Repayment", sortOrder: 0 },
      { name: "Partial Repayment", sortOrder: 1 },
      { name: "Interest Payment", sortOrder: 2 },
    ],
  },
];

export const CATEGORY_BOOTSTRAP_LOCK_NS = 0x63_61_74_31;
export const CATEGORY_CHILD_SYNC_LOCK_NS = 0x63_61_74_32;

