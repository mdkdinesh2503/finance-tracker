import "dotenv/config";
import { db } from "./client";
import { categories } from "./schema";

async function main() {
  // Seed global categories (shared across users)
  const existing = await db.select({ id: categories.id }).from(categories).limit(1);
  if (existing.length > 0) {
    console.log("Seed: categories already exist, skipping");
    return;
  }

  await db.insert(categories).values([
    { name: "Food", type: "EXPENSE", isSelectable: true, parentId: null, userId: "00000000-0000-0000-0000-000000000000" },
    { name: "Transport", type: "EXPENSE", isSelectable: true, parentId: null, userId: "00000000-0000-0000-0000-000000000000" },
    { name: "Rent", type: "EXPENSE", isSelectable: true, parentId: null, userId: "00000000-0000-0000-0000-000000000000" },
    { name: "Utilities", type: "EXPENSE", isSelectable: true, parentId: null, userId: "00000000-0000-0000-0000-000000000000" },
    { name: "Shopping", type: "EXPENSE", isSelectable: true, parentId: null, userId: "00000000-0000-0000-0000-000000000000" },
    { name: "Health", type: "EXPENSE", isSelectable: true, parentId: null, userId: "00000000-0000-0000-0000-000000000000" },
    { name: "Entertainment", type: "EXPENSE", isSelectable: true, parentId: null, userId: "00000000-0000-0000-0000-000000000000" },
    { name: "Salary", type: "INCOME", isSelectable: true, parentId: null, userId: "00000000-0000-0000-0000-000000000000" },
    { name: "Interest", type: "INCOME", isSelectable: true, parentId: null, userId: "00000000-0000-0000-0000-000000000000" },
  ]);

  console.log("Seed: done");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

