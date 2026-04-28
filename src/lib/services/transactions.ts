import type postgres from "postgres";

import { pingPostgres, type Db } from "@/lib/db/core/client";
import { db as serverDb } from "@/lib/db/core/server";
import type { TransactionType } from "@/lib/db/schema";
import type { CategoryRow, ContactRow, CompanyRow, LocationRow } from "@/lib/db/schema";
import { sqlAnd, sqlOr } from "@/lib/db/sql/fragments";
import { postgresSqlState } from "@/lib/db/core/postgres";
import {
  GIFTS_OCCASIONS_PARENT_NAME,
  SALARY_WAGES_PARENT_NAME,
  giftRecipientRequiredForSubcategory,
} from "@/lib/constants/category-rules";
import {
  formatLocalYMD,
  localCalendarMonthRange,
  resolveTransactionDateCondition,
} from "@/lib/utilities/date-presets";
import type { DatePreset } from "@/lib/types/filters";
import type {
  CreateTransactionInput,
  DashboardMonthSlice,
  DashboardPayload,
  DashboardRecentRow,
  SuggestionDTO,
  TransactionRowDTO,
} from "@/lib/types/transactions";
import { parseAmountString } from "@/lib/services/ledger";

type PgSql = postgres.PendingQuery<readonly postgres.MaybeRow[]>;

const DASHBOARD_TREND_MONTHS = 10;
const DASHBOARD_RECENT_LIMIT = 12;

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
  db: Db,
  q: string | undefined,
  userId: string,
): PgSql | undefined {
  const raw = q?.trim();
  if (!raw || raw.length > 120) return undefined;
  const pattern = `%${escapeIlikePattern(raw)}%`;
  return sqlOr(db, [
    db`exists (
      select 1 from categories c
      where c.id = t.category_id
      and c.user_id = ${userId}
      and c.name ilike ${pattern} escape '\'
    )`,
    db`exists (
      select 1 from categories c
      where c.id = t.parent_category_id
      and c.user_id = ${userId}
      and c.name ilike ${pattern} escape '\'
    )`,
  ]);
}

function scopedTransactionsWhere(
  db: Db,
  userId: string,
  preset: DatePreset,
  extra: TransactionListFilters | undefined,
  now: Date,
): PgSql {
  const fromDate = extra?.fromDate ?? null;
  const toDate = extra?.toDate ?? null;
  return sqlAnd(db, [
    db`t.user_id = ${userId}`,
    resolveTransactionDateCondition(db, preset, fromDate, toDate, now),
    extra?.locationId ? db`t.location_id = ${extra.locationId}` : undefined,
    categoryNameSearchCondition(db, extra?.categoryContains, userId),
  ]);
}

function num(v: string | null | undefined): number {
  if (v == null || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function mapCategoryRow(r: Record<string, unknown>): CategoryRow {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    name: String(r.name),
    parentId: r.parent_id != null ? String(r.parent_id) : null,
    type: r.type as TransactionType,
    isSelectable: Boolean(r.is_selectable),
    sortOrder: Number(r.sort_order ?? 0),
  };
}

function mapContactRow(r: Record<string, unknown>): ContactRow {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    name: String(r.name),
  };
}

function mapLocationRow(r: Record<string, unknown>): LocationRow {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    name: String(r.name),
  };
}

function mapCompanyRow(r: Record<string, unknown>): CompanyRow {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    name: String(r.name),
  };
}

