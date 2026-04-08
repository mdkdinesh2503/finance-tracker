import type { TransactionType } from "@/lib/db/schema";

/** Signed cash-flow delta for account balance (ledger). Amount is positive for stored non-ADJUSTMENT rows. */
export function ledgerSignedDelta(
  type: TransactionType,
  amountAbs: string,
): string {
  const n = Number(amountAbs);
  if (!Number.isFinite(n)) return "0";
  const abs = Math.abs(n);

  switch (type) {
    case "EXPENSE":
    case "REPAYMENT":
    case "LEND":
    case "INVESTMENT":
      return (-abs).toFixed(2);
    case "INCOME":
    case "BORROW":
    case "RECEIVE":
      return abs.toFixed(2);
    case "ADJUSTMENT":
      return n.toFixed(2);
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function parseAmountString(raw: string): string | null {
  const t = raw.trim().replace(/,/g, "");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n === 0) return null;
  return Math.abs(n).toFixed(2);
}
