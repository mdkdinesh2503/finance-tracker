import type { TransactionType } from "@/lib/db/schema";
import { parseAmountString } from "@/lib/ledger/signed";

export type QuickEntryMatch = {
  amount: string;
  remainder: string;
  type: TransactionType;
  categoryId: string | null;
  contactId: string | null;
  note: string;
};

export type QuickEntryContext = {
  contacts: { id: string; name: string }[];
  rules: { keyword: string; categoryId: string | null; contactId: string | null }[];
};

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/** First token numeric = amount; rest = note/reminder text. */
export function splitQuickInput(input: string): { amountStr: string | null; rest: string } {
  const trimmed = input.trim();
  if (!trimmed) return { amountStr: null, rest: "" };
  const parts = trimmed.split(/\s+/);
  const first = parts[0] ?? "";
  const amountStr = parseAmountString(first);
  const rest = amountStr ? parts.slice(1).join(" ").trim() : trimmed;
  return { amountStr: amountStr ?? null, rest };
}

export function inferQuickEntry(
  input: string,
  ctx: QuickEntryContext,
): QuickEntryMatch | null {
  const { amountStr, rest } = splitQuickInput(input);
  if (!amountStr) return null;

  const lower = norm(rest);
  const note = rest || "Quick entry";

  if (/\bsalary\b/i.test(rest)) {
    return {
      amount: amountStr,
      remainder: rest,
      type: "INCOME",
      categoryId: null,
      contactId: null,
      note,
    };
  }

  for (const c of ctx.contacts) {
    const cn = norm(c.name);
    if (cn && (lower === cn || lower.includes(cn) || cn.includes(lower))) {
      return {
        amount: amountStr,
        remainder: rest,
        type: "LEND",
        categoryId: null,
        contactId: c.id,
        note,
      };
    }
  }

  let categoryId: string | null = null;
  let contactId: string | null = null;
  for (const r of ctx.rules) {
    const kw = norm(r.keyword);
    if (!kw) continue;
    if (lower.includes(kw) || kw.includes(lower)) {
      categoryId = r.categoryId;
      contactId = r.contactId;
      break;
    }
  }

  return {
    amount: amountStr,
    remainder: rest,
    type: "EXPENSE",
    categoryId,
    contactId,
    note,
  };
}
