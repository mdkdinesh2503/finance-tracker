import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/server";
import {
  accounts,
  categories,
  companies,
  contacts,
  locations,
  transactions,
} from "@/lib/db/schema";
import { SESSION_COOKIE } from "@/lib/auth/cookies";
import { verifySession } from "@/lib/auth/jwt";

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export async function GET() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const session = await verifySession(token);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.sub;

  const rows = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      transactionDate: transactions.transactionDate,
      transactionTime: transactions.transactionTime,
      note: transactions.note,
      createdAt: transactions.createdAt,
      accountName: accounts.name,
      categoryName: categories.name,
      locationName: locations.name,
      contactName: contacts.name,
      companyName: companies.name,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(locations, eq(transactions.locationId, locations.id))
    .leftJoin(contacts, eq(transactions.contactId, contacts.id))
    .leftJoin(companies, eq(transactions.companyId, companies.id))
    .where(eq(transactions.userId, userId))
    .orderBy(
      desc(transactions.transactionDate),
      desc(transactions.transactionTime),
      desc(transactions.createdAt),
    );

  const header = [
    "id",
    "type",
    "amount",
    "transaction_date",
    "transaction_time",
    "account",
    "category",
    "location",
    "contact",
    "company",
    "note",
    "created_at",
  ];

  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        csvEscape(r.id),
        csvEscape(r.type),
        csvEscape(String(r.amount)),
        csvEscape(r.transactionDate),
        csvEscape(String(r.transactionTime)),
        csvEscape(r.accountName),
        csvEscape(r.categoryName ?? ""),
        csvEscape(r.locationName ?? ""),
        csvEscape(r.contactName ?? ""),
        csvEscape(r.companyName ?? ""),
        csvEscape(r.note ?? ""),
        csvEscape(r.createdAt.toISOString()),
      ].join(","),
    ),
  ];

  const body = "\uFEFF" + lines.join("\r\n");
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="transactions-export.csv"',
    },
  });
}