export async function sumByTypeForUser(
  db: Db,
  userId: string,
  extra?: PgSql,
): Promise<Record<string, number>> {
  const whereClause = extra
    ? sqlAnd(db, [db`user_id = ${userId}`, extra])
    : db`user_id = ${userId}`;

  const rows = await db`
    select
      type,
      coalesce(
        sum(
          case
            when type = 'EXPENSE' then amount - coalesce(investment_used_amount, 0)
            else amount
          end
        )::text,
        '0'
      ) as total
    from transactions
    where ${whereClause}
    group by type
  `;

  const out: Record<string, number> = {};
  for (const r of rows) {
    out[String(r.type)] = num(r.total as string);
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

export function pendingReceivableFromSums(sums: Record<string, number>): number {
  return (sums.LEND ?? 0) - (sums.RECEIVE ?? 0);
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
  end: string,
): Promise<DashboardMonthSlice> {
  const range = sqlAnd(db, [
    db`transaction_date >= ${start}`,
    db`transaction_date <= ${end}`,
  ]);
  const sums = await sumByTypeForUser(db, userId, range);
  return monthSliceFromSums(sums);
}

function lastNCalendarMonthKeys(n: number, now: Date): string[] {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

export async function expenseMonthlyTrendLastN(
  db: Db,
  userId: string,
  n: number,
  now: Date,
): Promise<{ month: string; expense: number }[]> {
  const keys = lastNCalendarMonthKeys(n, now);
  const startStr = `${keys[0]}-01`;
  const [ey, em] = keys[keys.length - 1]!.split("-").map(Number);
  const endD = new Date(ey!, em!, 0);
  const endStr = formatLocalYMD(endD);

  const rows = await db`
    select
      to_char(transaction_date, 'YYYY-MM') as ym,
      coalesce(sum(amount - coalesce(investment_used_amount, 0))::text, '0') as total
    from transactions
    where user_id = ${userId}
      and type = 'EXPENSE'
      and transaction_date >= ${startStr}
      and transaction_date <= ${endStr}
    group by to_char(transaction_date, 'YYYY-MM')
  `;

  const byYm = new Map<string, number>();
  for (const r of rows) {
    byYm.set(String(r.ym), num(r.total as string));
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
  toDateStr: string,
): Promise<DashboardRecentRow[]> {
  const rows = await db`
    select
      t.id,
      t.type,
      t.amount,
      t.note,
      t.transaction_date::text as transaction_date,
      t.transaction_time::text as transaction_time,
      cat.name as category_name,
      pc.name as parent_category_name,
      loc.name as location_name
    from transactions t
    left join categories cat
      on cat.id = t.category_id and cat.user_id = ${userId}
    left join categories pc
      on pc.id = t.parent_category_id and pc.user_id = ${userId}
    left join locations loc
      on loc.id = t.location_id and loc.user_id = ${userId}
    where t.user_id = ${userId}
      and t.transaction_date >= ${fromDateStr}
      and t.transaction_date <= ${toDateStr}
    order by t.transaction_date desc, t.transaction_time desc
    limit ${limit}
  `;

  return rows.map((r) => {
    const categoryName = r.category_name != null ? String(r.category_name) : null;
    const parentCategoryName = r.parent_category_name != null ? String(r.parent_category_name) : null;
    const noteStr = r.note != null ? String(r.note) : null;
    const title =
      noteStr?.trim() || categoryName || parentCategoryName || String(r.type);
    return {
      id: String(r.id),
      type: r.type as TransactionType,
      amount: num(String(r.amount)),
      title,
      transactionDate: String(r.transaction_date),
      transactionTime: String(r.transaction_time),
      locationName: r.location_name != null ? String(r.location_name) : null,
    };
  });
}

export async function loadDashboard(
  db: Db,
  userId: string,
  now = new Date(),
): Promise<DashboardPayload> {
  await pingPostgres();

  const thisStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const thisStartStr = formatLocalYMD(thisStart);
  const thisEndStr = formatLocalYMD(thisEnd);

  const allSums = await sumByTypeForUser(db, userId);
  const thisMonth = await dashboardMonthStats(db, userId, thisStartStr, thisEndStr);
  const monthlyExpenseTrend = await expenseMonthlyTrendLastN(
    db,
    userId,
    DASHBOARD_TREND_MONTHS,
    now,
  );
  const recentActivity = await recentActivityForDashboard(
    db,
    userId,
    DASHBOARD_RECENT_LIMIT,
    thisStartStr,
    thisEndStr,
  );

  const cumulativeBalance = balanceFromSums(allSums);
  const cumulativePendingLiability = pendingLiabilityFromSums(allSums);
  const cumulativePendingReceivable = pendingReceivableFromSums(allSums);

  return {
    thisMonth,
    cumulativeBalance,
    cumulativePendingLiability,
    cumulativePendingReceivable,
    monthlyExpenseTrend,
    recentActivity,
  };
}

export async function lifetimeExpense(db: Db, userId: string): Promise<number> {
  const [row] = await db`
    select coalesce(sum(amount)::text, '0') as total
    from transactions
    where user_id = ${userId} and type = 'EXPENSE'
  `;
  return num(row?.total as string | undefined);
}

export async function locationExpenseForRange(
  db: Db,
  userId: string,
  start: string,
  end: string,
): Promise<{ locationId: string; name: string; total: number }[]> {
  const rows = await db`
    select
      t.location_id,
      loc.name as location_name,
      coalesce(sum(t.amount)::text, '0') as total
    from transactions t
    left join locations loc
      on loc.id = t.location_id and loc.user_id = ${userId}
    where t.user_id = ${userId}
      and t.type = 'EXPENSE'
      and t.transaction_date >= ${start}
      and t.transaction_date <= ${end}
      and t.location_id is not null
    group by t.location_id, loc.name
  `;

  return rows
    .filter((r) => r.location_id != null)
    .map((r) => ({
      locationId: String(r.location_id),
      name: r.location_name != null ? String(r.location_name) : "Unknown",
      total: num(r.total as string),
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
  now = new Date(),
): Promise<TransactionRowDTO[]> {
  const whereClause = scopedTransactionsWhere(
    db,
    userId,
    filters.datePreset,
    {
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      categoryContains: filters.categoryContains,
      locationId: filters.locationId,
    },
    now,
  );

  const rows = await db`
    select
      t.id,
      t.type,
      t.amount,
      t.category_id,
      t.parent_category_id,
      t.investment_used_amount,
      t.investment_used_category_id,
      t.investment_used_parent_category_id,
      t.location_id,
      t.contact_id,
      t.company_id,
      t.note,
      t.transaction_date::text as transaction_date,
      t.transaction_time::text as transaction_time,
      cat.name as category_name,
      pc.name as parent_category_name,
      inv_cat.name as investment_used_category_name,
      inv_pc.name as investment_used_parent_category_name,
      loc.name as location_name,
      ct.name as contact_name,
      co.name as company_name
    from transactions t
    left join categories cat
      on cat.id = t.category_id and cat.user_id = ${userId}
    left join categories pc
      on pc.id = t.parent_category_id and pc.user_id = ${userId}
    left join categories inv_cat
      on inv_cat.id = t.investment_used_category_id and inv_cat.user_id = ${userId}
    left join categories inv_pc
      on inv_pc.id = t.investment_used_parent_category_id and inv_pc.user_id = ${userId}
    left join locations loc
      on loc.id = t.location_id and loc.user_id = ${userId}
    left join contacts ct
      on ct.id = t.contact_id and ct.user_id = ${userId}
    left join companies co
      on co.id = t.company_id and co.user_id = ${userId}
    where ${whereClause}
    order by t.transaction_date desc, t.transaction_time desc
  `;

  return rows.map((r) => ({
    id: String(r.id),
    type: r.type as TransactionType,
    amount: String(r.amount),
    categoryId: r.category_id != null ? String(r.category_id) : null,
    parentCategoryId: r.parent_category_id != null ? String(r.parent_category_id) : null,
    investmentUsedAmount: r.investment_used_amount != null ? String(r.investment_used_amount) : null,
    investmentUsedCategoryId: r.investment_used_category_id != null ? String(r.investment_used_category_id) : null,
    investmentUsedParentCategoryId: r.investment_used_parent_category_id != null ? String(r.investment_used_parent_category_id) : null,
    locationId: r.location_id != null ? String(r.location_id) : null,
    contactId: r.contact_id != null ? String(r.contact_id) : null,
    companyId: r.company_id != null ? String(r.company_id) : null,
    note: r.note != null ? String(r.note) : null,
    transactionDate: String(r.transaction_date),
    transactionTime: String(r.transaction_time),
    categoryName: r.category_name != null ? String(r.category_name) : null,
    parentCategoryName: r.parent_category_name != null ? String(r.parent_category_name) : null,
    investmentUsedCategoryName:
      r.investment_used_category_name != null ? String(r.investment_used_category_name) : null,
    investmentUsedParentCategoryName:
      r.investment_used_parent_category_name != null ? String(r.investment_used_parent_category_name) : null,
    locationName: r.location_name != null ? String(r.location_name) : null,
    contactName: r.contact_name != null ? String(r.contact_name) : null,
    companyName: r.company_name != null ? String(r.company_name) : null,
  }));
}

export async function getSuggestions(db: Db, userId: string): Promise<SuggestionDTO> {
  const recent = await db`
    select category_id, amount, location_id
    from transactions
    where user_id = ${userId}
    order by created_at desc
    limit 10
  `;

  if (recent.length === 0) {
    return { categoryId: null, amount: null, locationId: null };
  }

  const catCounts = new Map<string, number>();
  const locCounts = new Map<string, number>();
  let amountSum = 0;
  let n = 0;
  for (const t of recent) {
    if (t.category_id != null) {
      const id = String(t.category_id);
      catCounts.set(id, (catCounts.get(id) ?? 0) + 1);
    }
    if (t.location_id != null) {
      const id = String(t.location_id);
      locCounts.set(id, (locCounts.get(id) ?? 0) + 1);
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
  input: CreateTransactionInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const [catRow] = await db`
    select *
    from categories
    where id = ${input.categoryId} and user_id = ${userId}
    limit 1
  `;

  if (!catRow) {
    return { ok: false, error: "Category not found" };
  }

  const cat = mapCategoryRow(catRow);

  if (input.locationId) {
    const [locRow] = await db`
      select id from locations
      where id = ${input.locationId} and user_id = ${userId}
      limit 1
    `;
    if (!locRow) {
      return { ok: false, error: "Location not found" };
    }
  }
  if (!cat.isSelectable) {
    return { ok: false, error: "Category is not selectable" };
  }

  const type = cat.type;

  const amountStored = parseAmountString(input.amount ?? "");
  if (!amountStored) {
    return { ok: false, error: "Invalid amount" };
  }
  const amt = Number(amountStored);
  if (!Number.isFinite(amt) || amt <= 0) {
    return { ok: false, error: "Invalid amount" };
  }

  const investmentUsedCategoryIdRaw = input.investmentUsedCategoryId?.trim() || null;
  const investmentUsedAmountRaw = input.investmentUsedAmount?.trim() || null;
  const wantsInvestmentFunding = !!investmentUsedCategoryIdRaw || !!investmentUsedAmountRaw;

  if (wantsInvestmentFunding && type !== "EXPENSE") {
    return { ok: false, error: "Investment funding is only available for Expenses." };
  }

  let investmentUsedAmountStored: string | null = null;
  let investmentUsedCategoryIdStored: string | null = null;
  let investmentUsedParentCategoryIdStored: string | null = null;

  if (wantsInvestmentFunding) {
    if (!investmentUsedCategoryIdRaw) {
      return { ok: false, error: "Pick which investment subcategory you used." };
    }
    if (!investmentUsedAmountRaw) {
      return { ok: false, error: "Enter how much investment you used." };
    }

    const usedStored = parseAmountString(investmentUsedAmountRaw);
    if (!usedStored) return { ok: false, error: "Invalid investment-used amount." };
    const used = Number(usedStored);
    if (!Number.isFinite(used) || used <= 0) {
      return { ok: false, error: "Invalid investment-used amount." };
    }
    if (used - amt > 1e-9) {
      return { ok: false, error: "Investment-used amount cannot exceed expense amount." };
    }

    const [invLeafRow] = await db`
      select id, parent_id, type, is_selectable
      from categories
      where id = ${investmentUsedCategoryIdRaw} and user_id = ${userId}
      limit 1
    `;
    if (!invLeafRow) return { ok: false, error: "Investment subcategory not found." };
    if (String(invLeafRow.type) !== "INVESTMENT") {
      return { ok: false, error: "Selected funding category is not an investment subcategory." };
    }
    if (invLeafRow.is_selectable !== true) {
      return { ok: false, error: "Selected investment category is not selectable." };
    }

    const invParentId =
      invLeafRow.parent_id != null ? String(invLeafRow.parent_id) : null;
    if (!invParentId) {
      return { ok: false, error: "Investment subcategory is missing a parent group." };
    }

    // Ensure you don't overdraw this investment subcategory (net of prior uses).
    const [netRow] = await db`
      select
        coalesce(sum(case when type = 'INVESTMENT' and category_id = ${investmentUsedCategoryIdRaw} then amount else 0 end)::text, '0') as invested,
        coalesce(sum(case when type = 'EXPENSE' and investment_used_category_id = ${investmentUsedCategoryIdRaw} then investment_used_amount else 0 end)::text, '0') as used
      from transactions
      where user_id = ${userId}
    `;
    const invested = num((netRow as { invested?: string } | undefined)?.invested);
    const usedSoFar = num((netRow as { used?: string } | undefined)?.used);
    const available = invested - usedSoFar;
    if (used > available + 1e-9) {
      return {
        ok: false,
        error: `Not enough available in that investment. Available: ${available.toFixed(2)}`,
      };
    }

    investmentUsedAmountStored = usedStored;
    investmentUsedCategoryIdStored = investmentUsedCategoryIdRaw;
    investmentUsedParentCategoryIdStored = invParentId;
  }

  const loanTypes =
    type === "BORROW" ||
    type === "REPAYMENT" ||
    type === "LEND" ||
    type === "RECEIVE";

  const [parentCatRow] = cat.parentId
    ? await db`
        select name from categories
        where id = ${cat.parentId} and user_id = ${userId}
        limit 1
      `
    : [undefined];
  const parentCategoryName =
    parentCatRow?.name != null ? String(parentCatRow.name) : null;

  const needsSalaryCompany =
    parentCategoryName === SALARY_WAGES_PARENT_NAME && type === "INCOME";
  const needsGiftRecipient =
    parentCategoryName === GIFTS_OCCASIONS_PARENT_NAME &&
    type === "EXPENSE" &&
    giftRecipientRequiredForSubcategory(cat.name);
  const needsRechargeContact =
    type === "EXPENSE" && cat.name === "Mobile Recharge";

  let companyIdStored: string | null = null;
  if (needsSalaryCompany) {
    const coId = input.companyId?.trim() || null;
    if (!coId) {
      return {
        ok: false,
        error: "Employer (company) is required for Salary & Wages.",
      };
    }
    const [co] = await db`
      select id from companies
      where id = ${coId} and user_id = ${userId}
      limit 1
    `;
    if (!co) {
      return { ok: false, error: "Invalid company" };
    }
    companyIdStored = coId;
  }

  const rawContact = input.contactId?.trim() || null;
  let contactIdStored: string | null = null;

  if (needsGiftRecipient && !rawContact) {
    return { ok: false, error: "Select who this gift is for (contact)." };
  }
  if (needsRechargeContact && !rawContact) {
    return { ok: false, error: "Contact is required for Mobile Recharge." };
  }

  if (loanTypes) {
    if (!rawContact) {
      return { ok: false, error: "Contact is required for loan transactions" };
    }
    const [conRow] = await db`
      select id from contacts
      where id = ${rawContact} and user_id = ${userId}
      limit 1
    `;
    if (!conRow) {
      return { ok: false, error: "Invalid contact" };
    }
    contactIdStored = rawContact;

    const sumsForLoans = await sumByTypeForUser(db, userId);
    if (type === "REPAYMENT") {
      const globalYouOwe = pendingLiabilityFromSums(sumsForLoans);
      if (globalYouOwe <= 1e-9) {
        return {
          ok: false,
          error: "No outstanding borrow to repay. Add a borrow entry first.",
        };
      }
      if (amt > globalYouOwe + 1e-9) {
        return {
          ok: false,
          error: `Repayment exceeds total borrow outstanding (${globalYouOwe.toFixed(2)})`,
        };
      }
    }
    if (type === "RECEIVE") {
      const globalTheyOweYou = pendingReceivableFromSums(sumsForLoans);
      if (globalTheyOweYou <= 1e-9) {
        return {
          ok: false,
          error: "No outstanding lend balance to receive against.",
        };
      }
      if (amt > globalTheyOweYou + 1e-9) {
        return {
          ok: false,
          error: `Amount exceeds total they owe you (${globalTheyOweYou.toFixed(2)})`,
        };
      }
    }
  } else if (rawContact) {
    const [conRow] = await db`
      select id from contacts
      where id = ${rawContact} and user_id = ${userId}
      limit 1
    `;
    if (!conRow) {
      return { ok: false, error: "Invalid contact" };
    }
    contactIdStored = rawContact;
  }

  if (needsGiftRecipient && !contactIdStored) {
    return {
      ok: false,
      error: "Select who this gift is for (contact).",
    };
  }

  {
    const isCashOutflow =
      type === "EXPENSE" ||
      type === "INVESTMENT" ||
      type === "REPAYMENT" ||
      type === "LEND";
    if (isCashOutflow) {
      // When an expense is funded by investment withdrawal, don't block on cash balance.
      if (type === "EXPENSE" && investmentUsedAmountStored != null) {
        // no-op
      } else {
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
  }

  const accountRows = await db`
    select id, name from accounts where user_id = ${userId}
  `;

  const accountId =
    accountRows.find((a) => String(a.name) === "Cash")?.id ?? accountRows[0]?.id ?? null;

  if (!accountId) {
    return {
      ok: false,
      error:
        "No account found for your profile. Add an account (e.g. Cash) or finish signup.",
    };
  }

  const parentCategoryId = cat.parentId;
  const locationIdStored = input.locationId?.trim() || null;

  let inserted: { id: string } | undefined;
  try {
    const rows = await db`
      insert into transactions ${db({
        user_id: userId,
        type,
        amount: amountStored,
        category_id: input.categoryId,
        parent_category_id: parentCategoryId,
        investment_used_amount: investmentUsedAmountStored,
        investment_used_category_id: investmentUsedCategoryIdStored,
        investment_used_parent_category_id: investmentUsedParentCategoryIdStored,
        location_id: locationIdStored,
        contact_id: contactIdStored,
        company_id: companyIdStored,
        account_id: String(accountId),
        note: input.note?.trim() || null,
        transaction_date: input.transactionDate,
        transaction_time: input.transactionTime,
      })}
      returning id
    `;
    inserted = rows[0] as { id: string } | undefined;
  } catch (e) {
    const code = postgresSqlState(e);
    if (code === "42501") {
      return {
        ok: false,
        error:
          "Database blocked this row (permissions). If you use Supabase, ensure the server uses a role that bypasses RLS or add policies for inserts.",
      };
    }
    if (code === "23503") {
      return {
        ok: false,
        error: "Save failed: linked account, category, or location is invalid.",
      };
    }
    throw e;
  }

  if (!inserted) {
    return { ok: false, error: "Insert failed" };
  }

  return { ok: true, id: String(inserted.id) };
}

export async function monthlyTrend(
  db: Db,
  userId: string,
  preset: DatePreset,
  filters?: TransactionListFilters,
  now = new Date(),
): Promise<{ key: string; income: number; expense: number; investment: number }[]> {
  const base = scopedTransactionsWhere(db, userId, preset, filters, now);

  const rows = await db`
    select
      to_char(t.transaction_date, 'YYYY-MM') as ym,
      t.type,
      coalesce(sum(t.amount)::text, '0') as total
    from transactions t
    where ${base}
    group by to_char(t.transaction_date, 'YYYY-MM'), t.type
    order by to_char(t.transaction_date, 'YYYY-MM')
  `;

  const byMonth = new Map<string, { income: number; expense: number; investment: number }>();
  for (const r of rows) {
    const ym = String(r.ym);
    if (!byMonth.has(ym)) {
      byMonth.set(ym, { income: 0, expense: 0, investment: 0 });
    }
    const b = byMonth.get(ym)!;
    const tval = num(r.total as string);
    const typ = r.type as string;
    if (typ === "INCOME") b.income += tval;
    if (typ === "EXPENSE") b.expense += tval;
    if (typ === "INVESTMENT") b.investment += tval;
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
  now = new Date(),
): Promise<{ name: string; total: number }[]> {
  const scope = scopedTransactionsWhere(db, userId, preset, filters, now);
  const base = sqlAnd(db, [scope, db`t.type = 'EXPENSE'`]);

  const rows = await db`
    select
      coalesce(exp_parent.name, 'Uncategorized') as parent_name,
      coalesce(sum(t.amount)::text, '0') as total
    from transactions t
    left join categories exp_parent
      on exp_parent.id = t.parent_category_id and exp_parent.user_id = ${userId}
    where ${base}
    group by t.parent_category_id, exp_parent.name
  `;

  return rows.map((r) => ({
    name: r.parent_name != null ? String(r.parent_name) : "Uncategorized",
    total: num(r.total as string),
  }));
}

export async function locationExpenseBreakdown(
  db: Db,
  userId: string,
  preset: DatePreset,
  filters?: TransactionListFilters,
  now = new Date(),
): Promise<{ name: string; total: number }[]> {
  const scope = scopedTransactionsWhere(db, userId, preset, filters, now);
  const base = sqlAnd(db, [
    scope,
    db`t.type = 'EXPENSE'`,
    db`t.location_id is not null`,
  ]);

  const rows = await db`
    select
      loc.name as location_name,
      coalesce(sum(t.amount)::text, '0') as total
    from transactions t
    inner join locations loc
      on loc.id = t.location_id and loc.user_id = ${userId}
    where ${base}
    group by loc.name
  `;

  return rows.map((r) => ({
    name: String(r.location_name),
    total: num(r.total as string),
  }));
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
  toYMD: string,
): Promise<Map<string, LeafExpenseBucket>> {
  const rows = await db`
    select
      t.category_id,
      coalesce(cat.name, 'Uncategorized') as leaf_name,
      coalesce(sum(t.amount)::text, '0') as total
    from transactions t
    left join categories cat
      on cat.id = t.category_id and cat.user_id = ${userId}
    where t.user_id = ${userId}
      and t.type = 'EXPENSE'
      and t.transaction_date >= ${fromYMD}
      and t.transaction_date <= ${toYMD}
    group by t.category_id, cat.name
  `;

  const map = new Map<string, LeafExpenseBucket>();
  for (const r of rows) {
    const id = r.category_id != null ? String(r.category_id) : "__uncategorized__";
    map.set(id, {
      label: r.leaf_name != null ? String(r.leaf_name) : "Uncategorized",
      total: num(r.total as string),
    });
  }
  return map;
}

/** Leaf category expense: this calendar month vs previous, sorted by max of the two totals. */
export async function categoryVsLastMonthSnapshot(
  db: Db,
  userId: string,
  now = new Date(),
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
      thisMap.get(id)?.label ?? lastMap.get(id)?.label ?? "Uncategorized";
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
      Math.max(b.thisMonth, b.lastMonth) - Math.max(a.thisMonth, a.lastMonth),
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

export async function listContacts(db: Db, userId: string): Promise<ContactRow[]> {
  const rows = await db`
    select id, user_id, name from contacts
    where user_id = ${userId}
    order by name
  `;
  return rows.map(mapContactRow);
}

export type ContactWithUsage = {
  id: string;
  name: string;
  txCount: number;
  ruleCount: number;
};

export async function listContactsWithUsage(
  db: Db,
  userId: string,
): Promise<ContactWithUsage[]> {
  const txRows = await db`
    select c.id, c.name, count(t.id)::int as tx_count
    from contacts c
    left join transactions t
      on t.contact_id = c.id and t.user_id = ${userId}
    where c.user_id = ${userId}
    group by c.id, c.name
  `;

  const ruleRows = await db`
    select contact_id, count(*)::int as n
    from rules
    where user_id = ${userId} and contact_id is not null
    group by contact_id
  `;

  const ruleByContact = new Map<string, number>();
  for (const r of ruleRows) {
    if (r.contact_id != null) {
      ruleByContact.set(String(r.contact_id), Number(r.n));
    }
  }

  return txRows
    .map((r) => ({
      id: String(r.id),
      name: String(r.name),
      txCount: Number(r.tx_count),
      ruleCount: ruleByContact.get(String(r.id)) ?? 0,
    }))
    .sort((a, b) => {
      const aUsed = a.txCount > 0 || a.ruleCount > 0;
      const bUsed = b.txCount > 0 || b.ruleCount > 0;
      if (aUsed !== bUsed) return aUsed ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

export async function createContact(
  db: Db,
  userId: string,
  name: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name required" };
  const [row] = await db`
    insert into contacts ${db({ user_id: userId, name: trimmed })}
    returning id
  `;
  if (!row) return { ok: false, error: "Failed" };
  return { ok: true, id: String(row.id) };
}

export async function updateContactForUser(
  db: Db,
  userId: string,
  contactId: string,
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name required" };
  const updated = await db`
    update contacts set name = ${trimmed}
    where id = ${contactId} and user_id = ${userId}
    returning id
  `;
  if (updated.length === 0) return { ok: false, error: "Contact not found" };
  return { ok: true };
}

export async function deleteContactIfUnused(
  db: Db,
  userId: string,
  contactId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [txN] = await db`
    select count(*)::int as n
    from transactions
    where user_id = ${userId} and contact_id = ${contactId}
  `;
  if (Number(txN?.n ?? 0) > 0) {
    return {
      ok: false,
      error:
        "This person is linked to transactions. Remove or change those entries before deleting.",
    };
  }
  const [ruleN] = await db`
    select count(*)::int as n
    from rules
    where user_id = ${userId} and contact_id = ${contactId}
  `;
  if (Number(ruleN?.n ?? 0) > 0) {
    return {
      ok: false,
      error:
        "This person is linked to quick entry rules. Remove or change those rules before deleting.",
    };
  }
  const removed = await db`
    delete from contacts
    where id = ${contactId} and user_id = ${userId}
    returning id
  `;
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
  userId: string,
): Promise<LocationWithUsage[]> {
  const rows = await db`
    select l.id, l.name, count(t.id)::int as tx_count
    from locations l
    left join transactions t
      on t.location_id = l.id and t.user_id = ${userId}
    where l.user_id = ${userId}
    group by l.id, l.name
    order by l.name
  `;

  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    txCount: Number(r.tx_count),
  }));
}

export async function updateLocationForUser(
  db: Db,
  userId: string,
  locationId: string,
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: "Name required" };
  }
  const dup = await db`
    select id from locations
    where user_id = ${userId} and name = ${trimmed}
    limit 1
  `;
  if (dup.length > 0 && String(dup[0]!.id) !== locationId) {
    return { ok: false, error: "A location with that name already exists" };
  }
  const updated = await db`
    update locations set name = ${trimmed}
    where id = ${locationId} and user_id = ${userId}
    returning id
  `;
  if (updated.length === 0) {
    return { ok: false, error: "Location not found" };
  }
  return { ok: true };
}

export async function deleteLocationIfUnused(
  db: Db,
  userId: string,
  locationId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [row] = await db`
    select count(*)::int as n
    from transactions
    where location_id = ${locationId} and user_id = ${userId}
  `;
  const n = Number(row?.n ?? 0);
  if (n > 0) {
    return {
      ok: false,
      error:
        "This location is used on transactions. Change or remove those rows before deleting.",
    };
  }
  const removed = await db`
    delete from locations
    where id = ${locationId} and user_id = ${userId}
    returning id
  `;
  if (removed.length === 0) {
    return { ok: false, error: "Location not found" };
  }
  return { ok: true };
}

export type CompanyWithUsage = {
  id: string;
  name: string;
  txCount: number;
};

export async function listCompaniesWithUsage(
  db: Db,
  userId: string,
): Promise<CompanyWithUsage[]> {
  const rows = await db`
    select c.id, c.name, count(t.id)::int as tx_count
    from companies c
    left join transactions t
      on t.company_id = c.id and t.user_id = ${userId}
    where c.user_id = ${userId}
    group by c.id, c.name
    order by c.name
  `;

  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    txCount: Number(r.tx_count),
  }));
}

export async function updateCompanyForUser(
  db: Db,
  userId: string,
  companyId: string,
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: "Name required" };
  }
  const dup = await db`
    select id from companies
    where user_id = ${userId} and name = ${trimmed}
    limit 1
  `;
  if (dup.length > 0 && String(dup[0]!.id) !== companyId) {
    return { ok: false, error: "A company with that name already exists" };
  }
  const updated = await db`
    update companies set name = ${trimmed}
    where id = ${companyId} and user_id = ${userId}
    returning id
  `;
  if (updated.length === 0) {
    return { ok: false, error: "Company not found" };
  }
  return { ok: true };
}

export async function deleteCompanyIfUnused(
  db: Db,
  userId: string,
  companyId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [row] = await db`
    select count(*)::int as n
    from transactions
    where company_id = ${companyId} and user_id = ${userId}
  `;
  const n = Number(row?.n ?? 0);
  if (n > 0) {
    return {
      ok: false,
      error:
        "This company is used on transactions. Change or remove those rows before deleting.",
    };
  }
  const removed = await db`
    delete from companies
    where id = ${companyId} and user_id = ${userId}
    returning id
  `;
  if (removed.length === 0) {
    return { ok: false, error: "Company not found" };
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
  userId: string,
): Promise<CategoryParentWithSubs[]> {
  const allRows = await db`
    select id, user_id, name, parent_id, type, is_selectable, sort_order
    from categories
    where user_id = ${userId}
    order by sort_order
  `;
  const all = allRows.map(mapCategoryRow);

  const leafAgg = await db`
    select category_id as cid, count(*)::int as n
    from transactions
    where user_id = ${userId} and category_id is not null
    group by category_id
  `;

  const parentAgg = await db`
    select parent_category_id as pid, count(*)::int as n
    from transactions
    where user_id = ${userId} and parent_category_id is not null
    group by parent_category_id
  `;

  const leafMap = new Map<string, number>();
  for (const r of leafAgg) {
    if (r.cid != null) leafMap.set(String(r.cid), Number(r.n));
  }
  const parentMap = new Map<string, number>();
  for (const r of parentAgg) {
    if (r.pid != null) parentMap.set(String(r.pid), Number(r.n));
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
  type: TransactionType,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: "Name required" };
  }

  const dup = await db`
    select id from categories
    where user_id = ${userId}
      and parent_id is null
      and name = ${trimmed}
    limit 1
  `;
  if (dup.length > 0) {
    return {
      ok: false,
      error: "A parent group with that name already exists",
    };
  }

  const [agg] = await db`
    select coalesce(max(sort_order), 0)::int as max_so
    from categories
    where user_id = ${userId} and parent_id is null
  `;

  const sortOrder = (Number(agg?.max_so) || 0) + 10;

  const [row] = await db`
    insert into categories ${db({
      user_id: userId,
      name: trimmed,
      parent_id: null,
      type,
      is_selectable: false,
      sort_order: sortOrder,
    })}
    returning id
  `;

  if (!row) return { ok: false, error: "Failed to create" };
  return { ok: true, id: String(row.id) };
}

export async function createCategorySub(
  db: Db,
  userId: string,
  parentId: string,
  name: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: "Name required" };
  }

  const [parentRow] = await db`
    select id, user_id, name, parent_id, type, is_selectable, sort_order
    from categories
    where id = ${parentId} and user_id = ${userId} and parent_id is null
    limit 1
  `;

  const parent = parentRow ? mapCategoryRow(parentRow) : undefined;

  if (!parent || parent.isSelectable) {
    return { ok: false, error: "Invalid parent group" };
  }

  const dup = await db`
    select id from categories
    where user_id = ${userId}
      and parent_id = ${parentId}
      and name = ${trimmed}
    limit 1
  `;
  if (dup.length > 0) {
    return {
      ok: false,
      error: "That subcategory name already exists under this group",
    };
  }

  const [agg] = await db`
    select coalesce(max(sort_order), 0)::int as max_so
    from categories
    where user_id = ${userId} and parent_id = ${parentId}
  `;

  const sortOrder = (Number(agg?.max_so) || 0) + 1;

  const [row] = await db`
    insert into categories ${db({
      user_id: userId,
      name: trimmed,
      parent_id: parentId,
      type: parent.type,
      is_selectable: true,
      sort_order: sortOrder,
    })}
    returning id
  `;

  if (!row) return { ok: false, error: "Failed" };
  return { ok: true, id: String(row.id) };
}

export async function updateCategoryName(
  db: Db,
  userId: string,
  categoryId: string,
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: "Name required" };
  }

  const [row] = await db`
    select id, user_id, name, parent_id, type, is_selectable, sort_order
    from categories
    where id = ${categoryId} and user_id = ${userId}
    limit 1
  `;
  if (!row) {
    return { ok: false, error: "Category not found" };
  }

  const mapped = mapCategoryRow(row);
  const parentScope = mapped.parentId;
  const dup =
    parentScope === null
      ? await db`
          select id from categories
          where user_id = ${userId}
            and parent_id is null
            and name = ${trimmed}
          limit 1
        `
      : await db`
          select id from categories
          where user_id = ${userId}
            and parent_id = ${parentScope}
            and name = ${trimmed}
          limit 1
        `;

  if (dup.length > 0 && String(dup[0]!.id) !== categoryId) {
    return {
      ok: false,
      error:
        parentScope === null
          ? "A parent group with that name already exists"
          : "That name is already used in this group",
    };
  }

  const updated = await db`
    update categories set name = ${trimmed}
    where id = ${categoryId} and user_id = ${userId}
    returning id
  `;
  if (updated.length === 0) {
    return { ok: false, error: "Category not found" };
  }
  return { ok: true };
}

export async function updateCategory(
  db: Db,
  userId: string,
  categoryId: string,
  input: { name: string; type?: TransactionType },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = input.name.trim();
  if (!trimmed) {
    return { ok: false, error: "Name required" };
  }

  const [row] = await db`
    select id, user_id, name, parent_id, type, is_selectable, sort_order
    from categories
    where id = ${categoryId} and user_id = ${userId}
    limit 1
  `;
  if (!row) {
    return { ok: false, error: "Category not found" };
  }

  const mapped = mapCategoryRow(row);
  const parentScope = mapped.parentId;
  const dup =
    parentScope === null
      ? await db`
          select id from categories
          where user_id = ${userId}
            and parent_id is null
            and name = ${trimmed}
          limit 1
        `
      : await db`
          select id from categories
          where user_id = ${userId}
            and parent_id = ${parentScope}
            and name = ${trimmed}
          limit 1
        `;

  if (dup.length > 0 && String(dup[0]!.id) !== categoryId) {
    return {
      ok: false,
      error:
        parentScope === null
          ? "A parent group with that name already exists"
          : "That name is already used in this group",
    };
  }

  const isParentGroup = mapped.parentId === null && !mapped.isSelectable;
  const requestedType = isParentGroup ? (input.type ?? mapped.type) : mapped.type;

  if (isParentGroup && requestedType !== mapped.type) {
    const [usage] = await db`
      select count(*)::int as n
      from transactions
      where user_id = ${userId}
        and (
          parent_category_id = ${categoryId}
          or exists (
            select 1
            from categories c
            where c.user_id = ${userId}
              and c.parent_id = ${categoryId}
              and c.id = transactions.category_id
          )
        )
    `;
    if (Number(usage?.n ?? 0) > 0) {
      return {
        ok: false,
        error:
          "This parent or its subcategories are already used on transactions. Type cannot be changed.",
      };
    }
  }

  const nextType = requestedType;

  const updated = await db`
    update categories
    set name = ${trimmed}, type = ${nextType}
    where id = ${categoryId} and user_id = ${userId}
    returning id
  `;
  if (updated.length === 0) {
    return { ok: false, error: "Category not found" };
  }

  if (isParentGroup && nextType !== mapped.type) {
    await db`
      update categories
      set type = ${nextType}
      where user_id = ${userId} and parent_id = ${categoryId}
    `;
  }

  return { ok: true };
}

export async function deleteCategoryIfUnused(
  db: Db,
  userId: string,
  categoryId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [row] = await db`
    select id, user_id, name, parent_id, type, is_selectable, sort_order
    from categories
    where id = ${categoryId} and user_id = ${userId}
    limit 1
  `;
  if (!row) {
    return { ok: false, error: "Category not found" };
  }

  const mapped = mapCategoryRow(row);
  const isParentGroup = mapped.parentId === null && !mapped.isSelectable;

  if (isParentGroup) {
    const [kid] = await db`
      select id from categories
      where parent_id = ${categoryId} and user_id = ${userId}
      limit 1
    `;
    if (kid) {
      return {
        ok: false,
        error: "Remove subcategories before deleting this group.",
      };
    }
    const [pc] = await db`
      select count(*)::int as n
      from transactions
      where parent_category_id = ${categoryId} and user_id = ${userId}
    `;
    if (Number(pc?.n ?? 0) > 0) {
      return {
        ok: false,
        error:
          "Transactions reference this group. Reassign those rows before deleting.",
      };
    }
  } else {
    const [tc] = await db`
      select count(*)::int as n
      from transactions
      where category_id = ${categoryId} and user_id = ${userId}
    `;
    if (Number(tc?.n ?? 0) > 0) {
      return {
        ok: false,
        error:
          "This subcategory is used on transactions. Change those rows before deleting.",
      };
    }
  }

  const removed = await db`
    delete from categories
    where id = ${categoryId} and user_id = ${userId}
    returning id
  `;
  if (removed.length === 0) {
    return { ok: false, error: "Category not found" };
  }
  return { ok: true };
}

export async function listLocations(db: Db, userId: string): Promise<LocationRow[]> {
  const rows = await db`
    select id, user_id, name from locations
    where user_id = ${userId}
    order by name
  `;
  return rows.map(mapLocationRow);
}

export async function listCompanies(db: Db, userId: string): Promise<CompanyRow[]> {
  const rows = await db`
    select id, user_id, name from companies
    where user_id = ${userId}
    order by name
  `;
  return rows.map(mapCompanyRow);
}

export async function listSelectableCategories(db: Db, userId: string): Promise<CategoryRow[]> {
  const rows = await db`
    select id, user_id, name, parent_id, type, is_selectable, sort_order
    from categories
    where user_id = ${userId}
    order by sort_order
  `;
  return rows.map(mapCategoryRow);
}

export type RuleRowDTO = {
  id: string;
  keyword: string;
  note: string | null;
  categoryId: string | null;
  locationId: string | null;
  contactId: string | null;
};

export async function getRulesForUser(userId: string): Promise<RuleRowDTO[]> {
  const rows = await serverDb`
    select id, keyword, note, category_id, location_id, contact_id
    from rules
    where user_id = ${userId}
    order by keyword
  `;
  return rows.map((r) => ({
    id: String(r.id),
    keyword: String(r.keyword),
    note: r.note != null ? String(r.note) : null,
    categoryId: r.category_id != null ? String(r.category_id) : null,
    locationId: r.location_id != null ? String(r.location_id) : null,
    contactId: r.contact_id != null ? String(r.contact_id) : null,
  }));
}
