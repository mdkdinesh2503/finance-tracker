"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import type { DatePreset } from "@/lib/types/filters";
import type { CreateTransactionInput } from "@/lib/types/transactions";
import {
  createTransactionForUser,
  getSuggestions,
  listSelectableCategories,
  listTransactionsFiltered,
  listContacts,
  listLocations,
  listCompanies,
  createContact,
  deleteContactIfUnused,
  updateContactForUser,
} from "@/lib/services/transactions";
import { toTransactionsCsv } from "@/lib/utilities/csv";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db/server";
import {
  accounts,
  categories,
  companies,
  contacts,
  locations,
  rules,
  transactions,
  type TransactionType,
} from "@/lib/db/schema";
import {
  GIFTS_OCCASIONS_PARENT_NAME,
  SALARY_WAGES_PARENT_NAME,
  giftRecipientRequiredForSubcategory,
} from "@/lib/constants/category-rules";
import { parseAmountString } from "@/lib/services/ledger";
import { err, ok, type Result } from "@/lib/types/result";
import { inferQuickEntry, splitQuickInput } from "@/lib/services/quick-entry";
import { z } from "zod";
import { getLoansByContact } from "@/lib/services/queries";
import {
  balanceFromSums,
  pendingLiabilityFromSums,
  pendingReceivableFromSums,
  sumByTypeForUser,
} from "@/lib/services/transactions";

export async function fetchTransactionFormDataAction() {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Unauthorized" };
  const [categories, locs, contacts, cos, suggestions] = await Promise.all([
    listSelectableCategories(db, user.id),
    listLocations(db, user.id),
    listContacts(db, user.id),
    listCompanies(db, user.id),
    getSuggestions(db, user.id),
  ]);
  return {
    ok: true as const,
    categories,
    locations: locs,
    contacts,
    companies: cos,
    suggestions,
  };
}

export async function createTransactionAction(input: CreateTransactionInput) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Unauthorized" };
  const result = await createTransactionForUser(db, user.id, input);
  if (result.ok) {
    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    revalidatePath("/analytics");
    revalidatePath("/analytics/lending");
    revalidatePath("/analytics/income");
    revalidatePath("/analytics/income/salary");
    revalidatePath("/analytics/income/other");
    revalidatePath("/analytics/investments");
  }
  return result;
}

export async function fetchTransactionsListAction(filters: {
  datePreset: DatePreset;
  fromDate: string | null;
  toDate: string | null;
  categoryContains: string;
  locationId: string | null;
}) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Unauthorized" };
  const rows = await listTransactionsFiltered(db, user.id, filters);
  return { ok: true as const, rows };
}

export async function fetchUnsettledLoanContactsAction() {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Unauthorized" };
  const rows = await getLoansByContact(user.id);
  return { ok: true as const, unsettledContactIds: rows.map((r) => r.contactId) };
}

export async function exportTransactionsCsvAction(filters: {
  datePreset: DatePreset;
  fromDate: string | null;
  toDate: string | null;
  categoryContains: string;
  locationId: string | null;
}) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Unauthorized" };
  const rows = await listTransactionsFiltered(db, user.id, filters);
  const csv = toTransactionsCsv(
    rows.map((r) => ({
      transactionDate: r.transactionDate,
      transactionTime: r.transactionTime,
      type: r.type,
      amount: r.amount,
      categoryName: r.categoryName,
      locationName: r.locationName,
      note: r.note,
    }))
  );
  return { ok: true as const, csv, filename: `transactions-export.csv` };
}

export async function createContactAction(name: string) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Unauthorized" };
  const result = await createContact(db, user.id, name);
  if (result.ok) {
    revalidatePath("/settings");
    revalidatePath("/transactions/new");
  }
  return result;
}

export async function updateContactAction(
  contactId: string,
  name: string
) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Unauthorized" };
  const result = await updateContactForUser(db, user.id, contactId, name);
  if (result.ok) {
    revalidatePath("/settings");
    revalidatePath("/transactions/new");
  }
  return result;
}

export async function deleteContactAction(contactId: string) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Unauthorized" };
  const result = await deleteContactIfUnused(db, user.id, contactId);
  if (result.ok) {
    revalidatePath("/settings");
    revalidatePath("/transactions/new");
  }
  return result;
}

const transactionTypeSchema = z.enum([
  "EXPENSE",
  "INCOME",
  "BORROW",
  "REPAYMENT",
  "LEND",
  "RECEIVE",
  "INVESTMENT",
  "ADJUSTMENT",
]);

