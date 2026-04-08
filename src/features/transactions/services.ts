import {
  and,
  count,
  desc,
  eq,
  gte,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { alias } from "drizzle-orm/pg-core";
import type { DatePreset } from "@/features/filters/types";
import {
  categories,
  contacts,
  locations,
  transactions,
} from "@/lib/db/schema";
import {
  formatLocalYMD,
  localCalendarMonthRange,
  resolveTransactionDateCondition,
  transactionDateFilter,
} from "@/lib/utils/date-presets";
import type * as schemaTypes from "@/lib/db/schema";
import type { TransactionType } from "@/lib/db/schema";
import type {
  CreateTransactionInput,
  DashboardMonthSlice,
  DashboardPayload,
  DashboardRecentRow,
  SuggestionDTO,
  TransactionRowDTO,
} from "./types";

const DASHBOARD_TREND_MONTHS = 10;
const DASHBOARD_RECENT_LIMIT = 12;

type Db = PostgresJsDatabase<typeof schemaTypes>;

export type TransactionListFilters = {
  fromDate?: string | null;
  toDate?: string | null;
  categoryContains?: string;
  locationId?: string | null;
};

function escapeIlikePattern(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function categoryNameSearchCondition(
  q: string | undefined,
  userId: string
): SQL | undefined {
  const raw = q?.trim();
  if (!raw || raw.length > 120) return undefined;
  const pattern = `%${escapeIlikePattern(raw)}%`;
  return or(
    sql`exists (
      select 1 from ${categories}
      where ${categories.id} = ${transactions.categoryId}
      and ${categories.userId} = ${userId}
      and ${categories.name} ilike ${pattern} escape '\'
    )`,
    sql`exists (
      select 1 from ${categories}
      where ${categories.id} = ${transactions.parentCategoryId}
      and ${categories.userId} = ${userId}
      and ${categories.name} ilike ${pattern} escape '\'
    )`
  )!;
}

function scopedTransactionsWhere(
  userId: string,
  preset: DatePreset,
  extra: TransactionListFilters | undefined,
  now: Date
): SQL | undefined {
  const fromDate = extra?.fromDate ?? null;
  const toDate = extra?.toDate ?? null;
  const parts: (SQL | undefined)[] = [
    eq(transactions.userId, userId),
    resolveTransactionDateCondition(preset, fromDate, toDate, now),
    extra?.locationId
      ? eq(transactions.locationId, extra.locationId)
      : undefined,
    categoryNameSearchCondition(extra?.categoryContains, userId),
  ];
  return and(...(parts.filter(Boolean) as SQL[]));
}

function num(v: string | null | undefined): number {
  if (v == null || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function loanBalanceForContact(
  db: Db,
  userId: string,
  contactId: string
): Promise<{ youOwe: number; theyOweYou: number }> {
  const rows = await db
    .select({
      borrow: sql<string>`coalesce(sum(case when ${transactions.type} = 'BORROW' then ${transactions.amount}::numeric else 0 end)::text,'0')`,
      repay: sql<string>`coalesce(sum(case when ${transactions.type} = 'REPAYMENT' then ${transactions.amount}::numeric else 0 end)::text,'0')`,
      lend: sql<string>`coalesce(sum(case when ${transactions.type} = 'LEND' then ${transactions.amount}::numeric else 0 end)::text,'0')`,
      receive: sql<string>`coalesce(sum(case when ${transactions.type} = 'RECEIVE' then ${transactions.amount}::numeric else 0 end)::text,'0')`,
    })
    .from(transactions)
    .where(
      and(eq(transactions.userId, userId), eq(transactions.contactId, contactId))
    );

  const r = rows[0];
  const youOwe = Math.max(0, num(r?.borrow) - num(r?.repay));
  const theyOweYou = Math.max(0, num(r?.lend) - num(r?.receive));
  return { youOwe, theyOweYou };
}

export async function sumByTypeForUser(
  db: Db,
  userId: string,
  extra?: SQL
): Promise<Record<string, number>> {
  const base = extra
    ? and(eq(transactions.userId, userId), extra)
    : eq(transactions.userId, userId);
  const rows = await db
    .select({
      type: transactions.type,
      total: sql<string>`coalesce(sum(${transactions.amount})::text, '0')`,
    })
    .from(transactions)
    .where(base)
    .groupBy(transactions.type);

  const out: Record<string, number> = {};
  for (const r of rows) {
    out[r.type] = num(r.total);
  }
  return out;
}

export function balanceFromSums(sums: Record<string, number>): number {
  return (
    (sums.INCOME ?? 0) +
    (sums.BORROW ?? 0) -
    (sums.EXPENSE ?? 0) -
    (sums.INVESTMENT ?? 0) -
    (sums.REPAYMENT ?? 0) +
    (sums.RECEIVE ?? 0) -
    (sums.LEND ?? 0)
  );
}

export function pendingLiabilityFromSums(sums: Record<string, number>): number {
  return (sums.BORROW ?? 0) - (sums.REPAYMENT ?? 0);
}

function monthSliceFromSums(sums: Record<string, number>): DashboardMonthSlice {
  return {
    income: sums.INCOME ?? 0,
    expense: sums.EXPENSE ?? 0,
    investment: sums.INVESTMENT ?? 0,
    borrowed: sums.BORROW ?? 0,
    repaid: sums.REPAYMENT ?? 0,
    lent: sums.LEND ?? 0,
    received: sums.RECEIVE ?? 0,
  };
}

export async function dashboardMonthStats(
  db: Db,
  userId: string,
  start: string,
  end: string
): Promise<DashboardMonthSlice> {
  const range = and(
    gte(transactions.transactionDate, start),
    lte(transactions.transactionDate, end)
  );
  const sums = await sumByTypeForUser(db, userId, range);
  return monthSliceFromSums(sums);
}

function lastNCalendarMonthKeys(n: number, now: Date): string[] {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }
  return keys;
}

export async function expenseMonthlyTrendLastN(
  db: Db,
  userId: string,
  n: number,
  now: Date
): Promise<{ month: string; expense: number }[]> {
  const keys = lastNCalendarMonthKeys(n, now);
  const startStr = `${keys[0]}-01`;
  const [ey, em] = keys[keys.length - 1].split("-").map(Number);
  const endD = new Date(ey, em, 0);
  const endStr = formatLocalYMD(endD);

  const rows = await db
    .select({
      ym: sql<string>`to_char(${transactions.transactionDate}, 'YYYY-MM')`,
      total: sql<string>`coalesce(sum(${transactions.amount})::text, '0')`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "EXPENSE"),
        gte(transactions.transactionDate, startStr),
        lte(transactions.transactionDate, endStr)
      )
    )
    .groupBy(sql`to_char(${transactions.transactionDate}, 'YYYY-MM')`);

  const byYm = new Map<string, number>();
  for (const r of rows) {
    byYm.set(r.ym, num(r.total));
  }

  return keys.map((month) => ({
    month,
    expense: byYm.get(month) ?? 0,
  }));
}

export async function recentActivityForDashboard(
  db: Db,
  userId: string,
  limit: number,
  /** Inclusive local calendar range `YYYY-MM-DD` (e.g. current month). */
  fromDateStr: string,
  toDateStr: string
): Promise<DashboardRecentRow[]> {
  const parentCat = alias(categories, "parent_cat");

  const rows = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      note: transactions.note,
      transactionDate: transactions.transactionDate,
      transactionTime: transactions.transactionTime,
      categoryName: categories.name,
      parentCategoryName: parentCat.name,
      locationName: locations.name,
    })
    .from(transactions)
    .leftJoin(
      categories,
      and(
        eq(transactions.categoryId, categories.id),
        eq(categories.userId, userId)
      )
    )
    .leftJoin(
      parentCat,
      and(
        eq(transactions.parentCategoryId, parentCat.id),
        eq(parentCat.userId, userId)
      )
    )
    .leftJoin(
      locations,
      and(
        eq(transactions.locationId, locations.id),
        eq(locations.userId, userId)
      )
    )
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.transactionDate, fromDateStr),
        lte(transactions.transactionDate, toDateStr)
      )
    )
    .orderBy(
      desc(transactions.transactionDate),
      desc(transactions.transactionTime)
    )
    .limit(limit);

  return rows.map((r) => {
    const title =
      r.note?.trim() ||
      r.categoryName ||
      r.parentCategoryName ||
      r.type;
    return {
      id: r.id,
      type: r.type,
      amount: num(String(r.amount)),
      title,
      transactionDate: String(r.transactionDate),
      transactionTime: String(r.transactionTime),
      locationName: r.locationName,
    };
  });
}

