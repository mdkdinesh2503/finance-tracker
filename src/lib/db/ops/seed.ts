import "dotenv/config";
import { hash } from "@node-rs/argon2";

import { closeDatabaseConnection, db } from "../core/client";
import {
  ensureCategorySeedChildrenForUser,
  ensureDefaultReferenceDataForUser,
  insertCategorySeedTreeForUserTx,
} from "./categories-bootstrap";
import {
  DEFAULT_COMPANIES,
  DEFAULT_CONTACTS,
  DEFAULT_LOCATIONS,
} from "@/lib/constants/reference-data";
import { seedUserId } from "../core/seed-user";

async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

async function ensureQuickEntryRulesForUser(
  userId: string,
): Promise<void> {
  async function getContactIdByName(name: string): Promise<string | null> {
    const [row] = await db`
      select id from contacts
      where user_id = ${userId} and lower(name) = lower(${name})
      limit 1
    `;
    return row ? (row as { id: string }).id : null;
  }

  async function getLocationIdByName(name: string): Promise<string | null> {
    const [row] = await db`
      select id from locations
      where user_id = ${userId} and lower(name) = lower(${name})
      limit 1
    `;
    return row ? (row as { id: string }).id : null;
  }

  async function getChildCategoryIdByNames(args: {
    type: string;
    parentName: string;
    childName: string;
  }): Promise<string | null> {
    const [row] = await db`
      select c.id as id
      from categories p
      join categories c on c.parent_id = p.id
      where p.user_id = ${userId}
        and c.user_id = ${userId}
        and p.parent_id is null
        and p.type = ${args.type}
        and c.type = ${args.type}
        and lower(p.name) = lower(${args.parentName})
        and lower(c.name) = lower(${args.childName})
      limit 1
    `;
    return row ? (row as { id: string }).id : null;
  }

  async function ensureRule(rule: {
    keyword: string;
    note: string | null;
    categoryId: string;
    locationId: string;
    contactId?: string | null;
  }): Promise<void> {
    const kw = rule.keyword.trim().toLowerCase();
    if (!kw) return;
    const [existing] = await db`
      select id from rules
      where user_id = ${userId}
        and keyword = ${kw}
      limit 1
    `;
    if (existing) return;

    await db`
      insert into rules ${db({
        user_id: userId,
        keyword: kw,
        note: rule.note,
        category_id: rule.categoryId,
        location_id: rule.locationId,
        contact_id: rule.contactId ?? null,
      })}
    `;
  }

  const hyderabadId = await getLocationIdByName("Hyderabad");
  if (!hyderabadId) return;

  const dmartId = await getChildCategoryIdByNames({
    type: "EXPENSE",
    parentName: "Shopping & Lifestyle",
    childName: "Household Items",
  });
  const rapidoId = await getChildCategoryIdByNames({
    type: "EXPENSE",
    parentName: "Transport",
    childName: "Local Travel",
  });
  const rechargeId = await getChildCategoryIdByNames({
    type: "EXPENSE",
    parentName: "Essential Housing & Utilities",
    childName: "Mobile Recharge",
  });
  const snacksId = await getChildCategoryIdByNames({
    type: "EXPENSE",
    parentName: "Food & Dining",
    childName: "Snacks",
  });
  const foodId = await getChildCategoryIdByNames({
    type: "EXPENSE",
    parentName: "Food & Dining",
    childName: "Eating Out",
  });
  const haircutId = await getChildCategoryIdByNames({
    type: "EXPENSE",
    parentName: "Health & Wellness",
    childName: "Personal Care",
  });
  const laundryId = await getChildCategoryIdByNames({
    type: "EXPENSE",
    parentName: "Health & Wellness",
    childName: "Laundry & Cleaning",
  });
  const bathkitId = await getChildCategoryIdByNames({
    type: "EXPENSE",
    parentName: "Health & Wellness",
    childName: "Personal Care",
  });
  const subscriptionId = await getChildCategoryIdByNames({
    type: "EXPENSE",
    parentName: "Subscriptions & Entertainment",
    childName: "Software Subscriptions",
  });
  const ottSubscriptionId = await getChildCategoryIdByNames({
    type: "EXPENSE",
    parentName: "Subscriptions & Entertainment",
    childName: "OTT Subscriptions",
  });

  const chitId = await getChildCategoryIdByNames({
    type: "INVESTMENT",
    parentName: "Cash Savings",
    childName: "Chit Fund",
  });
  const pfId = await getChildCategoryIdByNames({
    type: "INVESTMENT",
    parentName: "Cash Savings",
    childName: "Partial Fund (PF)",
  });
  const rdId = await getChildCategoryIdByNames({
    type: "INVESTMENT",
    parentName: "Financial & Obligations",
    childName: "Recurring Deposit (RD)",
  });

  const borrowId = await getChildCategoryIdByNames({
    type: "BORROW",
    parentName: "Personal Borrowing",
    childName: "Borrow from Friend",
  });
  const repaymentId = await getChildCategoryIdByNames({
    type: "REPAYMENT",
    parentName: "Debt Settlement",
    childName: "Full Repayment",
  });
  const lendId = await getChildCategoryIdByNames({
    type: "LEND",
    parentName: "Friends & Family Loan",
    childName: "Loan to Friend",
  });
  const receiveId = await getChildCategoryIdByNames({
    type: "RECEIVE",
    parentName: "Loan Recovery",
    childName: "Full Loan Recovery",
  });

  const meiyarasanId = await getContactIdByName("Meiyarasan");
  const likhithId = await getContactIdByName("Likhith");
  const myselfId = await getContactIdByName("Myself");

  // If the user customized categories heavily, some lookups may fail; seed what we can.
  if (dmartId) {
    await ensureRule({
      keyword: "dmart",
      note: "Dmart",
      categoryId: dmartId,
      locationId: hyderabadId,
    });
  }
  if (rapidoId) {
    await ensureRule({
      keyword: "rapido",
      note: "Rapido",
      categoryId: rapidoId,
      locationId: hyderabadId,
    });
  }
  if (rechargeId) {
    await ensureRule({
      keyword: "recharge",
      note: "Samsung S24 (Airtel)",
      categoryId: rechargeId,
      locationId: hyderabadId,
      contactId: myselfId ?? null,
    });
  }
  if (snacksId) {
    await ensureRule({
      keyword: "snacks",
      note: "Snacks",
      categoryId: snacksId,
      locationId: hyderabadId,
    });
  }
  if (foodId) {
    await ensureRule({
      keyword: "food",
      note: "Food",
      categoryId: foodId,
      locationId: hyderabadId,
    });
  }
  if (haircutId) {
    await ensureRule({
      keyword: "haircut",
      note: "Hair cut",
      categoryId: haircutId,
      locationId: hyderabadId,
    });
  }
  if (laundryId) {
    await ensureRule({
      keyword: "laundry",
      note: "Dhobi Time",
      categoryId: laundryId,
      locationId: hyderabadId,
    });
  }
  if (bathkitId) {
    await ensureRule({
      keyword: "bathkit",
      note: "Bath kit",
      categoryId: bathkitId,
      locationId: hyderabadId,
    });
  }
  if (subscriptionId) {
    await ensureRule({
      keyword: "cursor",
      note: "Cursor IDE Pro",
      categoryId: subscriptionId,
      locationId: hyderabadId,
    });
  }
  if (ottSubscriptionId) {
    await ensureRule({
      keyword: "ott",
      note: "OTT Subscription",
      categoryId: ottSubscriptionId,
      locationId: hyderabadId,
    });
  }
  if (chitId) {
    await ensureRule({
      keyword: "chit",
      note: "Family Chit",
      categoryId: chitId,
      locationId: hyderabadId,
    });
  }
  if (pfId) {
    await ensureRule({
      keyword: "pf",
      note: "Partial Fund (PF)",
      categoryId: pfId,
      locationId: hyderabadId,
    });
  }
  if (rdId) {
    await ensureRule({
      keyword: "rd",
      note: "Recurring Deposit (RD)",
      categoryId: rdId,
      locationId: hyderabadId,
    });
  }

  if (borrowId && meiyarasanId) {
    await ensureRule({
      keyword: "borrow",
      note: "Lack of Money",
      categoryId: borrowId,
      locationId: hyderabadId,
      contactId: meiyarasanId,
    });
  }
  if (repaymentId && meiyarasanId) {
    await ensureRule({
      keyword: "repayment",
      note: "Resettled the Money",
      categoryId: repaymentId,
      locationId: hyderabadId,
      contactId: meiyarasanId,
    });
  }
  if (lendId && likhithId) {
    await ensureRule({
      keyword: "lend",
      note: "Lent the Money",
      categoryId: lendId,
      locationId: hyderabadId,
      contactId: likhithId,
    });
  }
  if (receiveId && likhithId) {
    await ensureRule({
      keyword: "receive",
      note: "Received the Money",
      categoryId: receiveId,
      locationId: hyderabadId,
      contactId: likhithId,
    });
  }
}

