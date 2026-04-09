import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { and, eq } from "drizzle-orm";

import { closeDatabaseConnection, db } from "./client";
import { seedUserId } from "./ensure-user-categories";
import {
  accounts,
  categories,
  locations,
  transactions,
  users,
  type TransactionType,
} from "./schema";

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

function parseCsv(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return lines.map(parseCsvRow);
}

async function main() {
  const userId = seedUserId();

  const csvPath = path.resolve(
    process.cwd(),
    process.env.DATA_IMPORT_CSV ?? "data/historical-transactions.csv",
  );
  const accountName = process.env.DATA_IMPORT_ACCOUNT_NAME?.trim() || "Cash";
  const dry = process.env.DATA_IMPORT_DRY_RUN === "1";

  const raw = readFileSync(csvPath, "utf8");
  const rows = parseCsv(raw);
  if (rows.length < 2) {
    console.error("CSV has no data rows.");
    process.exit(1);
  }

  const header = rows[0]!.map((h) => h.trim());
  const expected = ["Date", "Time", "Type", "Amount", "Category", "Location", "Notes"];
  if (header.length !== expected.length || !expected.every((h, i) => header[i] === h)) {
    console.error(
      "Unexpected CSV header. Expected: Date,Time,Type,Amount,Category,Location,Notes",
    );
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

  const catByKey = new Map<string, { id: string; parentId: string | null }>();
  for (const c of catRows) {
    catByKey.set(`${c.type}:${c.name.trim().toLowerCase()}`, {
      id: c.id,
      parentId: c.parentId,
    });
  }

  const locRows = await db
    .select({ id: locations.id, name: locations.name })
    .from(locations)
    .where(eq(locations.userId, userId));
  const locByName = new Map(
    locRows.map((l) => [l.name.trim().toLowerCase(), l.id] as const),
  );

  let inserted = 0;
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i]!;
    if (cols.length !== 7) {
      console.error(`Row ${i + 1}: expected 7 columns, got ${cols.length}`);
      process.exit(1);
    }
    const [dateStr, timeStr, typeStr, amountStr, categoryName, locationName, note] = cols;
    const txType = typeStr.trim().toUpperCase();
    if (!TX_TYPES.has(txType)) {
      console.error(`Row ${i + 1}: invalid type ${typeStr}`);
      process.exit(1);
    }

    const catKey = `${txType}:${categoryName.trim().toLowerCase()}`;
    const cat = catByKey.get(catKey);
    if (!cat) {
      console.error(
        `Row ${i + 1}: no category "${categoryName.trim()}" for type ${txType}. Add it in Settings or fix the CSV.`,
      );
      process.exit(1);
    }

    const amt = Number(String(amountStr).trim().replace(/,/g, ""));
    if (!Number.isFinite(amt) || amt <= 0) {
      console.error(`Row ${i + 1}: invalid amount ${amountStr}`);
      process.exit(1);
    }

    let locationId: string | null = null;
    const locTrim = locationName.trim();
    if (locTrim) {
      const lid = locByName.get(locTrim.toLowerCase());
      if (!lid) {
        console.error(
          `Row ${i + 1}: location "${locTrim}" not found. Add it under Settings or leave Location blank.`,
        );
        process.exit(1);
      }
      locationId = lid;
    }

    const noteTrim = note.trim() || null;
    const timeNorm = normalizeTime(timeStr);

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
      contactId: null,
      accountId: accRow.id,
      note: noteTrim,
      transactionDate: dateStr.trim(),
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
