import type { Db } from "@/lib/db/core/client";
import type { TransactionType } from "@/lib/db/schema";
import type { LendingAnalyticsSnapshot } from "@/lib/types/lending-analytics";

function num(v: string | null | undefined): number {
  const n = Number(v ?? "0");
  return Number.isFinite(n) ? n : 0;
}

function lastNCalendarMonthKeys(n: number, now: Date): string[] {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
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
  now = new Date(),
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
      coalesce(sum(case when t.type = 'RECEIVE' then t.amount::numeric else 0 end)::text, '0') as receive,
      max(case when t.type in ('BORROW','REPAYMENT') then t.transaction_date else null end)::text as last_borrow_activity,
      max(case when t.type in ('LEND','RECEIVE') then t.transaction_date else null end)::text as last_lend_activity
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
      last_borrow_activity: string | null;
      last_lend_activity: string | null;
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
      lastBorrowActivityYmd: r.last_borrow_activity ? String(r.last_borrow_activity) : null,
      lastLendActivityYmd: r.last_lend_activity ? String(r.last_lend_activity) : null,
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

  const months = lastNCalendarMonthKeys(12, now);
  const lookbackFrom = `${months[0]}-01`;
  const [ey, em] = months[months.length - 1]!.split("-").map(Number);
  const endD = new Date(ey!, em!, 0);
  const endStr = `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, "0")}-${String(endD.getDate()).padStart(2, "0")}`;

  const monthlyRaw = await db`
    select
      to_char(transaction_date, 'YYYY-MM') as ym,
      coalesce(sum(case when type = 'BORROW' then amount::numeric else 0 end)::text, '0') as borrowed,
      coalesce(sum(case when type = 'REPAYMENT' then amount::numeric else 0 end)::text, '0') as repaid,
      coalesce(sum(case when type = 'LEND' then amount::numeric else 0 end)::text, '0') as lent,
      coalesce(sum(case when type = 'RECEIVE' then amount::numeric else 0 end)::text, '0') as received
    from transactions
    where user_id = ${userId}
      and type in ('BORROW','REPAYMENT','LEND','RECEIVE')
      and transaction_date >= ${lookbackFrom}
      and transaction_date <= ${endStr}
    group by to_char(transaction_date, 'YYYY-MM')
  `;

  const byYm = new Map<string, { borrowed: number; repaid: number; lent: number; received: number }>();
  for (const r of monthlyRaw as unknown as { ym: string; borrowed: string; repaid: string; lent: string; received: string }[]) {
    byYm.set(String(r.ym), {
      borrowed: num(r.borrowed),
      repaid: num(r.repaid),
      lent: num(r.lent),
      received: num(r.received),
    });
  }

  const monthlyTrend = months.map((ym) => {
    const row = byYm.get(ym) ?? { borrowed: 0, repaid: 0, lent: 0, received: 0 };
    const deltaYouOwe = row.borrowed - row.repaid;
    const deltaTheyOweYou = row.lent - row.received;
    return {
      ym,
      deltaYouOwe,
      deltaTheyOweYou,
      netDelta: deltaTheyOweYou - deltaYouOwe,
    };
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
      lastBorrowActivityYmd: null,
      lastLendActivityYmd: null,
    },
    bySubcategory,
    monthlyTrend,
  };
}

