import { z } from "zod";
import type postgres from "postgres";

import type { Db } from "../client";
import type { CategoryRow, TransactionType } from "../schema";

/**
 * UUID for seeded default admin (`users.id`) and system category template
 * (`categories.user_id`). Env: `SEED_ADMIN_USER_ID`.
 *
 * When unset, runtime bootstrap uses the static tree in `CATEGORY_SEED_WITH_CHILDREN` instead of cloning
 * from a template user (so production works without this env). CLI `db:seed` still requires {@link seedUserId}.
 */
export function resolveSeedUserId(): string | null {
  const raw = process.env.SEED_ADMIN_USER_ID?.trim();
  if (!raw) return null;
  const parsed = z.string().uuid().safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function seedUserId(): string {
  const id = resolveSeedUserId();
  if (id) return id;
  const raw = process.env.SEED_ADMIN_USER_ID?.trim();
  if (!raw) {
    throw new Error("Set SEED_ADMIN_USER_ID to a UUID (seeded admin id).");
  }
  throw new Error(`SEED_ADMIN_USER_ID must be a valid UUID, got: ${JSON.stringify(raw)}`);
}

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

const CATEGORY_BOOTSTRAP_LOCK_NS = 0x63_61_74_31;
const CATEGORY_CHILD_SYNC_LOCK_NS = 0x63_61_74_32;

type Tx = postgres.TransactionSql<Record<string, never>>;

/** Inserts the full default category tree for `userId` (same shape as CLI system seed). */
export async function insertCategorySeedTreeForUserTx(
  tx: Tx,
  userId: string,
): Promise<void> {
  for (let i = 0; i < CATEGORY_SEED_WITH_CHILDREN.length; i++) {
    const p = CATEGORY_SEED_WITH_CHILDREN[i]!;
    const [parent] = await tx`
      insert into categories ${tx({
        user_id: userId,
        name: p.name,
        parent_id: null,
        type: p.type,
        is_selectable: false,
        sort_order: i,
      })}
      returning id
    `;
    if (!parent) continue;

    const pid = (parent as { id: string }).id;
    if (p.children.length > 0) {
      for (const c of p.children) {
        await tx`
          insert into categories ${tx({
            user_id: userId,
            name: c.name,
            parent_id: pid,
            type: p.type,
            is_selectable: true,
            sort_order: c.sortOrder,
          })}
        `;
      }
    }
  }
}

/**
 * Ensures every child from `CATEGORY_SEED_WITH_CHILDREN` exists under its parent
 * (matched by user, type, parent name, root). Idempotent; safe on each login.
 */
export async function ensureCategorySeedChildrenForUser(
  db: Db,
  userId: string,
): Promise<void> {
  await db.begin(async (tx) => {
    await tx`
      select pg_advisory_xact_lock(${CATEGORY_CHILD_SYNC_LOCK_NS}, hashtext(${userId}::text))
    `;

    for (const parent of CATEGORY_SEED_WITH_CHILDREN) {
      const [pRow] = await tx`
        select id from categories
        where user_id = ${userId}
          and type = ${parent.type}
          and name = ${parent.name}
          and parent_id is null
        limit 1
      `;
      if (!pRow) continue;
      const pid = (pRow as { id: string }).id;

      for (const child of parent.children) {
        const [existing] = await tx`
          select id from categories
          where user_id = ${userId}
            and parent_id = ${pid}
            and name = ${child.name}
          limit 1
        `;
        if (existing) continue;

        await tx`
          insert into categories ${tx({
            user_id: userId,
            name: child.name,
            parent_id: pid,
            type: parent.type,
            is_selectable: true,
            sort_order: child.sortOrder,
          })}
        `;
      }
    }
  });
}

function mapCategoryRow(r: Record<string, unknown>): CategoryRow {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    name: String(r.name),
    parentId: r.parent_id == null ? null : String(r.parent_id),
    type: r.type as TransactionType,
    isSelectable: Boolean(r.is_selectable),
    sortOrder: Number(r.sort_order),
  };
}

/** Clone default category rows for a new user when they have none yet. */
export async function ensureDefaultReferenceDataForUser(
  db: Db,
  userId: string,
): Promise<void> {
  await db.begin(async (tx) => {
    await tx`
      select pg_advisory_xact_lock(${CATEGORY_BOOTSTRAP_LOCK_NS}, hashtext(${userId}::text))
    `;

    const [existing] = await tx`
      select id from categories where user_id = ${userId} limit 1
    `;
    if (existing) return;

    const templateOwnerId = resolveSeedUserId();
    const template =
      templateOwnerId === null
        ? []
        : ((await tx`
            select id, user_id, name, parent_id, type, is_selectable, sort_order
            from categories
            where user_id = ${templateOwnerId}
          `) as Record<string, unknown>[]);

    if (template.length > 0) {
      const rows = template.map(mapCategoryRow);
      const roots = rows.filter((c) => c.parentId === null);
      const ordered: CategoryRow[] = [];
      const queue = [...roots];
      const seen = new Set<string>();
      while (queue.length > 0) {
        const c = queue.shift()!;
        if (seen.has(c.id)) continue;
        seen.add(c.id);
        ordered.push(c);
        for (const row of rows) {
          if (row.parentId === c.id) queue.push(row);
        }
      }
      for (const c of rows) {
        if (!seen.has(c.id)) ordered.push(c);
      }

      const idMap = new Map<string, string>();
      for (const c of ordered) {
        const newParentId = c.parentId ? (idMap.get(c.parentId) ?? null) : null;
        const [inserted] = await tx`
          insert into categories ${tx({
            user_id: userId,
            name: c.name,
            parent_id: newParentId,
            type: c.type,
            is_selectable: c.isSelectable,
            sort_order: c.sortOrder,
          })}
          returning id
        `;
        if (inserted) idMap.set(c.id, (inserted as { id: string }).id);
      }
    } else {
      await insertCategorySeedTreeForUserTx(tx, userId);
    }
  });

  await ensureCategorySeedChildrenForUser(db, userId);
}
