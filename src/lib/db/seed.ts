import "dotenv/config";
import { hash } from "@node-rs/argon2";
import { and, eq } from "drizzle-orm";

import { closeDatabaseConnection, db } from "./client";
import {
  ensureDefaultReferenceDataForUser,
  seedUserId,
} from "./ensure-user-categories";
import { accounts, categories, contacts, locations, users } from "./schema";

const SYSTEM_CATEGORY_SEED_DEF = [
  { name: "Essential Housing & Utilities", type: "EXPENSE" as const, isSelectable: false, parentId: null, sortOrder: 0 },
  { name: "Food & Dining", type: "EXPENSE" as const, isSelectable: false, parentId: null, sortOrder: 1 },
  { name: "Shopping & Lifestyle", type: "EXPENSE" as const, isSelectable: false, parentId: null, sortOrder: 2 },
  { name: "Transport", type: "EXPENSE" as const, isSelectable: false, parentId: null, sortOrder: 3 },
  { name: "Health & Wellness", type: "EXPENSE" as const, isSelectable: false, parentId: null, sortOrder: 4 },
  { name: "Subscriptions & Entertainment", type: "EXPENSE" as const, isSelectable: false, parentId: null, sortOrder: 5 },
  { name: "Gifts & Occasions", type: "EXPENSE" as const, isSelectable: false, parentId: null, sortOrder: 6 },
  { name: "Miscellaneous", type: "EXPENSE" as const, isSelectable: false, parentId: null, sortOrder: 7 },
  { name: "Financial & Obligations", type: "INVESTMENT" as const, isSelectable: false, parentId: null, sortOrder: 8 },
  { name: "Cash Savings", type: "INVESTMENT" as const, isSelectable: false, parentId: null, sortOrder: 9 },
  { name: "Salary & Wages", type: "INCOME" as const, isSelectable: false, parentId: null, sortOrder: 10 },
  { name: "Other Income", type: "INCOME" as const, isSelectable: false, parentId: null, sortOrder: 11 },
  { name: "Friends & Family Loan", type: "LEND" as const, isSelectable: false, parentId: null, sortOrder: 12 },
  { name: "Loan Recovery", type: "RECEIVE" as const, isSelectable: false, parentId: null, sortOrder: 13 },
  { name: "Personal Borrowing", type: "BORROW" as const, isSelectable: false, parentId: null, sortOrder: 14 },
  { name: "Debt Settlement", type: "REPAYMENT" as const, isSelectable: false, parentId: null, sortOrder: 15 },
] as const;

async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

async function seedSystemCategories(): Promise<void> {
  const templateUserId = seedUserId();
  const templateExists = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.userId, templateUserId))
    .limit(1);
  if (templateExists.length > 0) {
    return;
  }

  await db.insert(categories).values(
    SYSTEM_CATEGORY_SEED_DEF.map((row) => ({
      ...row,
      userId: templateUserId,
    })),
  );
}

const DEFAULT_LOCATIONS = ["Home", "Hyderabad", "Bangalore", "Chennai"] as const;

const DEFAULT_CONTACTS = ["Jainam", "Meiyarasan", "Likhith"] as const;

/**
 * When `SEED_ADMIN_EMAIL` is set: ensures the default admin exists with
 * `id` = `seedUserId()` (from env; same as system category rows from seed),
 * plus "Cash", starter locations, default contacts, and cloned categories if needed.
 */
async function seedAdminUserDefaults(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL?.trim();
  if (!email) {
    return;
  }

  const idFromEnv = seedUserId();

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  let userId: string;
  if (existing) {
    userId = existing.id;
    if (userId !== idFromEnv) {
      console.warn(
        `Seed: user ${email} has id ${userId}, expected SEED_ADMIN_USER_ID=${idFromEnv}. ` +
          "Use that email only for the seeded admin, or align the user id in the database.",
      );
    }
  } else {
    const password = process.env.SEED_ADMIN_PASSWORD;
    if (!password) {
      console.error(
        `Seed: no user for ${email}; set SEED_ADMIN_PASSWORD to create the admin user`,
      );
      return;
    }
    const passwordHash = await hashPassword(password);
    const [created] = await db
      .insert(users)
      .values({ id: idFromEnv, email, passwordHash })
      .returning({ id: users.id });
    if (!created) throw new Error("Failed to create seed admin user");
    userId = created.id;
  }

  const [cash] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.name, "Cash")))
    .limit(1);
  if (!cash) {
    await db.insert(accounts).values({ userId, name: "Cash" });
  }

  for (const name of DEFAULT_LOCATIONS) {
    const [loc] = await db
      .select({ id: locations.id })
      .from(locations)
      .where(and(eq(locations.userId, userId), eq(locations.name, name)))
      .limit(1);
    if (!loc) {
      await db.insert(locations).values({ userId, name });
    }
  }

  for (const name of DEFAULT_CONTACTS) {
    const [row] = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(eq(contacts.userId, userId), eq(contacts.name, name)))
      .limit(1);
    if (!row) {
      await db.insert(contacts).values({ userId, name });
    }
  }

  await ensureDefaultReferenceDataForUser(db, userId);
}

async function main() {
  await seedSystemCategories();
  await seedAdminUserDefaults();
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