export async function loadDashboard(
  db: Db,
  userId: string,
  now = new Date()
): Promise<DashboardPayload> {
  const thisStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const thisStartStr = formatLocalYMD(thisStart);
  const thisEndStr = formatLocalYMD(thisEnd);

  const [allSums, thisMonth, monthlyExpenseTrend, recentActivity] =
    await Promise.all([
      sumByTypeForUser(db, userId),
      dashboardMonthStats(db, userId, thisStartStr, thisEndStr),
      expenseMonthlyTrendLastN(db, userId, DASHBOARD_TREND_MONTHS, now),
      recentActivityForDashboard(
        db,
        userId,
        DASHBOARD_RECENT_LIMIT,
        thisStartStr,
        thisEndStr
      ),
    ]);

  const cumulativeBalance = balanceFromSums(allSums);
  const cumulativePendingLiability = pendingLiabilityFromSums(allSums);

  return {
    thisMonth,
    cumulativeBalance,
    cumulativePendingLiability,
    monthlyExpenseTrend,
    recentActivity,
    loansSummary: { youOwe: 0, theyOweYou: 0 },
  };
}

export async function lifetimeExpense(db: Db, userId: string): Promise<number> {
  const [row] = await db
    .select({
      total: sql<string>`coalesce(sum(${transactions.amount})::text, '0')`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "EXPENSE")
      )
    );
  return num(row?.total);
}

