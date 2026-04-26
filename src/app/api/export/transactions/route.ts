import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/server";
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

  const rows = await db`
    select
      t.id,
      t.type,
      t.amount::text as amount,
      t.transaction_date::text as transaction_date,
      t.transaction_time::text as transaction_time,
      t.note,
      t.created_at,
      a.name as account_name,
      c.name as category_name,
      l.name as location_name,
      ct.name as contact_name,
      co.name as company_name
    from transactions t
    inner join accounts a on a.id = t.account_id
    left join categories c on c.id = t.category_id
    left join locations l on l.id = t.location_id
    left join contacts ct on ct.id = t.contact_id
    left join companies co on co.id = t.company_id
    where t.user_id = ${userId}
    order by t.transaction_date desc, t.transaction_time desc, t.created_at desc
  `;

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
    ...(rows as unknown as {
      id: string;
      type: string;
      amount: string;
      transaction_date: string;
      transaction_time: string;
      note: string | null;
      created_at: Date;
      account_name: string;
      category_name: string | null;
      location_name: string | null;
      contact_name: string | null;
      company_name: string | null;
    }[]).map((r) =>
      [
        csvEscape(r.id),
        csvEscape(r.type),
        csvEscape(String(r.amount)),
        csvEscape(r.transaction_date),
        csvEscape(String(r.transaction_time)),
        csvEscape(r.account_name),
        csvEscape(r.category_name ?? ""),
        csvEscape(r.location_name ?? ""),
        csvEscape(r.contact_name ?? ""),
        csvEscape(r.company_name ?? ""),
        csvEscape(r.note ?? ""),
        csvEscape(r.created_at.toISOString()),
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
