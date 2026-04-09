import "server-only";

import { eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import {
  CATEGORY_BOOTSTRAP_LOCK_NS,
  SYSTEM_CATEGORIES_USER_ID,
} from "./constants";
import * as schema from "./schema";
import { categories } from "./schema";

export { SYSTEM_CATEGORIES_USER_ID } from "./constants";

type Db = PostgresJsDatabase<typeof schema>;

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

    const template = await tx
      .select()
      .from(categories)
      .where(eq(categories.userId, SYSTEM_CATEGORIES_USER_ID));
    if (template.length === 0) return;

    await tx.insert(categories).values(
      template.map((c) => ({
        userId,
        name: c.name,
        parentId: null,
        type: c.type,
        isSelectable: c.isSelectable,
        sortOrder: c.sortOrder,
      })),
    );
  });
}
