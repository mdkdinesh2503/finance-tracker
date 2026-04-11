import { and, count, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { categories, contacts, transactions } from "@/lib/db/schema";
import type * as schemaTypes from "@/lib/db/schema";
import type { LendingAnalyticsSnapshot } from "@/lib/types/lending-analytics";

type Db = PostgresJsDatabase<typeof schemaTypes>;

const LOAN_TYPES = ["BORROW", "REPAYMENT", "LEND", "RECEIVE"] as const;

function num(v: string | null | undefined): number {
  const n = Number(v ?? "0");
  return Number.isFinite(n) ? n : 0;
}

function balanceFromParts(
  borrowed: number,
  repaid: number,
  lent: number,
  received: number,
) {
  return {
    youOwe: Math.max(0, borrowed - repaid),
    theyOweYou: Math.max(0, lent - received),
  };
}

export async function lendingAnalyticsSnapshot(
  db: Db,
  userId: string,
): Promise<LendingAnalyticsSnapshot> {
  const typeCond = inArray(transactions.type, [...LOAN_TYPES]);
  const userCond = eq(transactions.userId, userId);
  const baseLoan = and(userCond, typeCond);

  const borrowExpr = sql<string>`coalesce(sum(case when ${transactions.type} = 'BORROW' then ${transactions.amount}::numeric else 0 end)::text, '0')`;
  const repayExpr = sql<string>`coalesce(sum(case when ${transactions.type} = 'REPAYMENT' then ${transactions.amount}::numeric else 0 end)::text, '0')`;
  const lendExpr = sql<string>`coalesce(sum(case when ${transactions.type} = 'LEND' then ${transactions.amount}::numeric else 0 end)::text, '0')`;
  const receiveExpr = sql<string>`coalesce(sum(case when ${transactions.type} = 'RECEIVE' then ${transactions.amount}::numeric else 0 end)::text, '0')`;

  const [totRow] = await db
    .select({
      borrowed: borrowExpr,
      repaid: repayExpr,
      lent: lendExpr,
      received: receiveExpr,
    })
    .from(transactions)
    .where(baseLoan);

  const borrowed = num(totRow?.borrowed);
  const repaid = num(totRow?.repaid);
  const lent = num(totRow?.lent);
  const received = num(totRow?.received);
  const { youOwe, theyOweYou } = balanceFromParts(
    borrowed,
    repaid,
    lent,
    received,
  );

  const byContactRaw = await db
    .select({
      contactId: contacts.id,
      contactName: contacts.name,
      borrowed: borrowExpr,
      repaid: repayExpr,
      lent: lendExpr,
      received: receiveExpr,
    })
    .from(transactions)
    .innerJoin(contacts, eq(transactions.contactId, contacts.id))
    .where(and(baseLoan, isNotNull(transactions.contactId)))
    .groupBy(contacts.id, contacts.name);

  const byContact = byContactRaw.map((r) => {
    const b = num(r.borrowed);
    const rp = num(r.repaid);
    const l = num(r.lent);
    const rc = num(r.received);
    const bal = balanceFromParts(b, rp, l, rc);
    return {
      contactId: r.contactId,
      contactName: r.contactName,
      borrowed: b,
      repaid: rp,
      lent: l,
      received: rc,
      youOwe: bal.youOwe,
      theyOweYou: bal.theyOweYou,
    };
  });

  byContact.sort((a, b) => {
    const score = (x: (typeof byContact)[0]) =>
      Math.max(x.youOwe, x.theyOweYou, x.borrowed, x.lent);
    return score(b) - score(a);
  });

  const [noRow] = await db
    .select({
      borrowed: borrowExpr,
      repaid: repayExpr,
      lent: lendExpr,
      received: receiveExpr,
    })
    .from(transactions)
    .where(and(baseLoan, isNull(transactions.contactId)));

  const nb = num(noRow?.borrowed);
  const nr = num(noRow?.repaid);
  const nl = num(noRow?.lent);
  const nrc = num(noRow?.received);
  const noBal = balanceFromParts(nb, nr, nl, nrc);

  const catName = sql<string>`coalesce(${categories.name}, 'Uncategorized')`;

  const subRaw = await db
    .select({
      txType: transactions.type,
      categoryName: catName,
      total: sql<string>`coalesce(sum(${transactions.amount}::numeric)::text, '0')`,
      txCount: count(),
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(baseLoan)
    .groupBy(transactions.type, catName);

  const bySubcategory = subRaw
    .map((r) => ({
      type: r.txType,
      categoryName: r.categoryName,
      total: num(r.total),
      count: Number(r.txCount),
    }))
    .sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return b.total - a.total;
    });

  return {
    totals: {
      borrowed,
      repaid,
      lent,
      received,
      youOwe,
      theyOweYou,
    },
    byContact,
    noContact: {
      borrowed: nb,
      repaid: nr,
      lent: nl,
      received: nrc,
      youOwe: noBal.youOwe,
      theyOweYou: noBal.theyOweYou,
    },
    bySubcategory,
  };
}