export async function locationExpenseForRange(
  db: Db,
  userId: string,
  start: string,
  end: string
): Promise<{ locationId: string; name: string; total: number }[]> {
  const rows = await db
    .select({
      locationId: transactions.locationId,
      name: locations.name,
      total: sql<string>`coalesce(sum(${transactions.amount})::text, '0')`,
    })
    .from(transactions)
    .leftJoin(
      locations,
      and(
        eq(transactions.locationId, locations.id),
        eq(locations.userId, userId)
      )
    )
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "EXPENSE"),
        gte(transactions.transactionDate, start),
        lte(transactions.transactionDate, end),
        sql`${transactions.locationId} is not null`
      )
    )
    .groupBy(transactions.locationId, locations.name);

  return rows
    .filter((r) => r.locationId)
    .map((r) => ({
      locationId: r.locationId!,
      name: r.name ?? "Unknown",
      total: num(r.total),
    }));
}

export async function listTransactionsFiltered(
  db: Db,
  userId: string,
  filters: {
    datePreset: DatePreset;
    fromDate: string | null;
    toDate: string | null;
    categoryContains: string;
    locationId: string | null;
  },
  now = new Date()
): Promise<TransactionRowDTO[]> {
  const whereClause = scopedTransactionsWhere(
    userId,
    filters.datePreset,
    {
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      categoryContains: filters.categoryContains,
      locationId: filters.locationId,
    },
    now
  );

  const parentCat = alias(categories, "parent_cat");
  const contactAlias = alias(contacts, "contact");

  const rows = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      categoryId: transactions.categoryId,
      parentCategoryId: transactions.parentCategoryId,
      locationId: transactions.locationId,
      contactId: transactions.contactId,
      note: transactions.note,
      transactionDate: transactions.transactionDate,
      transactionTime: transactions.transactionTime,
      categoryName: categories.name,
      parentCategoryName: parentCat.name,
      locationName: locations.name,
      contactName: contactAlias.name,
    })
    .from(transactions)
    .leftJoin(
      categories,
      and(
        eq(transactions.categoryId, categories.id),
        eq(categories.userId, userId)
      )
    )
    .leftJoin(
      parentCat,
      and(
        eq(transactions.parentCategoryId, parentCat.id),
        eq(parentCat.userId, userId)
      )
    )
    .leftJoin(
      locations,
      and(
        eq(transactions.locationId, locations.id),
        eq(locations.userId, userId)
      )
    )
    .leftJoin(
      contactAlias,
      and(
        eq(transactions.contactId, contactAlias.id),
        eq(contactAlias.userId, userId)
      )
    )
    .where(whereClause)
    .orderBy(desc(transactions.transactionDate), desc(transactions.transactionTime));

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    amount: String(r.amount),
    categoryId: r.categoryId,
    parentCategoryId: r.parentCategoryId,
    locationId: r.locationId,
    contactId: r.contactId,
    note: r.note,
    transactionDate: String(r.transactionDate),
    transactionTime: String(r.transactionTime),
    categoryName: r.categoryName,
    parentCategoryName: r.parentCategoryName,
    locationName: r.locationName,
    contactName: r.contactName,
  }));
}

