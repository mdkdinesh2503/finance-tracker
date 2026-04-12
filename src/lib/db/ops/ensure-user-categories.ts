import { and, eq, isNull, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { z } from "zod";

import * as schema from "../schema";
import { categories } from "../schema";
import type { TransactionType } from "../schema";

/**
 * UUID for seeded default admin (`users.id`) and system category template
 * (`categories.user_id`). Env: `SEED_ADMIN_USER_ID`. Legacy: `DEFAULT_SEED_ADMIN_USER_ID`, `SEED_USER_ID`.
 *
 * When unset, runtime bootstrap uses the static tree in `CATEGORY_SEED_WITH_CHILDREN` instead of cloning
 * from a template user (so production works without this env). CLI `db:seed` still requires {@link seedUserId}.
 */
export function resolveSeedUserId(): string | null {
  const raw =
    process.env.SEED_ADMIN_USER_ID?.trim() ||
    process.env.DEFAULT_SEED_ADMIN_USER_ID?.trim() ||
    process.env.SEED_USER_ID?.trim();
  if (!raw) return null;
  const parsed = z.string().uuid().safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function seedUserId(): string {
  const id = resolveSeedUserId();
  if (id) return id;
  const raw =
    process.env.SEED_ADMIN_USER_ID?.trim() ||
    process.env.DEFAULT_SEED_ADMIN_USER_ID?.trim() ||
    process.env.SEED_USER_ID?.trim();
  if (!raw) {
    throw new Error(
      "Set SEED_ADMIN_USER_ID to a UUID (seeded admin id and category template owner).",
    );
  }
  throw new Error(
    `SEED_ADMIN_USER_ID must be a valid UUID, got: ${JSON.stringify(raw)}`,
  );
}

// --- Category tree (template seed + idempotent child sync) -----------------

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
      { name: "Home Loan EMI", sortOrder: 1 },
      { name: "Advance / Deposit", sortOrder: 2 },
      { name: "Electricity Bill", sortOrder: 3 },
      { name: "Water Bill", sortOrder: 4 },
      { name: "Gas Bill", sortOrder: 5 },
      { name: "Mobile Recharge", sortOrder: 6 },
      { name: "Internet / WiFi", sortOrder: 7 },
      { name: "DTH / Cable", sortOrder: 8 },
      { name: "Home Repairs", sortOrder: 9 },
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
      { name: "Personal Purchases", sortOrder: 4 },
      { name: "Education", sortOrder: 5 },
      { name: "Kids Items", sortOrder: 6 },
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
      { name: "Medicines", sortOrder: 0 },
      { name: "Doctor / Clinic", sortOrder: 1 },
      { name: "Hospitalization", sortOrder: 2 },
      { name: "Health Insurance", sortOrder: 3 },
      { name: "Personal Care", sortOrder: 4 },
      { name: "Fitness", sortOrder: 5 },
      { name: "Laundry & Cleaning", sortOrder: 6 },
    ],
  },
  {
    type: "EXPENSE",
    name: "Subscriptions & Entertainment",
    children: [
      { name: "OTT Subscriptions", sortOrder: 0 },
      { name: "Software Subscriptions", sortOrder: 1 },
      { name: "Movies & Outings", sortOrder: 2 },
      { name: "Events & Tourism", sortOrder: 3 },
    ],
  },
  {
    type: "EXPENSE",
    name: "Gifts & Occasions",
    children: [
      { name: "Birthday Gifts", sortOrder: 0 },
      { name: "Festival Gifts", sortOrder: 1 },
      { name: "Family Events", sortOrder: 2 },
      { name: "Personal Gifts", sortOrder: 3 },
    ],
  },
  {
    type: "EXPENSE",
    name: "Miscellaneous",
    children: [{ name: "Cash Withdrawal", sortOrder: 0 }],
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
    name: "Cash Savings",
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

// --- Runtime: clone template + sync seed children ------------------------

type Db = PostgresJsDatabase<typeof schema>;

type CategoryTx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Inserts the full default category tree for `userId` (same shape as CLI system seed). */
export async function insertCategorySeedTreeForUserTx(
  tx: CategoryTx,
  userId: string,
): Promise<void> {
  for (let i = 0; i < CATEGORY_SEED_WITH_CHILDREN.length; i++) {
    const p = CATEGORY_SEED_WITH_CHILDREN[i]!;
    const [parent] = await tx
      .insert(categories)
      .values({
        userId,
        name: p.name,
        parentId: null,
        type: p.type,
        isSelectable: false,
        sortOrder: i,
      })
      .returning({ id: categories.id });
    if (!parent) continue;

    if (p.children.length > 0) {
      await tx.insert(categories).values(
        p.children.map((c) => ({
          userId,
          name: c.name,
          parentId: parent.id,
          type: p.type,
          isSelectable: true,
          sortOrder: c.sortOrder,
        })),
      );
    }
  }
}

const CATEGORY_BOOTSTRAP_LOCK_NS = 0x63_61_74_31; // "cat1"
const CATEGORY_CHILD_SYNC_LOCK_NS = 0x63_61_74_32; // "cat2"

/**
 * Ensures every child from `CATEGORY_SEED_WITH_CHILDREN` exists under its parent
 * (matched by user, type, parent name, root). Idempotent; safe on each login.
 */
export async function ensureCategorySeedChildrenForUser(
  db: Db,
  userId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(${CATEGORY_CHILD_SYNC_LOCK_NS}, hashtext(${userId}::text))`,
    );

    for (const parent of CATEGORY_SEED_WITH_CHILDREN) {
      const [pRow] = await tx
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(
            eq(categories.userId, userId),
            eq(categories.type, parent.type),
            eq(categories.name, parent.name),
            isNull(categories.parentId),
          ),
        )
        .limit(1);
      if (!pRow) continue;

      for (const child of parent.children) {
        const [existing] = await tx
          .select({ id: categories.id })
          .from(categories)
          .where(
            and(
              eq(categories.userId, userId),
              eq(categories.parentId, pRow.id),
              eq(categories.name, child.name),
            ),
          )
          .limit(1);
        if (existing) continue;

        await tx.insert(categories).values({
          userId,
          name: child.name,
          parentId: pRow.id,
          type: parent.type,
          isSelectable: true,
          sortOrder: child.sortOrder,
        });
      }
    }
  });
}

/** Clone default category rows for a new user when they have none yet. */
export async function ensureDefaultReferenceDataForUser(
  db: Db,
  userId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(${CATEGORY_BOOTSTRAP_LOCK_NS}, hashtext(${userId}::text))`,
    );

    const existing = await tx
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.userId, userId))
      .limit(1);
    if (existing.length > 0) return;

    const templateOwnerId = resolveSeedUserId();
    const template =
      templateOwnerId === null
        ? []
        : await tx
            .select()
            .from(categories)
            .where(eq(categories.userId, templateOwnerId));

    if (template.length > 0) {
      const roots = template.filter((c) => c.parentId === null);
      const ordered: typeof template = [];
      const queue = [...roots];
      const seen = new Set<string>();
      while (queue.length > 0) {
        const c = queue.shift()!;
        if (seen.has(c.id)) continue;
        seen.add(c.id);
        ordered.push(c);
        for (const row of template) {
          if (row.parentId === c.id) queue.push(row);
        }
      }
      for (const c of template) {
        if (!seen.has(c.id)) ordered.push(c);
      }

      const idMap = new Map<string, string>();
      for (const c of ordered) {
        const newParentId = c.parentId ? idMap.get(c.parentId) ?? null : null;
        const [inserted] = await tx
          .insert(categories)
          .values({
            userId,
            name: c.name,
            parentId: newParentId,
            type: c.type,
            isSelectable: c.isSelectable,
            sortOrder: c.sortOrder,
          })
          .returning({ id: categories.id });
        if (inserted) idMap.set(c.id, inserted.id);
      }
    } else {
      await insertCategorySeedTreeForUserTx(tx, userId);
    }
  });

  await ensureCategorySeedChildrenForUser(db, userId);
}
