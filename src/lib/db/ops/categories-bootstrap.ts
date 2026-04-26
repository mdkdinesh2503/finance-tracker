import type postgres from "postgres";

import type { Db } from "../core/client";
import type { CategoryRow, TransactionType } from "../schema";
import {
  CATEGORY_BOOTSTRAP_LOCK_NS,
  CATEGORY_CHILD_SYNC_LOCK_NS,
  CATEGORY_SEED_WITH_CHILDREN,
} from "@/lib/constants/category-seed";
import { resolveSeedUserId } from "../core/seed-user";

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

