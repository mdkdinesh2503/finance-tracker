import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { and, eq } from "drizzle-orm";

import { closeDatabaseConnection, db } from "../client";
import { seedUserId } from "./ensure-user-categories";
import {
  accounts,
  categories,
  companies,
  contacts,
  locations,
  transactions,
  users,
  type TransactionType,
} from "../schema";
import {
  GIFTS_OCCASIONS_PARENT_NAME,
  SALARY_WAGES_PARENT_NAME,
  giftRecipientRequiredForSubcategory,
} from "@/lib/constants/category-rules";

const TX_TYPES = new Set<string>([
  "EXPENSE",
  "INCOME",
  "BORROW",
  "REPAYMENT",
  "LEND",
  "RECEIVE",
  "INVESTMENT",
  "ADJUSTMENT",
]);

function parseCsvRow(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else if (c !== "\r") {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function normalizeTime(t: string): string {
  const s = t.trim();
  return s.length === 5 ? `${s}:00` : s;
}

/** CSV uses DD-MM-YYYY; Postgres `date` expects YYYY-MM-DD. */
function normalizeTransactionDateForPg(raw: string, rowLabel: string): string {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    const y = Number(m[3]);
    if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) {
      return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }
  console.error(
    `${rowLabel}: unparseable date "${raw}" (use DD-MM-YYYY or YYYY-MM-DD)`,
  );
  process.exit(1);
}

function parseCsv(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return lines.map(parseCsvRow);
}

const HEADER_V4 = [
  "Date",
  "Time",
  "Type",
  "Amount",
  "Parent Category",
  "Child Category",
  "Location",
  "Contact",
  "Company",
  "Notes",
] as const;

const HEADER_V3 = [
  "Date",
  "Time",
  "Type",
  "Amount",
  "Parent Category",
  "Child Category",
  "Location",
  "Contact",
  "Notes",
] as const;

const HEADER_V2 = [
  "Date",
  "Time",
  "Type",
  "Amount",
  "Parent Category",
  "Child Category",
  "Location",
  "Notes",
] as const;

const HEADER_V1 = [
  "Date",
  "Time",
  "Type",
  "Amount",
  "Category",
  "Location",
  "Notes",
] as const;

function detectCsvFormat(header: string[]): "v4" | "v3" | "v2" | "v1" {
  const h = header.map((x) => x.trim());
  if (
    h.length === HEADER_V4.length &&
    HEADER_V4.every((name, i) => h[i] === name)
  ) {
    return "v4";
  }
  if (
    h.length === HEADER_V3.length &&
    HEADER_V3.every((name, i) => h[i] === name)
  ) {
    return "v3";
  }
  if (
    h.length === HEADER_V2.length &&
    HEADER_V2.every((name, i) => h[i] === name)
  ) {
    return "v2";
  }
  if (
    h.length === HEADER_V1.length &&
    HEADER_V1.every((name, i) => h[i] === name)
  ) {
    return "v1";
  }
  throw new Error(
    "Unexpected CSV header. Use v4: Date,Time,Type,Amount,Parent Category,Child Category,Location,Contact,Company,Notes — or v3 without Company, v2 without Contact, or legacy v1.",
  );
}

type CatRow = {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
};

function resolveCategoryForImport(
  catRows: CatRow[],
  txType: string,
  parentName: string,
  childName: string,
): { id: string; parentId: string | null } | null {
  const p = parentName.trim().toLowerCase();
  const c = childName.trim().toLowerCase();

  const roots = catRows.filter((r) => r.parentId === null);
  const findRoot = () =>
    roots.find(
      (r) =>
        r.type === txType && r.name.trim().toLowerCase() === p,
    );

  if (!c) {
    const root = findRoot();
    if (!root) return null;
    // Seeded parent rows have `parent_id` null; analytics rollups join `transactions.parent_category_id`
    // to the parent group. Use the same id so parent-only CSV rows are not "Uncategorized".
    return { id: root.id, parentId: root.id };
  }

  const parent = findRoot();
  if (!parent) return null;
  const child = catRows.find(
    (r) =>
      r.parentId === parent.id &&
      r.type === txType &&
      r.name.trim().toLowerCase() === c,
  );
  return child ? { id: child.id, parentId: child.parentId } : null;
}

function parentCategoryNameForImport(
  catRows: CatRow[],
  resolved: { id: string; parentId: string | null },
): string | null {
  if (!resolved.parentId) return null;
  const p = catRows.find((r) => r.id === resolved.parentId);
  return p?.name.trim() ?? null;
}

function leafCategoryNameForImport(
  catRows: CatRow[],
  resolved: { id: string; parentId: string | null },
): string | null {
  const leaf = catRows.find((r) => r.id === resolved.id);
  return leaf?.name.trim() ?? null;
}

async function main() {
  const userId = seedUserId();

  const csvPath = path.resolve(
    process.cwd(),
    process.env.DATA_IMPORT_CSV ?? "data/historical-transactions.csv",
  );
  const accountName = process.env.DATA_IMPORT_ACCOUNT_NAME?.trim() || "Cash";
  const defaultLocation =
    process.env.DATA_IMPORT_DEFAULT_LOCATION?.trim() || "Hyderabad";
  const dry = process.env.DATA_IMPORT_DRY_RUN === "1";

  const raw = readFileSync(csvPath, "utf8");
  const rows = parseCsv(raw);
  if (rows.length < 2) {
    console.error("CSV has no data rows.");
    process.exit(1);
  }

  const header = rows[0]!.map((h) => h.trim());
  let format: "v4" | "v3" | "v2" | "v1";
  try {
    format = detectCsvFormat(header);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }

  const [userRow] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!userRow) {
    console.error(
      `No user with id ${userId} (SEED_ADMIN_USER_ID). Run db:seed with SEED_ADMIN_EMAIL or create that user.`,
    );
    process.exit(1);
  }

  const emailCheck = process.env.DATA_IMPORT_EMAIL?.trim().toLowerCase();
  if (emailCheck && userRow.email.trim().toLowerCase() !== emailCheck) {
    console.error(
      `User ${userId} has email ${userRow.email}, but DATA_IMPORT_EMAIL is ${emailCheck}.`,
    );
    process.exit(1);
  }

  const [accRow] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.name, accountName)))
    .limit(1);
  if (!accRow) {
    console.error(
      `No account named "${accountName}" for this user. Create it or set DATA_IMPORT_ACCOUNT_NAME.`,
    );
    process.exit(1);
  }

  const catRows = await db
    .select({
      id: categories.id,
      name: categories.name,
      type: categories.type,
      parentId: categories.parentId,
    })
    .from(categories)
    .where(eq(categories.userId, userId));

  const locRows = await db
    .select({ id: locations.id, name: locations.name })
    .from(locations)
    .where(eq(locations.userId, userId));
  const locByName = new Map(
    locRows.map((l) => [l.name.trim().toLowerCase(), l.id] as const),
  );

  const contactRows = await db
    .select({ id: contacts.id, name: contacts.name })
    .from(contacts)
    .where(eq(contacts.userId, userId));
  const contactByName = new Map(
    contactRows.map((c) => [c.name.trim().toLowerCase(), c.id] as const),
  );

  const companyRows = await db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .where(eq(companies.userId, userId));
  const companyByName = new Map(
    companyRows.map((c) => [c.name.trim().toLowerCase(), c.id] as const),
  );

  let inserted = 0;
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i]!;
    const expectedCols =
      format === "v4" ? 10 : format === "v3" ? 9 : format === "v2" ? 8 : 7;
    if (cols.length !== expectedCols) {
      console.error(
        `Row ${i + 1}: expected ${expectedCols} columns, got ${cols.length}`,
      );
      process.exit(1);
    }

    let dateStr: string;
    let timeStr: string;
    let typeStr: string;
    let amountStr: string;
    let parentCategory: string;
    let childCategory: string;
    let locationName: string;
    let contactName: string;
    let companyName: string;
    let note: string;

    if (format === "v4") {
      [
        dateStr,
        timeStr,
        typeStr,
        amountStr,
        parentCategory,
        childCategory,
        locationName,
        contactName,
        companyName,
        note,
      ] = cols;
    } else if (format === "v3") {
      [
        dateStr,
        timeStr,
        typeStr,
        amountStr,
        parentCategory,
        childCategory,
        locationName,
        contactName,
        note,
      ] = cols;
      companyName = "";
    } else if (format === "v2") {
      [
        dateStr,
        timeStr,
        typeStr,
        amountStr,
        parentCategory,
        childCategory,
        locationName,
        note,
      ] = cols;
      contactName = "";
      companyName = "";
    } else {
      [dateStr, timeStr, typeStr, amountStr, parentCategory, locationName, note] =
        cols;
      childCategory = "";
      contactName = "";
      companyName = "";
    }

    const txType = typeStr.trim().toUpperCase();
    if (!TX_TYPES.has(txType)) {
      console.error(`Row ${i + 1}: invalid type ${typeStr}`);
      process.exit(1);
    }

    const cat = resolveCategoryForImport(
      catRows,
      txType,
      parentCategory,
      childCategory,
    );
    if (!cat) {
      const hint = childCategory.trim()
        ? `parent "${parentCategory.trim()}" / child "${childCategory.trim()}"`
        : `"${parentCategory.trim()}"`;
      console.error(
        `Row ${i + 1}: no category ${hint} for type ${txType}. Add it in Settings or fix the CSV.`,
      );
      process.exit(1);
    }

    const amt = Number(String(amountStr).trim().replace(/,/g, ""));
    if (!Number.isFinite(amt) || amt <= 0) {
      console.error(`Row ${i + 1}: invalid amount ${amountStr}`);
      process.exit(1);
    }

    let locationId: string | null = null;
    const locTrim = (locationName.trim() || defaultLocation).trim();
    const lid = locByName.get(locTrim.toLowerCase());
    if (!lid) {
      console.error(
        `Row ${i + 1}: location "${locTrim}" not found. Add it under Settings or set DATA_IMPORT_DEFAULT_LOCATION.`,
      );
      process.exit(1);
    }
    locationId = lid;

    let contactId: string | null = null;
    const contactTrim = contactName.trim();
    if (contactTrim) {
      const cid = contactByName.get(contactTrim.toLowerCase());
      if (!cid) {
        console.error(
          `Row ${i + 1}: contact "${contactTrim}" not found. Add it under Settings or leave Contact blank.`,
        );
        process.exit(1);
      }
      contactId = cid;
    }

    const parentResolvedName = parentCategoryNameForImport(catRows, cat);
    const leafResolvedName = leafCategoryNameForImport(catRows, cat);

    const needsSalaryCompany =
      parentResolvedName === SALARY_WAGES_PARENT_NAME && txType === "INCOME";
    const needsGiftRecipient =
      parentResolvedName === GIFTS_OCCASIONS_PARENT_NAME &&
      txType === "EXPENSE" &&
      leafResolvedName != null &&
      giftRecipientRequiredForSubcategory(leafResolvedName);

    if (needsGiftRecipient && !contactId) {
      console.error(
        `Row ${i + 1}: contact is required for "${leafResolvedName}" under Gifts & Occasions.`,
      );
      process.exit(1);
    }

    let companyId: string | null = null;
    const companyTrim = companyName.trim();
    if (needsSalaryCompany) {
      if (!companyTrim) {
        console.error(
          `Row ${i + 1}: company is required for Salary & Wages income. Add it under Settings → Employers.`,
        );
        process.exit(1);
      }
      const coid = companyByName.get(companyTrim.toLowerCase());
      if (!coid) {
        console.error(
          `Row ${i + 1}: company "${companyTrim}" not found. Add it under Settings → Employers.`,
        );
        process.exit(1);
      }
      companyId = coid;
    } else if (companyTrim) {
      console.error(
        `Row ${i + 1}: Company is only used for Salary & Wages income rows; clear the column or fix the category.`,
      );
      process.exit(1);
    }

    const noteTrim = note.trim() || null;
    const timeNorm = normalizeTime(timeStr);
    const datePg = normalizeTransactionDateForPg(dateStr, `Row ${i + 1}`);

    if (dry) {
      inserted++;
      continue;
    }

    await db.insert(transactions).values({
      userId,
      type: txType as TransactionType,
      amount: amt.toFixed(2),
      categoryId: cat.id,
      parentCategoryId: cat.parentId,
      locationId,
      contactId,
      companyId,
      accountId: accRow.id,
      note: noteTrim,
      transactionDate: datePg,
      transactionTime: timeNorm,
    });
    inserted++;
  }

  console.log(
    dry
      ? `Dry run: ${inserted} rows (no inserts).`
      : `Imported ${inserted} transactions from ${csvPath}`,
  );
}

main()
  .then(async () => {
    await closeDatabaseConnection();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await closeDatabaseConnection().catch(() => {});
    process.exit(1);
  });
