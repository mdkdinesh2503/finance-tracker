import "server-only";

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import * as schema from "./schema";
import { categories } from "./schema";

/** Template rows from `seed.ts` live under this synthetic user id (no `users` row). */
export const SYSTEM_CATEGORIES_USER_ID =
  "00000000-0000-0000-0000-000000000000" as const;

type Db = PostgresJsDatabase<typeof schema>;

/** Clone default category rows for a new user when they have none yet. */
export async function ensureDefaultReferenceDataForUser(
  db: Db,
  userId: string,
): Promise<void> {
  const existing = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.userId, userId))
    .limit(1);
  if (existing.length > 0) return;

  const template = await db
    .select()
    .from(categories)
    .where(eq(categories.userId, SYSTEM_CATEGORIES_USER_ID));
  if (template.length === 0) return;

  await db.insert(categories).values(
    template.map((c) => ({
      userId,
      name: c.name,
      parentId: null,
      type: c.type,
      isSelectable: c.isSelectable,
      sortOrder: c.sortOrder,
    })),
  );
}