const uuidNullable = z.string().uuid().nullable().optional();

const createTransactionDirectSchema = z.object({
  type: transactionTypeSchema,
  amount: z.string().min(1),
  categoryId: uuidNullable,
  locationId: uuidNullable,
  contactId: uuidNullable,
  companyId: uuidNullable,
  accountId: z.string().uuid(),
  note: z.string().max(2000).optional().nullable(),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  transactionTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
});

const quickEntrySchema = z.object({
  text: z.string().min(1).max(500),
  accountId: z.string().uuid(),
  locationId: uuidNullable,
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  transactionTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
});

function normalizeTime(t: string): string {
  return t.length === 5 ? `${t}:00` : t;
}

function requireContactForLoan(
  type: TransactionType,
  contactId: string | null | undefined,
): string | null {
  const needs =
    type === "BORROW" ||
    type === "REPAYMENT" ||
    type === "LEND" ||
    type === "RECEIVE";
  if (needs && !contactId) return "Contact is required for loan transactions";
  return null;
}

function validateAmountForType(
  type: TransactionType,
  amountRaw: string,
): string | null {
  const trimmed = amountRaw.trim().replace(/,/g, "");
  if (type === "ADJUSTMENT") {
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n === 0) return "Invalid adjustment amount";
    return null;
  }
  const p = parseAmountString(trimmed);
  if (!p) return "Invalid amount";
  return null;
}

async function assertOwnershipAndCategoryType(opts: {
  userId: string;
  txType: TransactionType;
  accountId: string;
  categoryId: string | null | undefined;
  locationId: string | null | undefined;
  contactId: string | null | undefined;
  companyId: string | null | undefined;
}): Promise<
  | { error: string }
  | { parentCategoryId: string | null }
> {
  const { userId, txType, accountId, categoryId, locationId, contactId, companyId } =
    opts;

  const acc = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .limit(1);
  if (!acc[0]) return { error: "Invalid account" };

  let parentCategoryId: string | null = null;
  if (categoryId) {
    const cat = await db
      .select({
        id: categories.id,
        type: categories.type,
        parentId: categories.parentId,
      })
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
      .limit(1);
    if (!cat[0]) return { error: "Invalid category" };
    if (cat[0].type !== txType) {
      return { error: "Category type does not match transaction type" };
    }
    parentCategoryId = cat[0].parentId ?? null;
  }

  if (locationId) {
    const loc = await db
      .select({ id: locations.id })
      .from(locations)
      .where(and(eq(locations.id, locationId), eq(locations.userId, userId)))
      .limit(1);
    if (!loc[0]) return { error: "Invalid location" };
  }

  if (contactId) {
    const con = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)))
      .limit(1);
    if (!con[0]) return { error: "Invalid contact" };
  }

  if (companyId) {
    const co = await db
      .select({ id: companies.id })
      .from(companies)
      .where(and(eq(companies.id, companyId), eq(companies.userId, userId)))
      .limit(1);
    if (!co[0]) return { error: "Invalid company" };
  }

  return { parentCategoryId };
}

async function resolveTransactionTagFields(opts: {
  userId: string;
  categoryId: string | null | undefined;
  txType: TransactionType;
  contactId: string | null | undefined;
  companyId: string | null | undefined;
}): Promise<{ error: string } | { companyIdForInsert: string | null }> {
  const { userId, categoryId, txType, contactId, companyId } = opts;
  if (!categoryId) {
    return { companyIdForInsert: null };
  }
  const [cat] = await db
    .select({
      name: categories.name,
      parentId: categories.parentId,
    })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
    .limit(1);
  if (!cat) return { error: "Invalid category" };

  let parentName: string | null = null;
  if (cat.parentId) {
    const [p] = await db
      .select({ name: categories.name })
      .from(categories)
      .where(and(eq(categories.id, cat.parentId), eq(categories.userId, userId)))
      .limit(1);
    parentName = p?.name ?? null;
  }

  const needsGiftRecipient =
    parentName === GIFTS_OCCASIONS_PARENT_NAME &&
    txType === "EXPENSE" &&
    giftRecipientRequiredForSubcategory(cat.name);
  if (needsGiftRecipient && !contactId?.trim()) {
    return { error: "Select who this gift is for (contact)." };
  }

  const needsSalaryCompany =
    parentName === SALARY_WAGES_PARENT_NAME && txType === "INCOME";
  if (needsSalaryCompany) {
    const cid = companyId?.trim() || null;
    if (!cid) {
      return { error: "Employer (company) is required for Salary & Wages." };
    }
    const [co] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(and(eq(companies.id, cid), eq(companies.userId, userId)))
      .limit(1);
    if (!co) return { error: "Invalid company" };
    return { companyIdForInsert: cid };
  }

  return { companyIdForInsert: null };
}

