import "server-only";

import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db/server";
import { transactions } from "@/lib/db/schema";

function monthRangeUTC(year: number, monthIndex0: number) {
  const start = new Date(Date.UTC(year, monthIndex0, 1));
  const end = new Date(Date.UTC(year, monthIndex0 + 1, 0, 23, 59, 59, 999));
  return {
    startStr: start.toISOString().slice(0, 10),
    endStr: end.toISOString().slice(0, 10),
  };
}

/** Single-query ledger balance (signed cash-flow). */
export async function sumLedgerBalance(userId: string): Promise<string> {
  const [row] = await db
    .select({
      s: sql<string>`
        coalesce(sum(
          case ${transactions.type}
            when 'EXPENSE' then -${transactions.amount}::numeric
            when 'REPAYMENT' then -${transactions.amount}::numeric
            when 'LEND' then -${transactions.amount}::numeric
            when 'INVESTMENT' then -${transactions.amount}::numeric
            when 'INCOME' then ${transactions.amount}::numeric
            when 'BORROW' then ${transactions.amount}::numeric
            when 'RECEIVE' then ${transactions.amount}::numeric
            when 'ADJUSTMENT' then ${transactions.amount}::numeric
            else 0
          end
        ), 0)::text
      `.as("s"),
    })
    .from(transactions)
    .where(eq(transactions.userId, userId));
  return row?.s ?? "0";
}

export async function sumByTypeInRange(
  userId: string,
  type: "EXPENSE" | "INCOME",
  startDate: string,
  endDate: string,
): Promise<string> {
  const [row] = await db
    .select({
      s: sql<string>`coalesce(sum(${transactions.amount}::numeric), 0)::text`.as(
        "s",
      ),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, type),
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate),
      ),
    );
  return row?.s ?? "0";
}

export async function lifetimeExpense(userId: string): Promise<string> {
  const [row] = await db
    .select({
      s: sql<string>`coalesce(sum(${transactions.amount}::numeric), 0)::text`.as(
        "s",
      ),
    })
    .from(transactions)
    .where(
      and(eq(transactions.userId, userId), eq(transactions.type, "EXPENSE")),
    );
  return row?.s ?? "0";
}

export async function getCurrentMonthTotals(userId: string): Promise<{
  expense: string;
  income: string;
}> {
  const now = new Date();
  const { startStr, endStr } = monthRangeUTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
  );
  const [expense, income] = await Promise.all([
    sumByTypeInRange(userId, "EXPENSE", startStr, endStr),
    sumByTypeInRange(userId, "INCOME", startStr, endStr),
  ]);
  return { expense, income };
}

export async function getPreviousMonthTotals(userId: string): Promise<{
  expense: string;
  income: string;
}> {
  const now = new Date();
  const prev = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
  );
  const { startStr, endStr } = monthRangeUTC(
    prev.getUTCFullYear(),
    prev.getUTCMonth(),
  );
  const [expense, income] = await Promise.all([
    sumByTypeInRange(userId, "EXPENSE", startStr, endStr),
    sumByTypeInRange(userId, "INCOME", startStr, endStr),
  ]);
  return { expense, income };
}

export type LoanTotals = {
  youOwe: string;
  theyOweYou: string;
};

export async function getLoanTotals(userId: string): Promise<LoanTotals> {
  const raw = await db.execute(sql`
    select
      coalesce(sum(greatest(borrowed - repaid, 0)), 0)::text as you_owe,
      coalesce(sum(greatest(lent - received, 0)), 0)::text as they_owe
    from (
      select
        ${transactions.contactId} as cid,
        coalesce(sum(case when ${transactions.type} = 'BORROW' then ${transactions.amount}::numeric else 0 end), 0) as borrowed,
        coalesce(sum(case when ${transactions.type} = 'REPAYMENT' then ${transactions.amount}::numeric else 0 end), 0) as repaid,
        coalesce(sum(case when ${transactions.type} = 'LEND' then ${transactions.amount}::numeric else 0 end), 0) as lent,
        coalesce(sum(case when ${transactions.type} = 'RECEIVE' then ${transactions.amount}::numeric else 0 end), 0) as received
      from ${transactions}
      where ${transactions.userId} = ${userId}::uuid
        and ${transactions.contactId} is not null
      group by ${transactions.contactId}
    ) t
  `);

  const rows = raw as unknown as { you_owe: string; they_owe: string }[];
  const first = rows[0];
  return {
    youOwe: first?.you_owe ?? "0",
    theyOweYou: first?.they_owe ?? "0",
  };
}
