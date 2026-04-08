"use client";

import { useEffect, useMemo, useState } from "react";
import type { TransactionRowDTO } from "@/features/transactions/types";
import {
  formatCurrency,
  formatTransactionTableDate,
  formatTransactionTableTime,
} from "@/lib/utils/format";
import { TransactionTypeChip } from "@/components/common/transaction-type-chip";
import { amountTone } from "@/lib/transactions/type-ui";

type MonthGroup = {
  key: string;
  year: number;
  month: number;
  monthLabel: string;
  rows: TransactionRowDTO[];
  expenseOut: number;
};

type YearGroup = {
  year: number;
  months: MonthGroup[];
  transactionCount: number;
};

function parseYMD(dateStr: string): { y: number; m: number } | null {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(dateStr);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (!Number.isFinite(y) || !Number.isFinite(mo)) return null;
  return { y, m: mo };
}

function buildGroups(rows: TransactionRowDTO[]): YearGroup[] {
  const byYearMonth = new Map<string, TransactionRowDTO[]>();
  for (const r of rows) {
    const p = parseYMD(r.transactionDate);
    if (!p) continue;
    const key = `${p.y}-${String(p.m).padStart(2, "0")}`;
    const list = byYearMonth.get(key) ?? [];
    list.push(r);
    byYearMonth.set(key, list);
  }

  const monthKeys = [...byYearMonth.keys()].sort((a, b) => b.localeCompare(a));

  const yearMap = new Map<number, MonthGroup[]>();
  for (const key of monthKeys) {
    const list = byYearMonth.get(key)!;
    const [ys, ms] = key.split("-");
    const y = Number(ys);
    const monthNum = Number(ms);
    const monthLabel = new Date(y, monthNum - 1, 1).toLocaleString(undefined, {
      month: "long",
    });
    const expenseOut = list
      .filter((t) => t.type === "EXPENSE")
      .reduce((s, t) => s + Number(t.amount), 0);
    const mg: MonthGroup = {
      key,
      year: y,
      month: monthNum,
      monthLabel,
      rows: [...list].sort((a, b) => {
        const dc = b.transactionDate.localeCompare(a.transactionDate);
        if (dc !== 0) return dc;
        return b.transactionTime.localeCompare(a.transactionTime);
      }),
      expenseOut,
    };
    const arr = yearMap.get(y) ?? [];
    arr.push(mg);
    yearMap.set(y, arr);
  }

  const years = [...yearMap.keys()].sort((a, b) => b - a);
  return years.map((year) => ({
    year,
    months: yearMap.get(year)!,
    transactionCount: yearMap.get(year)!.reduce((n, m) => n + m.rows.length, 0),
  }));
}

function Chevron({ expanded, className = "" }: { expanded: boolean; className?: string }) {
  return (
    <svg
      className={`h-3.5 w-3.5 text-white transition-transform duration-200 ${expanded ? "rotate-90" : ""} ${className}`}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
    </svg>
  );
}

function categoryLine(r: TransactionRowDTO): string {
  if (r.parentCategoryName) {
    return `${r.parentCategoryName} › ${r.categoryName ?? "—"}`;
  }
  return r.categoryName ?? "—";
}

function isLoanType(t: TransactionRowDTO["type"]): boolean {
  return t === "BORROW" || t === "REPAYMENT" || t === "LEND" || t === "RECEIVE";
}

function showsSettledBadge(t: TransactionRowDTO["type"]): boolean {
  return t === "BORROW" || t === "LEND";
}

