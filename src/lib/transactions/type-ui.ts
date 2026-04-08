import type { TransactionType } from "@/lib/db/schema";

export function transactionTypeLabel(type: TransactionType): string {
  if (type === "REPAYMENT") return "Repay";
  return type.charAt(0) + type.slice(1).toLowerCase();
}

export function transactionRailClass(type: TransactionType): string {
  switch (type) {
    case "INCOME":
      return "from-emerald-400/90 via-emerald-400/50 to-emerald-500/30";
    case "EXPENSE":
      return "from-rose-400/90 via-rose-400/50 to-rose-600/30";
    case "INVESTMENT":
      return "from-sky-400/90 via-blue-400/50 to-blue-600/30";
    case "BORROW":
      return "from-amber-400/90 via-amber-400/45 to-amber-600/25";
    case "REPAYMENT":
      return "from-cyan-400/85 via-sky-400/45 to-sky-600/28";
    case "LEND":
      return "from-violet-400/85 via-violet-400/45 to-violet-600/28";
    case "RECEIVE":
      return "from-teal-400/85 via-teal-400/45 to-teal-600/28";
    case "ADJUSTMENT":
      return "from-zinc-400/80 via-zinc-500/45 to-zinc-600/30";
    default:
      return "from-zinc-400/80 via-zinc-500/40 to-zinc-600/25";
  }
}

export function transactionChipClass(type: TransactionType): string {
  const chip: Record<TransactionType, string> = {
    INCOME: "border-emerald-500/25 bg-emerald-500/12 text-emerald-200/95",
    EXPENSE: "border-rose-500/25 bg-rose-500/12 text-rose-200/95",
    INVESTMENT: "border-blue-500/25 bg-blue-500/12 text-sky-200/95",
    BORROW: "border-amber-500/25 bg-amber-500/12 text-amber-200/95",
    REPAYMENT: "border-sky-500/25 bg-sky-500/12 text-sky-200/95",
    LEND: "border-violet-500/25 bg-violet-500/12 text-violet-200/95",
    RECEIVE: "border-teal-500/25 bg-teal-500/12 text-teal-200/95",
    ADJUSTMENT: "border-zinc-500/25 bg-zinc-500/12 text-zinc-200/95",
  };
  return chip[type];
}

export function amountTone(type: TransactionType): {
  cls: string;
  prefix: "+" | "−" | "";
} {
  // Inflows / positive-like
  if (type === "INCOME" || type === "BORROW" || type === "RECEIVE") {
    return { cls: "text-emerald-200", prefix: "+" };
  }
  // Outflows / negative-like
  if (type === "EXPENSE" || type === "INVESTMENT" || type === "REPAYMENT" || type === "LEND") {
    return { cls: "text-rose-200", prefix: "−" };
  }
  return { cls: "text-white", prefix: "" };
}