export async function getSuggestions(
  db: Db,
  userId: string
): Promise<SuggestionDTO> {
  const recent = await db
    .select({
      categoryId: transactions.categoryId,
      amount: transactions.amount,
      locationId: transactions.locationId,
    })
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.createdAt))
    .limit(10);

  if (recent.length === 0) {
    return { categoryId: null, amount: null, locationId: null };
  }

  const catCounts = new Map<string, number>();
  const locCounts = new Map<string, number>();
  let amountSum = 0;
  let n = 0;
  for (const t of recent) {
    if (t.categoryId) {
      catCounts.set(t.categoryId, (catCounts.get(t.categoryId) ?? 0) + 1);
    }
    if (t.locationId) {
      locCounts.set(t.locationId, (locCounts.get(t.locationId) ?? 0) + 1);
    }
    amountSum += num(String(t.amount));
    n += 1;
  }
  let bestCat: string | null = null;
  let bestCatN = 0;
  for (const [id, c] of catCounts) {
    if (c > bestCatN) {
      bestCatN = c;
      bestCat = id;
    }
  }
  let bestLoc: string | null = null;
  let bestLocN = 0;
  for (const [id, c] of locCounts) {
    if (c > bestLocN) {
      bestLocN = c;
      bestLoc = id;
    }
  }
  const avg = n > 0 ? (amountSum / n).toFixed(2) : null;
  return {
    categoryId: bestCat,
    amount: avg,
    locationId: bestLoc,
  };
}

export async function createTransactionForUser(
  db: Db,
  userId: string,
  input: CreateTransactionInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const [cat] = await db
    .select()
    .from(categories)
    .where(
      and(eq(categories.id, input.categoryId), eq(categories.userId, userId))
    )
    .limit(1);

  if (!cat) {
    return { ok: false, error: "Category not found" };
  }

  if (input.locationId) {
    const [loc] = await db
      .select()
      .from(locations)
      .where(
        and(eq(locations.id, input.locationId), eq(locations.userId, userId))
      )
      .limit(1);
    if (!loc) {
      return { ok: false, error: "Location not found" };
    }
  }
  if (!cat.isSelectable) {
    return { ok: false, error: "Category is not selectable" };
  }

  const type = cat.type;
  const loanTypes = type === "BORROW" || type === "REPAYMENT" || type === "LEND" || type === "RECEIVE";
  if (loanTypes) {
    if (!input.contactId) {
      return { ok: false, error: "Contact is required for loan transactions" };
    }
    const [con] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, input.contactId), eq(contacts.userId, userId)))
      .limit(1);
    if (!con) {
      return { ok: false, error: "Invalid contact" };
    }

    // Repayment/receive validations: must be against an existing outstanding balance
    const bal = await loanBalanceForContact(db, userId, input.contactId);
    const amt = Number(input.amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return { ok: false, error: "Invalid amount" };
    }
    if (type === "REPAYMENT") {
      if (bal.youOwe <= 0) {
        return { ok: false, error: "You have no borrow balance for this contact" };
      }
      if (amt > bal.youOwe + 1e-9) {
        return { ok: false, error: `Repayment exceeds borrow balance (${bal.youOwe.toFixed(2)})` };
      }
    }
    if (type === "RECEIVE") {
      if (bal.theyOweYou <= 0) {
        return { ok: false, error: "You have no lend balance for this contact" };
      }
      if (amt > bal.theyOweYou + 1e-9) {
        return { ok: false, error: `Receive exceeds lend balance (${bal.theyOweYou.toFixed(2)})` };
      }
    }
  }

  {
    const amt = Number(input.amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return { ok: false, error: "Invalid amount" };
    }
    const isCashOutflow =
      type === "EXPENSE" ||
      type === "INVESTMENT" ||
      type === "REPAYMENT" ||
      type === "LEND";
    if (isCashOutflow) {
      const sums = await sumByTypeForUser(db, userId);
      const bal = balanceFromSums(sums);
      if (amt > bal + 1e-9) {
        return {
          ok: false,
          error: `Insufficient balance. Available: ${bal.toFixed(2)}`,
        };
      }
    }
  }

  const parentCategoryId = cat.parentId;

  const [inserted] = await db
    .insert(transactions)
    .values({
      userId,
      type,
      amount: input.amount,
      categoryId: input.categoryId,
      parentCategoryId,
      locationId: input.locationId,
      contactId: input.contactId ?? null,
      note: input.note ?? null,
      transactionDate: input.transactionDate,
      transactionTime: input.transactionTime,
    })
    .returning({ id: transactions.id });

  if (!inserted) {
    return { ok: false, error: "Insert failed" };
  }

  return { ok: true, id: inserted.id };
}

export async function monthlyTrend(
  db: Db,
  userId: string,
  preset: DatePreset,
  filters?: TransactionListFilters,
  now = new Date()
): Promise<
  { key: string; income: number; expense: number; investment: number }[]
