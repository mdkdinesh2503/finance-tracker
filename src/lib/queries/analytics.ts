import "server-only";

import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db/server";
import { categories, locations, transactions } from "@/lib/db/schema";

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type MonthlyPoint = { month: string; expense: string; income: string };

/** Last `months` calendar months including current (UTC), ordered oldest first. */
export async function getMonthlyIncomeExpense(
  userId: string,
  months: number,
): Promise<MonthlyPoint[]> {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1),
  );
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  );

  const rows = await db
    .select({
      ym: sql<string>`to_char(${transactions.transactionDate}, 'YYYY-MM')`.as("ym"),
      expense: sql<string>`coalesce(sum(case when ${transactions.type} = 'EXPENSE' then ${transactions.amount}::numeric else 0 end), 0)::text`.as(
        "expense",
      ),
      income: sql<string>`coalesce(sum(case when ${transactions.type} = 'INCOME' then ${transactions.amount}::numeric else 0 end), 0)::text`.as(
        "income",
      ),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.transactionDate, ymd(start)),
        lte(transactions.transactionDate, ymd(end)),
      ),
    )
    .groupBy(sql`to_char(${transactions.transactionDate}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${transactions.transactionDate}, 'YYYY-MM')`);

  return rows.map((r) => ({
    month: r.ym,
    expense: r.expense,
    income: r.income,
  }));
}

export type CategorySlice = { name: string; amount: string };

export async function getExpenseByCategory(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<CategorySlice[]> {
  const rows = await db
    .select({
      name: sql<string>`coalesce(${categories.name}, 'Uncategorized')`.as("name"),
      amount: sql<string>`coalesce(sum(${transactions.amount}::numeric), 0)::text`.as(
        "amount",
      ),
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "EXPENSE"),
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate),
      ),
    )
    .groupBy(categories.name)
    .orderBy(sql`sum(${transactions.amount}::numeric) desc`);

  return rows;
}

export type LocationSlice = { name: string; amount: string };

export async function getExpenseByLocation(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<LocationSlice[]> {
  const rows = await db
    .select({
      name: sql<string>`coalesce(${locations.name}, 'No location')`.as("name"),
      amount: sql<string>`coalesce(sum(${transactions.amount}::numeric), 0)::text`.as(
        "amount",
      ),
    })
    .from(transactions)
    .leftJoin(locations, eq(transactions.locationId, locations.id))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "EXPENSE"),
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate),
      ),
    )
    .groupBy(locations.name)
    .orderBy(sql`sum(${transactions.amount}::numeric) desc`);

  return rows;
}

export type RecurringSuggestion = {
  categoryId: string | null;
  categoryName: string;
  amount: string;
  monthsHit: number;
};

/** Same amount + same category, hits in at least 2 distinct months (rule-based). */
export async function detectRecurringExpenses(
  userId: string,
  lookbackMonths: number,
): Promise<RecurringSuggestion[]> {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (lookbackMonths - 1), 1),
  );
  const startStr = ymd(start);

  const rows = await db.execute(sql`
    with monthly as (
      select distinct
        ${transactions.categoryId} as category_id,
        ${transactions.amount}::text as amount,
        to_char(${transactions.transactionDate}, 'YYYY-MM') as ym
      from ${transactions}
      where ${transactions.userId} = ${userId}::uuid
        and ${transactions.type} = 'EXPENSE'
        and ${transactions.transactionDate} >= ${startStr}::date
    ),
    agg as (
      select category_id, amount, count(distinct ym)::int as months_hit
      from monthly
      group by category_id, amount
      having count(distinct ym) >= 2
    )
    select
      agg.category_id as category_id,
      coalesce(${categories.name}, 'Uncategorized') as category_name,
      agg.amount as amount,
      agg.months_hit as months_hit
    from agg
    left join ${categories} on ${categories.id} = agg.category_id
    order by agg.months_hit desc, agg.amount::numeric desc
    limit 12
  `);

  const list = rows as unknown as {
    category_id: string | null;
    category_name: string;
    amount: string;
    months_hit: number;
  }[];

  return list.map((r) => ({
    categoryId: r.category_id,
    categoryName: r.category_name,
    amount: r.amount,
    monthsHit: r.months_hit,
  }));
}
