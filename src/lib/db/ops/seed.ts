import "dotenv/config";
import { hash } from "@node-rs/argon2";

import { closeDatabaseConnection, db } from "../client";
import {
  ensureCategorySeedChildrenForUser,
  ensureDefaultReferenceDataForUser,
  insertCategorySeedTreeForUserTx,
  seedUserId,
} from "./ensure-user-categories";

async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
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

const DEFAULT_LOCATIONS = ["Home", "Hyderabad", "Bangalore", "Chennai", "General"] as const;

const DEFAULT_CONTACTS = ["Jainam", "Meiyarasan", "Likhith", "Appa", "Sajun", "Mayu", "Nandhini", "Naren Mamz"] as const;

const DEFAULT_COMPANIES = ["Aretedge", "Family"] as const;

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
