import { db } from "@/lib/db/core/server";

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
  const rows = await db`
    select
      t.contact_id,
      coalesce(sum(case when t.type = 'BORROW' then t.amount::numeric else 0 end)::text,'0') as borrow,
      coalesce(sum(case when t.type = 'REPAYMENT' then t.amount::numeric else 0 end)::text,'0') as repay,
      coalesce(sum(case when t.type = 'LEND' then t.amount::numeric else 0 end)::text,'0') as lend,
      coalesce(sum(case when t.type = 'RECEIVE' then t.amount::numeric else 0 end)::text,'0') as receive
    from transactions t
    where t.user_id = ${userId}
      and t.contact_id is not null
      and t.type in ('BORROW', 'REPAYMENT', 'LEND', 'RECEIVE')
    group by t.contact_id
  `;

  const out: LoansByContactRow[] = [];
  for (const r of rows as unknown as {
    contact_id: string;
    borrow: string;
    repay: string;
    lend: string;
    receive: string;
  }[]) {
    if (!r.contact_id) continue;
    const youOwe = Math.max(0, num(r.borrow) - num(r.repay));
    const theyOweYou = Math.max(0, num(r.lend) - num(r.receive));
    if (youOwe <= 0 && theyOweYou <= 0) continue;
    out.push({
      contactId: r.contact_id,
      youOwe: youOwe.toFixed(2),
      theyOweYou: theyOweYou.toFixed(2),
    });
  }

  return out;
}