/**
 * New direct-DB action matching the code you pasted.
 * Keep `createTransactionAction` (service-based) for existing UI compatibility.
 */
export async function createTransactionDirectAction(
  input: unknown,
): Promise<Result<{ id: string }>> {
  const user = await requireUser();
  const parsed = createTransactionDirectSchema.safeParse(input);
  if (!parsed.success) return err("Invalid transaction");

  const v = parsed.data;
  const amtErr = validateAmountForType(v.type, v.amount);
  if (amtErr) return err(amtErr);

  const amountStored =
    v.type === "ADJUSTMENT"
      ? Number(v.amount.trim().replace(/,/g, "")).toFixed(2)
      : parseAmountString(v.amount)!;

  const contactErr = requireContactForLoan(v.type, v.contactId ?? null);
  if (contactErr) return err(contactErr);

  const own = await assertOwnershipAndCategoryType({
    userId: user.id,
    txType: v.type,
    accountId: v.accountId,
    categoryId: v.categoryId ?? null,
    locationId: v.locationId ?? null,
    contactId: v.contactId ?? null,
    companyId: v.companyId ?? null,
  });
  if ("error" in own) return err(own.error);

  const tags = await resolveTransactionTagFields({
    userId: user.id,
    categoryId: v.categoryId ?? null,
    txType: v.type,
    contactId: v.contactId ?? null,
    companyId: v.companyId ?? null,
  });
  if ("error" in tags) return err(tags.error);

  if (v.contactId && (v.type === "REPAYMENT" || v.type === "RECEIVE")) {
    const amt = Number(amountStored);
    if (!Number.isFinite(amt) || amt <= 0) return err("Invalid amount");
    const sums = await sumByTypeForUser(db, user.id);
    if (v.type === "REPAYMENT") {
      const globalYouOwe = pendingLiabilityFromSums(sums);
      if (globalYouOwe <= 1e-9) {
        return err("No outstanding borrow to repay. Add a borrow entry first.");
      }
      if (amt > globalYouOwe + 1e-9) {
        return err(`Repayment exceeds total borrow outstanding (${globalYouOwe.toFixed(2)})`);
      }
    }
    if (v.type === "RECEIVE") {
      const globalTheyOweYou = pendingReceivableFromSums(sums);
      if (globalTheyOweYou <= 1e-9) {
        return err("No outstanding lend balance to receive against.");
      }
      if (amt > globalTheyOweYou + 1e-9) {
        return err(`Amount exceeds total they owe you (${globalTheyOweYou.toFixed(2)})`);
      }
    }
  }

  {
    const isCashOutflow =
      v.type === "EXPENSE" ||
      v.type === "INVESTMENT" ||
      v.type === "REPAYMENT" ||
      v.type === "LEND";
    if (isCashOutflow) {
      const rows = await db
        .select({
          type: transactions.type,
          total: sql<string>`coalesce(sum(${transactions.amount})::text, '0')`,
        })
        .from(transactions)
        .where(and(eq(transactions.userId, user.id), eq(transactions.accountId, v.accountId)))
        .groupBy(transactions.type);

      const sums: Record<string, number> = {};
      for (const r of rows) {
        const n = Number(r.total);
        sums[r.type] = Number.isFinite(n) ? n : 0;
      }

      const bal = balanceFromSums(sums);
      const amt = Number(amountStored);
      if (Number.isFinite(amt) && amt > bal + 1e-9) {
        return err(`Insufficient balance. Available: ${bal.toFixed(2)}`);
      }
    }
  }

  const [row] = await db
    .insert(transactions)
    .values({
      userId: user.id,
      type: v.type,
      amount: amountStored,
      categoryId: v.categoryId ?? null,
      parentCategoryId: own.parentCategoryId,
      locationId: v.locationId ?? null,
      contactId: v.contactId ?? null,
      companyId: tags.companyIdForInsert,
      accountId: v.accountId,
      note: v.note ?? null,
      transactionDate: v.transactionDate,
      transactionTime: normalizeTime(v.transactionTime),
    })
    .returning({ id: transactions.id });

  if (!row) return err("Failed to create transaction");

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/analytics");
  revalidatePath("/analytics/lending");
  revalidatePath("/analytics/income");
  revalidatePath("/analytics/income/salary");
  revalidatePath("/analytics/income/other");
  revalidatePath("/analytics/investments");
  return ok({ id: row.id });
}

