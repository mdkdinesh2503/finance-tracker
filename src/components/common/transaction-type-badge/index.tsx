import type { TransactionType } from "@/lib/db/schema";
import {
  transactionChipClass,
  transactionTypeLabel,
} from "@/lib/utilities/transactions/type-ui";

export function TransactionTypeBadge({ type }: { type: TransactionType }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${transactionChipClass(type)}`}
    >
      {transactionTypeLabel(type)}
    </span>
  );
}

