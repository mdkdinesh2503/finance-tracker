import "server-only";

import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/server";
import {
  accounts,
  categories,
  contacts,
  locations,
  transactions,
  type TransactionType,
} from "@/lib/db/schema";

export type TransactionListRow = {
  id: string;
  type: TransactionType;
  amount: string;
  note: string | null;
  transactionDate: string;
  transactionTime: string;
  createdAt: Date;
  accountName: string;
  categoryName: string | null;
  locationName: string | null;
  contactName: string | null;
};

export async function listRecentTransactions(
  userId: string,
  limit: number,
): Promise<TransactionListRow[]> {
  const rows = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      note: transactions.note,
      transactionDate: transactions.transactionDate,
      transactionTime: transactions.transactionTime,
      createdAt: transactions.createdAt,
      accountName: accounts.name,
      categoryName: categories.name,
      locationName: locations.name,
      contactName: contacts.name,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(locations, eq(transactions.locationId, locations.id))
    .leftJoin(contacts, eq(transactions.contactId, contacts.id))
    .where(eq(transactions.userId, userId))
    .orderBy(
      desc(transactions.transactionDate),
      desc(transactions.transactionTime),
      desc(transactions.createdAt),
    )
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    amount: String(r.amount),
    note: r.note,
    transactionDate: r.transactionDate,
    transactionTime: r.transactionTime,
    createdAt: r.createdAt,
    accountName: r.accountName,
    categoryName: r.categoryName,
    locationName: r.locationName,
    contactName: r.contactName,
  }));
}

export type ContactLoanRow = {
  contactId: string;
  contactName: string;
  youOwe: string;
  theyOweYou: string;
};

export async function getLoansByContact(
  userId: string,
): Promise<ContactLoanRow[]> {
  const raw = await db.execute(sql`
    select
      c.id::text as contact_id,
      c.name as contact_name,
      greatest(
        coalesce(sum(case when t.type = 'BORROW' then t.amount::numeric else 0 end), 0)
        - coalesce(sum(case when t.type = 'REPAYMENT' then t.amount::numeric else 0 end), 0),
        0
      )::text as you_owe,
      greatest(
        coalesce(sum(case when t.type = 'LEND' then t.amount::numeric else 0 end), 0)
        - coalesce(sum(case when t.type = 'RECEIVE' then t.amount::numeric else 0 end), 0),
        0
      )::text as they_owe
    from ${contacts} c
    left join ${transactions} t on t.contact_id = c.id and t.user_id = c.user_id
    where c.user_id = ${userId}::uuid
    group by c.id, c.name
    having
      greatest(
        coalesce(sum(case when t.type = 'BORROW' then t.amount::numeric else 0 end), 0)
        - coalesce(sum(case when t.type = 'REPAYMENT' then t.amount::numeric else 0 end), 0),
        0
      ) > 0
      or greatest(
        coalesce(sum(case when t.type = 'LEND' then t.amount::numeric else 0 end), 0)
        - coalesce(sum(case when t.type = 'RECEIVE' then t.amount::numeric else 0 end), 0),
        0
      ) > 0
    order by c.name
  `);

  const rows = raw as unknown as {
    contact_id: string;
    contact_name: string;
    you_owe: string;
    they_owe: string;
  }[];

  return rows.map((r) => ({
    contactId: r.contact_id,
    contactName: r.contact_name,
    youOwe: r.you_owe,
    theyOweYou: r.they_owe,
  }));
}