> {
  const base = scopedTransactionsWhere(userId, preset, filters, now);

  const rows = await db
    .select({
      ym: sql<string>`to_char(${transactions.transactionDate}, 'YYYY-MM')`,
      type: transactions.type,
      total: sql<string>`coalesce(sum(${transactions.amount})::text, '0')`,
    })
    .from(transactions)
    .where(base)
    .groupBy(
      sql`to_char(${transactions.transactionDate}, 'YYYY-MM')`,
      transactions.type
    )
    .orderBy(sql`to_char(${transactions.transactionDate}, 'YYYY-MM')`);

  const byMonth = new Map<
    string,
    { income: number; expense: number; investment: number }
  >();
  for (const r of rows) {
    if (!byMonth.has(r.ym)) {
      byMonth.set(r.ym, { income: 0, expense: 0, investment: 0 });
    }
    const b = byMonth.get(r.ym)!;
    const t = num(r.total);
    if (r.type === "INCOME") b.income += t;
    if (r.type === "EXPENSE") b.expense += t;
    if (r.type === "INVESTMENT") b.investment += t;
  }

  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({ key, ...v }));
}

export async function categoryParentExpenseBreakdown(
  db: Db,
  userId: string,
  preset: DatePreset,
  filters?: TransactionListFilters,
  now = new Date()
): Promise<{ name: string; total: number }[]> {
  const scope = scopedTransactionsWhere(userId, preset, filters, now);
  const base = and(scope, eq(transactions.type, "EXPENSE"));

  const parentCat = alias(categories, "exp_parent");

  const rows = await db
    .select({
      parentName: sql<string>`coalesce(${parentCat.name}, 'Uncategorized')`,
      total: sql<string>`coalesce(sum(${transactions.amount})::text, '0')`,
    })
    .from(transactions)
    .leftJoin(
      parentCat,
      and(
        eq(transactions.parentCategoryId, parentCat.id),
        eq(parentCat.userId, userId)
      )
    )
    .where(base)
    .groupBy(transactions.parentCategoryId, parentCat.name);

  return rows.map((r) => ({
    name: r.parentName ?? "Uncategorized",
    total: num(r.total),
  }));
}

export async function locationExpenseBreakdown(
  db: Db,
  userId: string,
  preset: DatePreset,
  filters?: TransactionListFilters,
  now = new Date()
): Promise<{ name: string; total: number }[]> {
  const scope = scopedTransactionsWhere(userId, preset, filters, now);
  const base = and(
    scope,
    eq(transactions.type, "EXPENSE"),
    sql`${transactions.locationId} is not null`
  );

  const rows = await db
    .select({
      name: locations.name,
      total: sql<string>`coalesce(sum(${transactions.amount})::text, '0')`,
    })
    .from(transactions)
    .innerJoin(
      locations,
      and(
        eq(transactions.locationId, locations.id),
        eq(locations.userId, userId)
      )
    )
    .where(base)
    .groupBy(locations.name);

  return rows.map((r) => ({ name: r.name, total: num(r.total) }));
}

export type CategoryVsLastMonthRow = {
  /** Leaf category id, or `__uncategorized__`. */
  categoryId: string;
  /** Leaf / subcategory name (not parent-only). */
  category: string;
  thisMonth: number;
  lastMonth: number;
  delta: number;
};

export type CategoryVsLastMonthPayload = {
  thisMonthLabel: string;
  lastMonthLabel: string;
  thisMonthTotal: number;
  lastMonthTotal: number;
  change: number;
  /** `(change / lastMonthTotal) * 100` when last month total &gt; 0 */
  pctVsLastMonth: number | null;
  rows: CategoryVsLastMonthRow[];
};

type LeafExpenseBucket = { label: string; total: number };

/** Expense by transaction `categoryId` (leaf / subcategory), keyed by id — not parent name. */
async function leafCategoryExpenseInRange(
  db: Db,
  userId: string,
  fromYMD: string,
  toYMD: string
): Promise<Map<string, LeafExpenseBucket>> {
  const rows = await db
    .select({
      categoryId: transactions.categoryId,
      leafName: sql<string>`coalesce(${categories.name}, 'Uncategorized')`,
      total: sql<string>`coalesce(sum(${transactions.amount})::text, '0')`,
    })
    .from(transactions)
    .leftJoin(
      categories,
      and(
        eq(transactions.categoryId, categories.id),
        eq(categories.userId, userId)
      )
    )
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "EXPENSE"),
        gte(transactions.transactionDate, fromYMD),
        lte(transactions.transactionDate, toYMD)
      )
    )
    .groupBy(transactions.categoryId, categories.name);

  const map = new Map<string, LeafExpenseBucket>();
  for (const r of rows) {
    const id = r.categoryId ?? "__uncategorized__";
    map.set(id, {
      label: r.leafName ?? "Uncategorized",
      total: num(r.total),
    });
  }
  return map;
}

