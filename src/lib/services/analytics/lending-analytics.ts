import type { Db } from "@/lib/db/core/client";
import type { TransactionType } from "@/lib/db/schema";
import type { LendingAnalyticsSnapshot } from "@/lib/types/lending-analytics";

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
  const [totRow] = await db`
    select
      coalesce(sum(case when type = 'BORROW' then amount::numeric else 0 end)::text, '0') as borrowed,
      coalesce(sum(case when type = 'REPAYMENT' then amount::numeric else 0 end)::text, '0') as repaid,
      coalesce(sum(case when type = 'LEND' then amount::numeric else 0 end)::text, '0') as lent,
      coalesce(sum(case when type = 'RECEIVE' then amount::numeric else 0 end)::text, '0') as received
    from transactions
    where user_id = ${userId}
      and type in ('BORROW', 'REPAYMENT', 'LEND', 'RECEIVE')
  `;

  const tr = totRow as
    | {
        borrowed: string;
        repaid: string;
        lent: string;
        received: string;
      }
    | undefined;

  const borrowed = num(tr?.borrowed);
  const repaid = num(tr?.repaid);
  const lent = num(tr?.lent);
  const received = num(tr?.received);
  const { youOwe, theyOweYou } = balanceFromParts(borrowed, repaid, lent, received);

  const byContactRaw = await db`
    select
      c.id as contact_id,
      c.name as contact_name,
      coalesce(sum(case when t.type = 'BORROW' then t.amount::numeric else 0 end)::text, '0') as borrowed,
      coalesce(sum(case when t.type = 'REPAYMENT' then t.amount::numeric else 0 end)::text, '0') as repaid,
      coalesce(sum(case when t.type = 'LEND' then t.amount::numeric else 0 end)::text, '0') as lend,
      coalesce(sum(case when t.type = 'RECEIVE' then t.amount::numeric else 0 end)::text, '0') as receive
    from transactions t
    inner join contacts c on c.id = t.contact_id
    where t.user_id = ${userId}
      and t.contact_id is not null
      and t.type in ('BORROW', 'REPAYMENT', 'LEND', 'RECEIVE')
    group by c.id, c.name
  `;

  const byContact = (
    byContactRaw as unknown as {
      contact_id: string;
      contact_name: string;
      borrowed: string;
      repaid: string;
      lend: string;
      receive: string;
    }[]
  ).map((r) => {
    const b = num(r.borrowed);
    const rp = num(r.repaid);
    const l = num(r.lend);
    const rc = num(r.receive);
    const bal = balanceFromParts(b, rp, l, rc);
    return {
      contactId: r.contact_id,
      contactName: r.contact_name,
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

  const [noRow] = await db`
    select
      coalesce(sum(case when type = 'BORROW' then amount::numeric else 0 end)::text, '0') as borrowed,
      coalesce(sum(case when type = 'REPAYMENT' then amount::numeric else 0 end)::text, '0') as repaid,
      coalesce(sum(case when type = 'LEND' then amount::numeric else 0 end)::text, '0') as lent,
      coalesce(sum(case when type = 'RECEIVE' then amount::numeric else 0 end)::text, '0') as received
    from transactions
    where user_id = ${userId}
      and contact_id is null
      and type in ('BORROW', 'REPAYMENT', 'LEND', 'RECEIVE')
  `;

  const nr = noRow as
    | {
        borrowed: string;
        repaid: string;
        lent: string;
        received: string;
      }
    | undefined;

  const nb = num(nr?.borrowed);
  const nrp = num(nr?.repaid);
  const nl = num(nr?.lent);
  const nrc = num(nr?.received);
  const noBal = balanceFromParts(nb, nrp, nl, nrc);

  const subRaw = await db`
    select
      t.type as tx_type,
      coalesce(c.name, 'Uncategorized') as category_name,
      coalesce(sum(t.amount::numeric)::text, '0') as total,
      count(*)::int as tx_count
    from transactions t
    left join categories c on c.id = t.category_id
    where t.user_id = ${userId}
      and t.type in ('BORROW', 'REPAYMENT', 'LEND', 'RECEIVE')
    group by t.type, coalesce(c.name, 'Uncategorized')
  `;

  const bySubcategory = (
    subRaw as unknown as {
      tx_type: string;
      category_name: string;
      total: string;
      tx_count: number;
    }[]
  )
    .map((r) => ({
      type: r.tx_type as TransactionType,
      categoryName: r.category_name,
      total: num(r.total),
      count: Number(r.tx_count),
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
      repaid: nrp,
      lent: nl,
      received: nrc,
      youOwe: noBal.youOwe,
      theyOweYou: noBal.theyOweYou,
    },
    bySubcategory,
  };
}

