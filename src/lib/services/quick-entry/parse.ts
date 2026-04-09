import { parseAmountString } from "@/lib/services/ledger";
import type { TransactionType } from "@/lib/db/schema";

export type QuickEntryContact = { id: string; name: string };
export type QuickEntryRule = {
  keyword: string;
  categoryId: string | null;
  locationId?: string | null;
  contactId: string | null;
};

export type SplitQuickInputResult = {
  amountStr: string | null;
  rest: string;
};

/**
 * Split a free-form input into an amount (if found) and remaining text.
 * Strategy: scan tokens from end → first token that parses as amount wins.
 */
export function splitQuickInput(text: string): SplitQuickInputResult {
  const raw = text.trim();
  if (!raw) return { amountStr: null, rest: "" };

  const tokens = raw.split(/\s+/).filter(Boolean);
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i]!;
    const parsed = parseAmountString(t);
    if (!parsed) continue;
    const rest = [...tokens.slice(0, i), ...tokens.slice(i + 1)].join(" ").trim();
    return { amountStr: parsed, rest };
  }
  return { amountStr: null, rest: raw };
}

export type InferQuickEntryResult = {
  type: TransactionType;
  amount: string;
  categoryId: string | null;
  locationId: string | null;
  contactId: string | null;
  note: string;
};

function inferTypeFromText(t: string): TransactionType {
  const s = ` ${t.toLowerCase()} `;
  if (/\b(borrow|loan|owe)\b/.test(s)) return "BORROW";
  if (/\b(repay|repayment)\b/.test(s)) return "REPAYMENT";
  if (/\b(lend)\b/.test(s)) return "LEND";
  if (/\b(receive|received)\b/.test(s)) return "RECEIVE";
  if (/\b(salary|income|refund|bonus)\b/.test(s)) return "INCOME";
  return "EXPENSE";
}

function pickBestRule(textLower: string, rules: QuickEntryRule[]): QuickEntryRule | null {
  let best: QuickEntryRule | null = null;
  let bestLen = 0;
  for (const r of rules) {
    const kw = r.keyword.trim().toLowerCase();
    if (!kw) continue;
    if (!textLower.includes(kw)) continue;
    if (kw.length > bestLen) {
      best = r;
      bestLen = kw.length;
    }
  }
  return best;
}

function pickContactByName(textLower: string, contacts: QuickEntryContact[]): QuickEntryContact | null {
  // Prefer longest matching name to avoid "Ann" matching inside "Annie"
  let best: QuickEntryContact | null = null;
  let bestLen = 0;
  for (const c of contacts) {
    const name = c.name.trim().toLowerCase();
    if (!name) continue;
    if (!textLower.includes(name)) continue;
    if (name.length > bestLen) {
      best = c;
      bestLen = name.length;
    }
  }
  return best;
}

export function inferQuickEntry(
  text: string,
  ctx: { contacts: QuickEntryContact[]; rules: QuickEntryRule[] }
): InferQuickEntryResult | null {
  const { amountStr, rest } = splitQuickInput(text);
  if (!amountStr) return null;

  const restTrimmed = rest.trim();
  const restLower = restTrimmed.toLowerCase();

  const rule = pickBestRule(restLower, ctx.rules);
  const contact =
    rule?.contactId
      ? { id: rule.contactId, name: "" }
      : pickContactByName(restLower, ctx.contacts);

  const type = inferTypeFromText(restLower);
  const note = restTrimmed;

  return {
    type,
    amount: amountStr,
    categoryId: rule?.categoryId ?? null,
    locationId: (rule?.locationId ?? null) as string | null,
    contactId: contact?.id ?? null,
    note,
  };
}