/** Leaf category expense: this calendar month vs previous, sorted by max of the two totals. */
export async function categoryVsLastMonthSnapshot(
  db: Db,
  userId: string,
  now = new Date()
): Promise<CategoryVsLastMonthPayload> {
  const thisRange = localCalendarMonthRange(now);
  const prevAnchor = new Date(now);
  prevAnchor.setMonth(prevAnchor.getMonth() - 1);
  const lastRange = localCalendarMonthRange(prevAnchor);

  const [thisMap, lastMap] = await Promise.all([
    leafCategoryExpenseInRange(db, userId, thisRange.from, thisRange.to),
    leafCategoryExpenseInRange(db, userId, lastRange.from, lastRange.to),
  ]);

  const ids = new Set<string>([...thisMap.keys(), ...lastMap.keys()]);
  const rows: CategoryVsLastMonthRow[] = [];
  for (const id of ids) {
    const t = thisMap.get(id)?.total ?? 0;
    const l = lastMap.get(id)?.total ?? 0;
    if (t === 0 && l === 0) continue;
    const label =
      thisMap.get(id)?.label ??
      lastMap.get(id)?.label ??
      "Uncategorized";
    rows.push({
      categoryId: id,
      category: label,
      thisMonth: t,
      lastMonth: l,
      delta: t - l,
    });
  }
  rows.sort(
    (a, b) =>
      Math.max(b.thisMonth, b.lastMonth) - Math.max(a.thisMonth, a.lastMonth)
  );

  let thisMonthTotal = 0;
  for (const v of thisMap.values()) thisMonthTotal += v.total;
  let lastMonthTotal = 0;
  for (const v of lastMap.values()) lastMonthTotal += v.total;

  const change = thisMonthTotal - lastMonthTotal;
  const pctVsLastMonth =
    lastMonthTotal > 0 ? (change / lastMonthTotal) * 100 : null;

  return {
    thisMonthLabel: thisRange.label,
    lastMonthLabel: lastRange.label,
    thisMonthTotal,
    lastMonthTotal,
    change,
    pctVsLastMonth,
    rows,
  };
}

export async function listContacts(db: Db, userId: string) {
  return db
    .select()
    .from(contacts)
    .where(eq(contacts.userId, userId))
    .orderBy(contacts.name);
}

export type ContactWithLoanUsage = {
  id: string;
  name: string;
  loanTxCount: number;
};

export async function listContactsWithLoanUsage(
  db: Db,
  userId: string
): Promise<ContactWithLoanUsage[]> {
  const rows = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      loanTxCount: sql<number>`count(${transactions.id})::int`,
    })
    .from(contacts)
    .leftJoin(
      transactions,
      and(
        eq(transactions.contactId, contacts.id),
        eq(transactions.userId, userId),
        or(
          eq(transactions.type, "BORROW"),
          eq(transactions.type, "REPAYMENT"),
          eq(transactions.type, "LEND"),
          eq(transactions.type, "RECEIVE")
        )
      )
    )
    .where(eq(contacts.userId, userId))
    .groupBy(contacts.id, contacts.name)
    .orderBy(contacts.name);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    loanTxCount: Number(r.loanTxCount),
  }));
}

export async function createContact(
  db: Db,
  userId: string,
  name: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name required" };
  const [row] = await db
    .insert(contacts)
    .values({ userId, name: trimmed })
    .returning({ id: contacts.id });
  if (!row) return { ok: false, error: "Failed" };
  return { ok: true, id: row.id };
}

export async function updateContactForUser(
  db: Db,
  userId: string,
  contactId: string,
  name: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name required" };
  const updated = await db
    .update(contacts)
    .set({ name: trimmed })
    .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)))
    .returning({ id: contacts.id });
  if (updated.length === 0) return { ok: false, error: "Contact not found" };
  return { ok: true };
}

export async function deleteContactIfNoLoans(
  db: Db,
  userId: string,
  contactId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [row] = await db
    .select({ n: count() })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.contactId, contactId),
        or(
          eq(transactions.type, "BORROW"),
          eq(transactions.type, "REPAYMENT"),
          eq(transactions.type, "LEND"),
          eq(transactions.type, "RECEIVE")
        )
      )
    );
  if (Number(row?.n ?? 0) > 0) {
    return {
      ok: false,
      error:
        "This person is linked to loan transactions. Remove or change those entries before deleting.",
    };
  }
  const removed = await db
    .delete(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)))
    .returning({ id: contacts.id });
  if (removed.length === 0) return { ok: false, error: "Contact not found" };
  return { ok: true };
}

export type LocationWithUsage = {
  id: string;
  name: string;
  txCount: number;
};

