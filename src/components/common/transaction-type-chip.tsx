import type { TransactionType } from "@/lib/db/schema";
import { transactionChipClass, transactionTypeLabel } from "@/lib/transactions/type-ui";

export function TransactionTypeChip({ type }: { type: TransactionType }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded border px-1 py-px text-[8px] font-semibold uppercase tracking-wide ${transactionChipClass(type)}`}
    >
      {transactionTypeLabel(type)}
    </span>
  );
}