export function TransactionsAccordion({
  rows,
  unsettledLoanContacts,
}: {
  rows: TransactionRowDTO[];
  unsettledLoanContacts: Set<string>;
}) {
  const groups = useMemo(() => buildGroups(rows), [rows]);

  const [expandedYears, setExpandedYears] = useState<Set<number>>(() => new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (groups.length === 0) {
      setExpandedYears(new Set());
      setExpandedMonths(new Set());
      return;
    }
    setExpandedYears(new Set([groups[0]!.year]));
    setExpandedMonths(new Set());
  }, [groups]);

  function toggleYear(y: number) {
    setExpandedYears((prev) => {
      const n = new Set(prev);
      if (n.has(y)) n.delete(y);
      else n.add(y);
      return n;
    });
  }

  function toggleMonth(key: string) {
    setExpandedMonths((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  }

  if (groups.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-zinc-500">
        No transactions for these filters. Add one or widen the date range.
      </div>
    );
  }

  const totalOnPage = rows.length;

  return (
    <div className="divide-y divide-white/10">
      {groups.map((yg) => {
        const yearOpen = expandedYears.has(yg.year);
        return (
          <section key={yg.year} className="px-4 py-5 sm:px-5">
            <div className="flex gap-3 sm:gap-4">
              <button
                type="button"
                aria-expanded={yearOpen}
                className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-surface text-white transition hover:border-white/25 hover:bg-white/5"
                onClick={() => toggleYear(yg.year)}
              >
                <Chevron expanded={yearOpen} />
              </button>
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => toggleYear(yg.year)}
                >
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Year · click to {yearOpen ? "collapse" : "expand"}
                  </p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-white">
                    {yg.year}
                  </p>
                </button>
              </div>
              <div className="shrink-0 self-start pt-1">
                <span className="inline-flex rounded-full border border-white/20 bg-surface px-3 py-1.5 text-xs font-medium text-zinc-300">
                  {yg.transactionCount === totalOnPage && groups.length === 1
                    ? `${totalOnPage} transaction${totalOnPage === 1 ? "" : "s"} on this page`
                    : `${yg.transactionCount} transactions in ${yg.year}`}
                </span>
              </div>
            </div>

            {yearOpen ? (
              <div className="mt-5 space-y-3 pl-0 sm:pl-11">
                {yg.months.map((mg) => {
                  const moOpen = expandedMonths.has(mg.key);
                  const n = mg.rows.length;
                  return (
                    <div
                      key={mg.key}
                      className="overflow-hidden rounded-xl border border-white/12 bg-[color-mix(in_srgb,var(--surface)_88%,transparent)]"
                    >
                      <div className="flex gap-3 p-4 sm:gap-4">
                        <button
                          type="button"
                          aria-expanded={moOpen}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/12 bg-black/25 text-white transition hover:border-white/20"
                          onClick={() => toggleMonth(mg.key)}
                        >
                          <Chevron expanded={moOpen} />
                        </button>
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            className="w-full text-left"
                            onClick={() => toggleMonth(mg.key)}
                          >
                            <p className="text-base font-semibold text-white">
                              {mg.monthLabel}{" "}
                              <span className="font-normal text-zinc-500">
                                {mg.year}
                              </span>
                            </p>
                            <p className="mt-1 text-sm text-zinc-500">
                              {n} {n === 1 ? "entry" : "entries"} · click to{" "}
                              {moOpen ? "collapse" : "expand"}
                            </p>
                          </button>
                        </div>
                        <div className="shrink-0 self-center">
                          <span className="inline-flex rounded-full border border-rose-900/60 bg-rose-950/70 px-3 py-1.5 text-xs font-medium tabular-nums text-rose-100">
                            Out {formatCurrency(mg.expenseOut)}
                          </span>
                        </div>
                      </div>

                      {moOpen ? (
                        <div className="border-t border-white/10 bg-black/20">
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[640px] text-left text-sm">
                              <thead className="border-b border-white/10 text-xs uppercase text-zinc-500">
                                <tr>
                                  <th className="px-4 py-2.5 font-medium">
                                    Date
                                  </th>
                                  <th className="px-4 py-2.5 font-medium">
                                    Time
                                  </th>
                                  <th className="px-4 py-2.5 font-medium">
                                    Type
                                  </th>
                                  <th className="px-4 py-2.5 font-medium">
                                    Amount
                                  </th>
                                  <th className="px-4 py-2.5 font-medium">
                                    Contact
                                  </th>
                                  <th className="px-4 py-2.5 font-medium">
                                    Category
                                  </th>
                                  <th className="px-4 py-2.5 font-medium">
                                    Location
                                  </th>
                                  <th className="px-4 py-2.5 font-medium">
                                    Notes
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                {mg.rows.map((r) => (
                                  <tr key={r.id} className="text-zinc-200">
                                    <td className="px-4 py-2.5 text-zinc-300">
                                      {formatTransactionTableDate(
                                        r.transactionDate
                                      )}
                                    </td>
                                    <td className="px-4 py-2.5 tabular-nums text-zinc-400">
                                      {formatTransactionTableTime(
                                        r.transactionTime
                                      )}
                                    </td>
                                    <td className="px-4 py-2.5">
                                      <TransactionTypeChip type={r.type} />
                                    </td>
                                    <td className="px-4 py-2.5 tabular-nums font-semibold">
                                      {(() => {
                                        const { cls, prefix } = amountTone(r.type);
                                        return (
                                          <span className={cls}>
                                            {prefix}
                                            {formatCurrency(Number(r.amount))}
                                          </span>
                                        );
                                      })()}
                                    </td>
                                    <td className="px-4 py-2.5 text-zinc-300">
                                      {isLoanType(r.type) ? (
                                        <div className="flex items-center gap-2">
                                          <span className="truncate">
                                            {r.contactName ?? "—"}
                                          </span>
                                          {showsSettledBadge(r.type) &&
                                          r.contactId &&
                                          !unsettledLoanContacts.has(r.contactId) ? (
                                            <span className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
                                              Settled
                                            </span>
                                          ) : null}
                                        </div>
                                      ) : (
                                        "—"
                                      )}
                                    </td>
                                    <td className="px-4 py-2.5 text-zinc-300">
                                      {categoryLine(r)}
                                    </td>
                                    <td className="px-4 py-2.5 text-zinc-400">
                                      {r.locationName ?? "—"}
                                    </td>
                                    <td className="max-w-[200px] truncate px-4 py-2.5 text-zinc-500">
                                      {r.note ?? "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