async function seedSystemCategories(): Promise<void> {
  const templateUserId = seedUserId();
  const [templateExists] = await db`
    select id from categories where user_id = ${templateUserId} limit 1
  `;
  if (templateExists) {
    return;
  }

  await db.begin(async (tx) => {
    await insertCategorySeedTreeForUserTx(tx, templateUserId);
  });
}

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

  const [existing] = await db`
    select id from users where email = ${email} limit 1
  `;

  let userId: string;
  if (existing) {
    userId = (existing as { id: string }).id;
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
    const [created] = await db`
      insert into users ${db({ id: idFromEnv, email, password_hash: passwordHash })}
      returning id
    `;
    if (!created) throw new Error("Failed to create seed admin user");
    userId = (created as { id: string }).id;
  }

  const [cash] = await db`
    select id from accounts where user_id = ${userId} and name = 'Cash' limit 1
  `;
  if (!cash) {
    await db`
      insert into accounts ${db({ user_id: userId, name: "Cash" })}
    `;
  }

  for (const name of DEFAULT_LOCATIONS) {
    const [loc] = await db`
      select id from locations where user_id = ${userId} and name = ${name} limit 1
    `;
    if (!loc) {
      await db`
        insert into locations ${db({ user_id: userId, name })}
      `;
    }
  }

  for (const name of DEFAULT_CONTACTS) {
    const [row] = await db`
      select id from contacts where user_id = ${userId} and name = ${name} limit 1
    `;
    if (!row) {
      await db`
        insert into contacts ${db({ user_id: userId, name })}
      `;
    }
  }

  for (const name of DEFAULT_COMPANIES) {
    const [row] = await db`
      select id from companies where user_id = ${userId} and name = ${name} limit 1
    `;
    if (!row) {
      await db`
        insert into companies ${db({ user_id: userId, name })}
      `;
    }
  }

  await ensureDefaultReferenceDataForUser(db, userId);
  await ensureQuickEntryRulesForUser(userId);
}

async function main() {
  await seedSystemCategories();
  await seedAdminUserDefaults();
  await ensureCategorySeedChildrenForUser(db, seedUserId());
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