export async function listLocationsWithUsage(
  db: Db,
  userId: string
): Promise<LocationWithUsage[]> {
  const rows = await db
    .select({
      id: locations.id,
      name: locations.name,
      txCount: sql<number>`count(${transactions.id})::int`,
    })
    .from(locations)
    .leftJoin(
      transactions,
      and(
        eq(transactions.locationId, locations.id),
        eq(transactions.userId, userId)
      )
    )
    .where(eq(locations.userId, userId))
    .groupBy(locations.id, locations.name)
    .orderBy(locations.name);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    txCount: Number(r.txCount),
  }));
}

export async function updateLocationForUser(
  db: Db,
  userId: string,
  locationId: string,
  name: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: "Name required" };
  }
  const dup = await db
    .select({ id: locations.id })
    .from(locations)
    .where(and(eq(locations.userId, userId), eq(locations.name, trimmed)))
    .limit(1);
  if (dup.length > 0 && dup[0].id !== locationId) {
    return { ok: false, error: "A location with that name already exists" };
  }
  const updated = await db
    .update(locations)
    .set({ name: trimmed })
    .where(and(eq(locations.id, locationId), eq(locations.userId, userId)))
    .returning({ id: locations.id });
  if (updated.length === 0) {
    return { ok: false, error: "Location not found" };
  }
  return { ok: true };
}

export async function deleteLocationIfUnused(
  db: Db,
  userId: string,
  locationId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [row] = await db
    .select({ n: count() })
    .from(transactions)
    .where(
      and(
        eq(transactions.locationId, locationId),
        eq(transactions.userId, userId)
      )
    );
  const n = Number(row?.n ?? 0);
  if (n > 0) {
    return {
      ok: false,
      error:
        "This location is used on transactions. Change or remove those rows before deleting.",
    };
  }
  const removed = await db
    .delete(locations)
    .where(and(eq(locations.id, locationId), eq(locations.userId, userId)))
    .returning({ id: locations.id });
  if (removed.length === 0) {
    return { ok: false, error: "Location not found" };
  }
  return { ok: true };
}

export type CategorySubWithUsage = {
  id: string;
  name: string;
  type: TransactionType;
  sortOrder: number;
  txCount: number;
};

export type CategoryParentWithSubs = {
  id: string;
  name: string;
  type: TransactionType;
  sortOrder: number;
  txAsParentCount: number;
  children: CategorySubWithUsage[];
};

export async function listCategoriesWithUsageTree(
  db: Db,
  userId: string
): Promise<CategoryParentWithSubs[]> {
  const all = await db
    .select()
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(categories.sortOrder);

  const leafAgg = await db
    .select({
      cid: transactions.categoryId,
      n: sql<number>`count(*)::int`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        isNotNull(transactions.categoryId)
      )
    )
    .groupBy(transactions.categoryId);

  const parentAgg = await db
    .select({
      pid: transactions.parentCategoryId,
      n: sql<number>`count(*)::int`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        isNotNull(transactions.parentCategoryId)
      )
    )
    .groupBy(transactions.parentCategoryId);

  const leafMap = new Map<string, number>();
  for (const r of leafAgg) {
    if (r.cid) leafMap.set(r.cid, Number(r.n));
  }
  const parentMap = new Map<string, number>();
  for (const r of parentAgg) {
    if (r.pid) parentMap.set(r.pid, Number(r.n));
  }

  const roots = all.filter((c) => c.parentId === null && !c.isSelectable);
  const childrenOf = (pid: string) =>
    all.filter((c) => c.parentId === pid && c.isSelectable);

  return roots.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    sortOrder: p.sortOrder,
    txAsParentCount: parentMap.get(p.id) ?? 0,
    children: childrenOf(p.id).map((ch) => ({
      id: ch.id,
      name: ch.name,
      type: ch.type,
      sortOrder: ch.sortOrder,
      txCount: leafMap.get(ch.id) ?? 0,
    })),
  }));
}

export async function createCategoryParent(
  db: Db,
  userId: string,
  name: string,
  type: TransactionType
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: "Name required" };
  }

  const dup = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.userId, userId),
        isNull(categories.parentId),
        eq(categories.name, trimmed)
      )
    )
    .limit(1);
  if (dup.length > 0) {
    return {
      ok: false,
      error: "A parent group with that name already exists",
    };
  }

  const [agg] = await db
    .select({
      maxSo: sql<number>`coalesce(max(${categories.sortOrder}), 0)::int`,
    })
    .from(categories)
    .where(and(eq(categories.userId, userId), isNull(categories.parentId)));

  const sortOrder = (Number(agg?.maxSo) || 0) + 10;

  const [row] = await db
    .insert(categories)
    .values({
      userId,
      name: trimmed,
      parentId: null,
      type,
      isSelectable: false,
      sortOrder,
    })
    .returning({ id: categories.id });

  if (!row) return { ok: false, error: "Failed to create" };
  return { ok: true, id: row.id };
}

