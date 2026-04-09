import "dotenv/config";
import { eq } from "drizzle-orm";

import { closeDatabaseConnection, db } from "./client";
import { SYSTEM_CATEGORIES_USER_ID } from "./constants";
import { categories } from "./schema";

async function main() {
  const templateExists = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.userId, SYSTEM_CATEGORIES_USER_ID))
    .limit(1);
  if (templateExists.length > 0) {
    console.log("Seed: system category template already exists, skipping");
    return;
  }

  await db.insert(categories).values([
    { name: "Essential Housing & Utilities", type: "EXPENSE", isSelectable: true, parentId: null, userId: SYSTEM_CATEGORIES_USER_ID, sortOrder: 0 },
    { name: "Food & Dining", type: "EXPENSE", isSelectable: true, parentId: null, userId: SYSTEM_CATEGORIES_USER_ID, sortOrder: 1 },
    { name: "Shopping & Lifestyle", type: "EXPENSE", isSelectable: true, parentId: null, userId: SYSTEM_CATEGORIES_USER_ID, sortOrder: 2 },
    { name: "Transport", type: "EXPENSE", isSelectable: true, parentId: null, userId: SYSTEM_CATEGORIES_USER_ID, sortOrder: 3 },
    { name: "Health & Wellness", type: "EXPENSE", isSelectable: true, parentId: null, userId: SYSTEM_CATEGORIES_USER_ID, sortOrder: 4 },
    { name: "Subscriptions & Entertainment", type: "EXPENSE", isSelectable: true, parentId: null, userId: SYSTEM_CATEGORIES_USER_ID, sortOrder: 5 },
    { name: "Gifts & Occasions", type: "EXPENSE", isSelectable: true, parentId: null, userId: SYSTEM_CATEGORIES_USER_ID, sortOrder: 6 },
    { name: "Miscellaneous", type: "EXPENSE", isSelectable: true, parentId: null, userId: SYSTEM_CATEGORIES_USER_ID, sortOrder: 7 },
    { name: "Financial & Obligations", type: "INVESTMENT", isSelectable: true, parentId: null, userId: SYSTEM_CATEGORIES_USER_ID, sortOrder: 8 },
    { name: "Cash Savings", type: "INVESTMENT", isSelectable: true, parentId: null, userId: SYSTEM_CATEGORIES_USER_ID, sortOrder: 9 },
    { name: "Salary & Wages", type: "INCOME", isSelectable: true, parentId: null, userId: SYSTEM_CATEGORIES_USER_ID, sortOrder: 10 },
    { name: "Other Income", type: "INCOME", isSelectable: true, parentId: null, userId: SYSTEM_CATEGORIES_USER_ID, sortOrder: 11 },
    { name: "Friends & Family Loan", type: "LEND", isSelectable: true, parentId: null, userId: SYSTEM_CATEGORIES_USER_ID, sortOrder: 12 },
    { name: "Loan Recovery", type: "RECEIVE", isSelectable: true, parentId: null, userId: SYSTEM_CATEGORIES_USER_ID, sortOrder: 13 },
    { name: "Personal Borrowing", type: "BORROW", isSelectable: true, parentId: null, userId: SYSTEM_CATEGORIES_USER_ID, sortOrder: 14 },
    { name: "Debt Settlement", type: "REPAYMENT", isSelectable: true, parentId: null, userId: SYSTEM_CATEGORIES_USER_ID, sortOrder: 15 },
  ]);

  console.log("Seed: done");
}

main()
  .then(async () => {
    await closeDatabaseConnection();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await closeDatabaseConnection().catch(() => {});
    process.exit(1);
  });

