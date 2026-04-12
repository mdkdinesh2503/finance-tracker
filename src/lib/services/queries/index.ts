import { and, eq, isNotNull, or, sql } from "drizzle-orm";
import { transactions } from "@/lib/db/schema";
import { db } from "@/lib/db/server";

export type LoansByContactRow = {
  contactId: string;
  youOwe: string;
  theyOweYou: string;
};

function num(v: string | null | undefined): number {
  const n = Number(v ?? "0");
  return Number.isFinite(n) ? n : 0;
}

export async function getLoansByContact(
  userId: string
): Promise<LoansByContactRow[]> {
  const rows = await db
    .select({
      contactId: transactions.contactId,
      borrow: sql<string>`coalesce(sum(case when ${transactions.type} = 'BORROW' then ${transactions.amount}::numeric else 0 end)::text,'0')`,
      repay: sql<string>`coalesce(sum(case when ${transactions.type} = 'REPAYMENT' then ${transactions.amount}::numeric else 0 end)::text,'0')`,
      lend: sql<string>`coalesce(sum(case when ${transactions.type} = 'LEND' then ${transactions.amount}::numeric else 0 end)::text,'0')`,
      receive: sql<string>`coalesce(sum(case when ${transactions.type} = 'RECEIVE' then ${transactions.amount}::numeric else 0 end)::text,'0')`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        isNotNull(transactions.contactId),
        or(
          eq(transactions.type, "BORROW"),
          eq(transactions.type, "REPAYMENT"),
          eq(transactions.type, "LEND"),
          eq(transactions.type, "RECEIVE")
        )
      )
    )
    .groupBy(transactions.contactId);

  const out: LoansByContactRow[] = [];
  for (const r of rows) {
    if (!r.contactId) continue;
    const youOwe = Math.max(0, num(r.borrow) - num(r.repay));
    const theyOweYou = Math.max(0, num(r.lend) - num(r.receive));
    if (youOwe <= 0 && theyOweYou <= 0) continue;
    out.push({
      contactId: r.contactId,
      youOwe: youOwe.toFixed(2),
      theyOweYou: theyOweYou.toFixed(2),
    });
  }

  return out;
}