export async function deleteTransactionDirectAction(
  id: string,
): Promise<Result<null>> {
  const user = await requireUser();
  const uuid = z.string().uuid().safeParse(id);
  if (!uuid.success) return err("Invalid id");

  const deleted = await db
    .delete(transactions)
    .where(and(eq(transactions.id, uuid.data), eq(transactions.userId, user.id)))
    .returning({ id: transactions.id });

  if (!deleted.length) return err("Not found");

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/analytics");
  revalidatePath("/analytics/lending");
  revalidatePath("/analytics/income");
  revalidatePath("/analytics/income/salary");
  revalidatePath("/analytics/income/other");
  revalidatePath("/analytics/investments");
  return ok(null);
}

export async function quickEntryAction(
  input: unknown,
): Promise<Result<{ id: string }>> {
  const user = await requireUser();
  const parsed = quickEntrySchema.safeParse(input);
  if (!parsed.success) return err("Invalid quick entry");

  const { text, accountId, locationId, transactionDate, transactionTime } =
    parsed.data;

  const { amountStr } = splitQuickInput(text);
  if (!amountStr) return err("Could not parse amount");

  const [contactRows, ruleRows] = await Promise.all([
    db
      .select({ id: contacts.id, name: contacts.name })
      .from(contacts)
      .where(eq(contacts.userId, user.id)),
    db
      .select({
        keyword: rules.keyword,
        note: rules.note,
        categoryId: rules.categoryId,
        locationId: rules.locationId,
        contactId: rules.contactId,
      })
      .from(rules)
      .where(eq(rules.userId, user.id)),
  ]);

  const inferred = inferQuickEntry(text, {
    contacts: contactRows,
    rules: ruleRows,
  });
  if (!inferred) return err("Could not parse entry");

  return createTransactionDirectAction({
    type: inferred.type,
    amount: inferred.amount,
    categoryId: inferred.categoryId,
    locationId: inferred.locationId ?? locationId ?? null,
    contactId: inferred.contactId,
    accountId,
    note: inferred.note,
    transactionDate,
    transactionTime: normalizeTime(transactionTime),
  });
}

export async function quickEntrySuggestAction(input: unknown): Promise<
  Result<{
    amount: string;
    type: TransactionType;
    categoryId: string | null;
    locationId: string | null;
    contactId: string | null;
    note: string;
  }>
> {
  const user = await requireUser();
  const schema = z.object({ text: z.string().min(1).max(500) });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return err("Invalid quick entry");

  const { text } = parsed.data;
  const { amountStr } = splitQuickInput(text);
  if (!amountStr) return err("Could not parse amount");

  const [contactRows, ruleRows] = await Promise.all([
    db
      .select({ id: contacts.id, name: contacts.name })
      .from(contacts)
      .where(eq(contacts.userId, user.id)),
    db
      .select({
        keyword: rules.keyword,
        note: rules.note,
        categoryId: rules.categoryId,
        locationId: rules.locationId,
        contactId: rules.contactId,
      })
      .from(rules)
      .where(eq(rules.userId, user.id)),
  ]);

  const inferred = inferQuickEntry(text, {
    contacts: contactRows,
    rules: ruleRows,
  });
  if (!inferred) return err("Could not parse entry");

  // Ensure ids are user-owned (defense-in-depth)
  let categoryId: string | null = inferred.categoryId;
  if (categoryId) {
    const [row] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.userId, user.id)))
      .limit(1);
    if (!row) categoryId = null;
  }
  let contactId: string | null = inferred.contactId;
  if (contactId) {
    const [row] = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(eq(contacts.id, contactId), eq(contacts.userId, user.id)))
      .limit(1);
    if (!row) contactId = null;
  }

  let locationId: string | null = inferred.locationId;
  if (locationId) {
    const [row] = await db
      .select({ id: locations.id })
      .from(locations)
      .where(and(eq(locations.id, locationId), eq(locations.userId, user.id)))
      .limit(1);
    if (!row) locationId = null;
  }

  return ok({
    amount: inferred.amount,
    type: inferred.type,
    categoryId,
    locationId,
    contactId,
    note: inferred.note,
  });
}
