"use client";

import { useEffect, useMemo, useState } from "react";
import type { TransactionRowDTO } from "@/lib/types/transactions";
import {
  formatCurrency,
  formatTransactionTableDate,
  formatTransactionTableTime,
} from "@/lib/utilities/format";
import { TransactionTypeChip } from "@/components/common/transaction-type-chip";
import { amountTone } from "@/lib/utilities/transactions/type-ui";

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

function Chevron({
  expanded,
  className = "",
}: {
  expanded: boolean;
  className?: string;
}) {
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

function rowTitle(r: TransactionRowDTO): string {
  const note = r.note?.trim();
  if (note) return note;
  if (r.categoryName) return r.categoryName;
  if (r.parentCategoryName) return r.parentCategoryName;
  return r.type;
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
    if (groups.length === 0) return;
    // Expand latest year and latest month by default
    const topYear = groups[0]!.year;
    const topMonth = groups[0]!.months[0]?.key;
    setExpandedYears(new Set([topYear]));
    setExpandedMonths(topMonth ? new Set([topMonth]) : new Set());
  }, [groups]);

  function toggleYear(y: number) {
    setExpandedYears((s) => {
      const next = new Set(s);
      if (next.has(y)) next.delete(y);
      else next.add(y);
      return next;
    });
  }

  function toggleMonth(key: string) {
    setExpandedMonths((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (groups.length === 0) {
    return (
      <div className="p-10 text-center text-sm text-zinc-500">
        No transactions for this range.
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/10">
      {groups.map((yg) => {
        const yearExpanded = expandedYears.has(yg.year);
        return (
          <section key={yg.year} className="px-4 py-5 sm:px-5">
            <button
              type="button"
              className="flex w-full items-start gap-3 text-left sm:gap-4"
              onClick={() => toggleYear(yg.year)}
            >
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/12 bg-white/3">
                <Chevron expanded={yearExpanded} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Year
                </p>
                <p className="mt-0.5 text-2xl font-semibold tracking-tight text-white">
                  {yg.year}
                </p>
              </div>
              <div className="shrink-0 rounded-full border border-white/12 bg-white/3 px-4 py-2 text-xs font-medium text-white/80">
                {yg.transactionCount} tx
              </div>
            </button>

            {yearExpanded ? (
              <div className="mt-5 space-y-3 pl-0 sm:pl-11">
                {yg.months.map((mg) => {
                  const monthExpanded = expandedMonths.has(mg.key);
                  return (
                    <div
                      key={mg.key}
                      className="overflow-hidden rounded-xl border border-white/12 bg-[color-mix(in_srgb,var(--surface)_88%,transparent)]"
                    >
                      <button
                        type="button"
                        className="flex w-full items-start gap-3 p-4 text-left sm:gap-4"
                        onClick={() => toggleMonth(mg.key)}
                      >
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/12 bg-white/3">
                          <Chevron expanded={monthExpanded} className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white">
                            {mg.monthLabel}
                          </p>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {mg.rows.length} tx · expense{" "}
                            <span className="font-medium text-zinc-300">
                              {formatCurrency(mg.expenseOut)}
                            </span>
                          </p>
                        </div>
                        <div className="shrink-0 self-center rounded-full border border-white/12 bg-white/3 px-3 py-2 text-xs font-medium text-white/80">
                          {monthExpanded ? "Hide" : "Show"}
                        </div>
                      </button>

                      {monthExpanded ? (
                        <div className="border-t border-white/10 bg-black/20 px-2 py-3">
                          <div className="mb-2 hidden gap-2 border-b border-white/10 pb-2 sm:grid sm:grid-cols-7">
                            {[
                              "Date",
                              "Time",
                              "Type",
                              "Title",
                              "Category",
                              "Amount",
                              "Location / Contact",
                            ].map((h) => (
                              <div
                                key={h}
                                className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500"
                              >
                                {h}
                              </div>
                            ))}
                          </div>

                          <div className="space-y-2">
                            {mg.rows.map((r) => {
                              const loan = isLoanType(r.type);
                              const contactLabel = r.contactName?.trim() || "—";
                              const locationLabel = r.locationName?.trim() || "—";
                              const unsettledLoan =
                                loan &&
                                r.contactId &&
                                unsettledLoanContacts.has(r.contactId);
                              return (
                                <div
                                  key={r.id}
                                  className="grid grid-cols-1 gap-2 rounded-lg border border-white/6 bg-white/2 px-3 py-2.5 sm:grid-cols-7 sm:items-center"
                                >
                                  <div className="text-xs text-zinc-400">
                                    {formatTransactionTableDate(r.transactionDate)}
                                  </div>
                                  <div className="text-xs text-zinc-500">
                                    {formatTransactionTableTime(r.transactionTime)}
                                  </div>
                                  <div>
                                    <TransactionTypeChip type={r.type} />
                                  </div>
                                  <div className="min-w-0 truncate text-sm font-medium text-white/90">
                                    {rowTitle(r)}
                                  </div>
                                  <div className="min-w-0 truncate text-xs text-zinc-400">
                                    {categoryLine(r)}
                                  </div>
                                  <div
                                    className={`text-sm font-semibold tabular-nums ${amountTone(r.type)}`}
                                  >
                                    {formatCurrency(Number(r.amount))}
                                  </div>
                                  <div className="min-w-0 truncate text-xs text-zinc-500">
                                    {loan ? (
                                      <>
                                        {contactLabel}
                                        {showsSettledBadge(r.type) ? (
                                          <span
                                            className={`ml-2 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                                              unsettledLoan
                                                ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                                                : "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                                            }`}
                                          >
                                            {unsettledLoan ? "Unsettled" : "Settled"}
                                          </span>
                                        ) : null}
                                      </>
                                    ) : (
                                      locationLabel
                                    )}
                                  </div>
                                </div>
                              );
                            })}
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