export async function createCategorySub(
  db: Db,
  userId: string,
  parentId: string,
  name: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: "Name required" };
  }

  const [parent] = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.id, parentId),
        eq(categories.userId, userId),
        isNull(categories.parentId)
      )
    )
    .limit(1);

  if (!parent || parent.isSelectable) {
    return { ok: false, error: "Invalid parent group" };
  }

  const dup = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.userId, userId),
        eq(categories.parentId, parentId),
        eq(categories.name, trimmed)
      )
    )
    .limit(1);
  if (dup.length > 0) {
    return {
      ok: false,
      error: "That subcategory name already exists under this group",
    };
  }

  const [agg] = await db
    .select({
      maxSo: sql<number>`coalesce(max(${categories.sortOrder}), 0)::int`,
    })
    .from(categories)
    .where(
      and(eq(categories.userId, userId), eq(categories.parentId, parentId))
    );

  const sortOrder = (Number(agg?.maxSo) || 0) + 1;

  const [row] = await db
    .insert(categories)
    .values({
      userId,
      name: trimmed,
      parentId,
      type: parent.type,
      isSelectable: true,
      sortOrder,
    })
    .returning({ id: categories.id });

  if (!row) return { ok: false, error: "Failed to create" };
  return { ok: true, id: row.id };
}

export async function updateCategoryName(
  db: Db,
  userId: string,
  categoryId: string,
  name: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: "Name required" };
  }

  const [row] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
    .limit(1);
  if (!row) {
    return { ok: false, error: "Category not found" };
  }

  const parentScope = row.parentId;
  const dupWhere =
    parentScope === null
      ? and(
          eq(categories.userId, userId),
          isNull(categories.parentId),
          eq(categories.name, trimmed)
        )
      : and(
          eq(categories.userId, userId),
          eq(categories.parentId, parentScope),
          eq(categories.name, trimmed)
        );

  const dup = await db
    .select({ id: categories.id })
    .from(categories)
    .where(dupWhere)
    .limit(1);
  if (dup.length > 0 && dup[0].id !== categoryId) {
    return {
      ok: false,
      error:
        parentScope === null
          ? "A parent group with that name already exists"
          : "That name is already used in this group",
    };
  }

  const updated = await db
    .update(categories)
    .set({ name: trimmed })
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
    .returning({ id: categories.id });
  if (updated.length === 0) {
    return { ok: false, error: "Category not found" };
  }
  return { ok: true };
}

export async function deleteCategoryIfUnused(
  db: Db,
  userId: string,
  categoryId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [row] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
    .limit(1);
  if (!row) {
    return { ok: false, error: "Category not found" };
  }

  const isParentGroup = row.parentId === null && !row.isSelectable;

  if (isParentGroup) {
    const [kid] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.parentId, categoryId),
          eq(categories.userId, userId)
        )
      )
      .limit(1);
    if (kid) {
      return {
        ok: false,
        error: "Remove subcategories before deleting this group.",
      };
    }
    const [pc] = await db
      .select({ n: count() })
      .from(transactions)
      .where(
        and(
          eq(transactions.parentCategoryId, categoryId),
          eq(transactions.userId, userId)
        )
      );
    if (Number(pc?.n ?? 0) > 0) {
      return {
        ok: false,
        error:
          "Transactions reference this group. Reassign those rows before deleting.",
      };
    }
  } else {
    const [tc] = await db
      .select({ n: count() })
      .from(transactions)
      .where(
        and(
          eq(transactions.categoryId, categoryId),
          eq(transactions.userId, userId)
        )
      );
    if (Number(tc?.n ?? 0) > 0) {
      return {
        ok: false,
        error:
          "This subcategory is used on transactions. Change those rows before deleting.",
      };
    }
  }

  const removed = await db
    .delete(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
    .returning({ id: categories.id });
  if (removed.length === 0) {
    return { ok: false, error: "Category not found" };
  }
  return { ok: true };
}

export async function listLocations(db: Db, userId: string) {
  return db
    .select()
    .from(locations)
    .where(eq(locations.userId, userId))
    .orderBy(locations.name);
}

export async function listSelectableCategories(db: Db, userId: string) {
  const all = await db
    .select()
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(categories.sortOrder);
  return all;
}

// (borrow accounts removed) use contacts for loan people
