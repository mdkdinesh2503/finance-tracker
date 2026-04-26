"use client";

import { useEffect, useMemo, useState } from "react";
import type { TransactionRowDTO } from "@/lib/types/transactions";
import {
  formatCurrency,
  formatTransactionTableDate,
  formatTransactionTableTime,
} from "@/lib/utilities/format";
import { TransactionTypeBadge } from "@/components/common/transaction-type-badge";
import { amountTone, transactionRailClass } from "@/lib/utilities/transactions/type-ui";

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
      className={`h-3.5 w-3.5 text-ink transition-transform duration-200 ${expanded ? "rotate-90" : ""} ${className}`}
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

function rowPrimary(r: TransactionRowDTO): string {
  return categoryLine(r);
}

function rowSecondary(r: TransactionRowDTO): string | null {
  const note = r.note?.trim();
  return note ? note : null;
}

function isLoanType(t: TransactionRowDTO["type"]): boolean {
  return t === "BORROW" || t === "REPAYMENT" || t === "LEND" || t === "RECEIVE";
}

function showsSettledBadge(t: TransactionRowDTO["type"]): boolean {
  return t === "BORROW" || t === "LEND";
}

function placeContactLine(r: TransactionRowDTO): string {
  if (isLoanType(r.type)) {
    return r.contactName?.trim() || "—";
  }
  const parts: string[] = [];
  const loc = r.locationName?.trim();
  const co = r.companyName?.trim();
  const person = r.contactName?.trim();
  if (loc) parts.push(loc);
  if (co) parts.push(co);
  if (person) parts.push(person);
  return parts.length > 0 ? parts.join(" · ") : "—";
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
      <div className="px-5 py-12 text-center">
        <p className="text-sm font-medium text-ink">No transactions for this range</p>
        <p className="mt-1 text-xs text-ink-muted">
          Try broadening the date range or clearing filters.
        </p>
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
              className="group flex w-full items-start gap-3 text-left sm:gap-4"
              onClick={() => toggleYear(yg.year)}
            >
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-(--border) bg-(--glass-simple-bg) shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <Chevron expanded={yearExpanded} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
                  Year
                </p>
                <p className="mt-0.5 text-2xl font-semibold tracking-tight text-ink">
                  {yg.year}
                </p>
                <div className="mt-2 h-px w-full bg-linear-to-r from-primary/35 via-(--border) to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </div>
              <div className="shrink-0 rounded-full border border-(--border) bg-(--glass-simple-bg) px-4 py-2 text-xs font-medium text-ink-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
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
                      className="overflow-hidden rounded-2xl border border-(--border) bg-[color-mix(in_srgb,var(--surface)_88%,transparent)]"
                    >
                      <div
                        className="h-0.5 bg-linear-to-r from-primary/70 via-primary/25 to-transparent"
                        aria-hidden
                      />
                      <button
                        type="button"
                        className="group relative flex w-full items-start gap-3 p-4 text-left sm:items-center sm:gap-4"
                        onClick={() => toggleMonth(mg.key)}
                      >
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-linear-to-br from-primary/14 to-transparent text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:mt-0">
                          <Chevron expanded={monthExpanded} className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-base font-semibold tracking-tight text-ink sm:text-lg">
                            {mg.monthLabel}
                          </p>
                          <p className="mt-1 text-xs text-ink-muted">
                            {mg.rows.length} transactions
                          </p>
                        </div>

                        <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-rose-500/25 bg-rose-500/10 px-3 py-1 sm:flex">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-200/90">
                            Expense
                          </span>
                          <span className="text-sm font-semibold tabular-nums tracking-tight text-rose-200">
                            {formatCurrency(mg.expenseOut)}
                          </span>
                        </div>

                        <div className="shrink-0 self-center rounded-full border border-(--border) bg-(--glass-simple-bg) px-3 py-2 text-xs font-semibold text-ink-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors group-hover:border-primary/25 group-hover:bg-primary/8 group-hover:text-ink">
                          {monthExpanded ? "Hide" : "Show"}
                        </div>
                      </button>

                      {monthExpanded ? (
                        <div className="border-t border-(--border) bg-black/20 px-4 py-3 sm:px-5">
                          <div
                            className={`${
                              mg.rows.length > 10
                                ? "max-h-[700px] overflow-y-auto overscroll-contain"
                                : ""
                            }`}
                          >
                            <div className="sticky top-0 z-10 hidden bg-black/55 backdrop-blur-md sm:block">
                              <div className="grid gap-2 border-b border-(--border) px-4 py-2 sm:grid-cols-[140px_90px_110px_minmax(260px,1fr)_140px_minmax(180px,1fr)] sm:pl-6">
                                {[
                                  "Date",
                                  "Time",
                                  "Type",
                                  "Category",
                                  "Amount",
                                  "Place / employer / person",
                                ].map((h) => (
                                  <div
                                    key={h}
                                    className={`text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted ${
                                      h === "Amount" ? "text-center" : ""
                                    }`}
                                  >
                                    {h}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="divide-y divide-(--border)">
                              {mg.rows.map((r) => {
                                const loan = isLoanType(r.type);
                                const contactLabel = r.contactName?.trim() || "—";
                                const placeLine = placeContactLine(r);
                                const unsettledLoan =
                                  loan &&
                                  r.contactId &&
                                  unsettledLoanContacts.has(r.contactId);
                                return (
                                  <div
                                    key={r.id}
                                    className="group/row relative"
                                  >
                                    <div
                                      className={`pointer-events-none absolute inset-y-3 left-3 w-0.5 rounded-full bg-linear-to-b ${transactionRailClass(r.type)} opacity-85`}
                                      aria-hidden
                                    />
                                    <div className="relative grid grid-cols-1 gap-2 px-4 py-3 transition-colors duration-200 group-hover/row:bg-white/3 sm:grid-cols-[140px_90px_110px_minmax(260px,1fr)_140px_minmax(180px,1fr)] sm:items-center sm:pl-6">
                                      <div className="flex items-center justify-between gap-3 sm:contents">
                                        <div className="text-xs text-ink-muted whitespace-nowrap">
                                          {formatTransactionTableDate(r.transactionDate)}
                                        </div>
                                        <div className="text-xs text-(--ink-muted-2) whitespace-nowrap">
                                          {formatTransactionTableTime(r.transactionTime)}
                                        </div>
                                        <div className="shrink-0">
                                          <TransactionTypeBadge type={r.type} />
                                        </div>
                                        <div className="min-w-0">
                                          <p className="min-w-0 truncate text-sm font-semibold tracking-tight text-ink">
                                            {rowPrimary(r)}
                                          </p>
                                          {rowSecondary(r) ? (
                                            <p className="mt-0.5 min-w-0 truncate text-xs text-ink-muted">
                                              {rowSecondary(r)}
                                            </p>
                                          ) : null}
                                        </div>
                                        <div
                                          className={`hidden text-center text-base font-semibold tabular-nums tracking-tight sm:block ${amountTone(r.type)}`}
                                        >
                                          {formatCurrency(Number(r.amount))}
                                        </div>
                                        <div className="min-w-0 truncate text-xs text-(--ink-muted-2)">
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
                                            placeLine
                                          )}
                                        </div>
                                        <div
                                          className={`shrink-0 text-base font-semibold tabular-nums tracking-tight ${amountTone(r.type)} sm:hidden`}
                                        >
                                          {formatCurrency(Number(r.amount))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
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

