import { eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { z } from "zod";

import * as schema from "../schema";
import { categories } from "../schema";

/**
 * UUID for seeded default admin (`users.id`) and system category template
 * (`categories.user_id`). Env: `SEED_ADMIN_USER_ID`. Legacy: `DEFAULT_SEED_ADMIN_USER_ID`, `SEED_USER_ID`.
 */
export function seedUserId(): string {
  const raw =
    process.env.SEED_ADMIN_USER_ID?.trim() ||
    process.env.DEFAULT_SEED_ADMIN_USER_ID?.trim() ||
    process.env.SEED_USER_ID?.trim();
  if (!raw) {
    throw new Error(
      "Set SEED_ADMIN_USER_ID to a UUID (seeded admin id and category template owner).",
    );
  }
  const parsed = z.string().uuid().safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `SEED_ADMIN_USER_ID must be a valid UUID, got: ${JSON.stringify(raw)}`,
    );
  }
  return parsed.data;
}

/** Namespace int for `pg_advisory_xact_lock` when bootstrapping categories per user. */
const CATEGORY_BOOTSTRAP_LOCK_NS = 0x63_61_74_31; // "cat1"

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
      .where(eq(categories.userId, seedUserId()));
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
