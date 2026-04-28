import type { ReactNode } from "react";
import Link from "next/link";

import { GlassCard } from "@/components/ui/glass-card";
import type { LendingAnalyticsSnapshot } from "@/lib/types/lending-analytics";
import { formatInr } from "@/lib/utilities/format";
import {
  transactionChipClass,
  transactionTypeLabel,
} from "@/lib/utilities/transactions/type-ui";
import { LendingMonthlyDeltaChart } from "@/components/feature-specific/analytics/charts/lending-monthly-delta-chart";

type Props = {
  data: LendingAnalyticsSnapshot;
};

function Th({ children }: { children: ReactNode }) {
  return (
    <th className="border-b border-white/10 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
  colSpan,
}: {
  children: ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td
      className={`border-b border-white/4 px-3 py-2.5 text-sm text-ink transition-colors duration-150 first:rounded-l-lg last:rounded-r-lg ${className}`}
      colSpan={colSpan}
    >
      {children}
    </td>
  );
}

function NetChip({ net }: { net: number }) {
  if (net === 0) {
    return (
      <span className="rounded-full border border-white/10 bg-white/4 px-2.5 py-1 text-[11px] font-medium text-zinc-500">
        Balanced net
      </span>
    );
  }
  const favorable = net > 0;
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold tabular-nums ${
        favorable
          ? "border-violet-500/35 bg-violet-500/12 text-violet-200"
          : "border-amber-500/35 bg-amber-500/12 text-amber-200"
      }`}
    >
      {favorable ? "They owe more · " : "You owe more · "}
      {formatInr(Math.abs(net))}
    </span>
  );
}

export function LendingAnalyticsView({ data }: Props) {
  const { totals, byContact, noContact, bySubcategory, monthlyTrend } = data;
  const hasNoContactActivity =
    noContact.borrowed > 0 ||
    noContact.repaid > 0 ||
    noContact.lent > 0 ||
    noContact.received > 0;

  const netReceivable = totals.theyOweYou - totals.youOwe;
  const maxExposure = Math.max(totals.youOwe, totals.theyOweYou, 1);
  void maxExposure;

  const contactsYouOwe = byContact.filter((r) => r.youOwe > 0);
  const contactsTheyOweYou = byContact.filter((r) => r.theyOweYou > 0);

  // Aging analysis removed (replaced with By subcategory summary).

  return (
    <div className="lending-scope relative space-y-10 pb-16">
      <div
        className="lending-aurora-blob pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl"
        aria-hidden
      />
      <div
        className="lending-aurora-blob lending-aurora-blob--delayed pointer-events-none absolute -left-20 top-40 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl"
        aria-hidden
      />

      <header className="relative z-1 space-y-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary">
              Insights · Credit
            </p>
            <h1 className="text-balance text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              <span className="bg-linear-to-r from-ink via-amber-100 to-violet-200 bg-clip-text text-transparent">
                Lending ledger
              </span>
            </h1>
            <p className="max-w-2xl text-sm leading-snug text-ink-muted">
              Balances net partial repayments into totals per contact.{" "}
              <Link
                href="/analytics"
                prefetch={false}
                className="text-primary underline-offset-2 hover:underline"
              >
                Analytics
              </Link>{" "}
              for expenses &amp; income ·{" "}
              <Link
                href="/analytics/income/salary"
                prefetch={false}
                className="text-primary underline-offset-2 hover:underline"
              >
                Income
              </Link>
              .
            </p>
          </div>
          <NetChip net={netReceivable} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <GlassCard
            variant="signature"
            className="lending-hero-stat flex h-full min-h-0 flex-col"
            panelClassName="!flex !min-h-0 !flex-1 !flex-col !p-5"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              You owe (balance)
            </p>
            <p className="mt-2 text-2xl font-semibold text-amber-100 tabular-nums sm:text-3xl">
              {formatInr(totals.youOwe)}
            </p>
            <div className="mt-auto grid gap-1.5 pt-4 text-[11px] text-zinc-500">
              <div className="flex items-baseline justify-between gap-3">
                <span>Total borrowed</span>
                <span className="font-semibold tabular-nums text-ink">
                  {formatInr(totals.borrowed)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span>Total repaid</span>
                <span className="font-semibold tabular-nums text-ink">
                  {formatInr(totals.repaid)}
                </span>
              </div>
              <div className="pt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200/80">
                {contactsYouOwe.length} contact{contactsYouOwe.length === 1 ? "" : "s"} to repay
              </div>
            </div>
          </GlassCard>

          <GlassCard
            variant="signature"
            className="lending-hero-stat flex h-full min-h-0 flex-col"
            panelClassName="!flex !min-h-0 !flex-1 !flex-col !p-5"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              They owe you (balance)
            </p>
            <p className="mt-2 text-2xl font-semibold text-violet-100 tabular-nums sm:text-3xl">
              {formatInr(totals.theyOweYou)}
            </p>
            <div className="mt-auto grid gap-1.5 pt-4 text-[11px] text-zinc-500">
              <div className="flex items-baseline justify-between gap-3">
                <span>Total lent</span>
                <span className="font-semibold tabular-nums text-ink">
                  {formatInr(totals.lent)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span>Total received</span>
                <span className="font-semibold tabular-nums text-ink">
                  {formatInr(totals.received)}
                </span>
              </div>
              <div className="pt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-200/80">
                {contactsTheyOweYou.length} contact
                {contactsTheyOweYou.length === 1 ? "" : "s"} to collect from
              </div>
            </div>
          </GlassCard>

          <GlassCard
            variant="signature"
            className="lending-hero-stat flex h-full min-h-0 flex-col sm:col-span-2 xl:col-span-1"
            panelClassName="!flex !min-h-0 !flex-1 !flex-col !p-5"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Net to you
            </p>
            <p
              className={`mt-2 text-2xl font-semibold tabular-nums sm:text-3xl ${
                netReceivable > 0
                  ? "text-violet-100"
                  : netReceivable < 0
                    ? "text-amber-100"
                    : "text-zinc-300"
              }`}
            >
              {netReceivable >= 0 ? "" : "−"}
              {formatInr(Math.abs(netReceivable))}
            </p>
            <p className="mt-auto pt-3 text-[11px] text-zinc-500">
              Positive = more owed to you · Negative = you owe more overall
            </p>
          </GlassCard>
        </div>
      </header>

      <section className="relative z-1 space-y-4">
        <div className="grid gap-3 lg:grid-cols-2">
          <GlassCard variant="signature" hideAccent noLift panelClassName="!p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              12‑month trend · net deltas
            </p>
            <p className="mt-2 text-xs text-ink-muted">
              Monthly change in balances (borrow−repay, lend−receive) and net delta.
            </p>
            <div className="mt-4 h-[260px]">
              <LendingMonthlyDeltaChart data={monthlyTrend} />
            </div>
          </GlassCard>

          <div className="grid gap-3">
            <GlassCard variant="signature" hideAccent noLift panelClassName="!p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                By subcategory
              </p>
              <p className="mt-2 text-xs text-ink-muted">
                Per leaf category and transaction type (borrow/repay/lend/receive).
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-left">
                  <thead>
                    <tr>
                      <Th>Type</Th>
                      <Th>Subcategory</Th>
                      <Th>Transactions</Th>
                      <Th>Total</Th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:hover]:bg-white/4">
                    {bySubcategory.length === 0 ? (
                      <tr>
                        <Td className="text-zinc-500" colSpan={4}>
                          No borrow, repay, lend, or receive transactions yet.
                        </Td>
                      </tr>
                    ) : (
                      bySubcategory.slice(0, 14).map((r, i) => (
                        <tr key={`${r.type}-${r.categoryName}-${i}`}>
                          <Td>
                            <span
                              className={`inline-flex rounded-lg border px-2 py-0.5 text-xs font-medium ${transactionChipClass(
                                r.type,
                              )}`}
                            >
                              {transactionTypeLabel(r.type)}
                            </span>
                          </Td>
                          <Td>{r.categoryName}</Td>
                          <Td className="tabular-nums">{r.count}</Td>
                          <Td className="tabular-nums font-medium">{formatInr(r.total)}</Td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {bySubcategory.length > 14 ? (
                <p className="mt-3 text-xs text-ink-muted">
                  Showing top 14 rows. Full table is below.
                </p>
              ) : null}
            </GlassCard>
          </div>
        </div>
      </section>

      <section className="relative z-1 space-y-3">
        <h2 className="text-lg font-semibold tracking-tight text-ink">By contact</h2>
        <p className="text-xs text-ink-muted">Balances aggregate all repayments and receipts per person</p>
        <GlassCard variant="signature" hideAccent noLift panelClassName="!p-0 !overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr>
                  <Th>Contact</Th>
                  <Th>Borrowed</Th>
                  <Th>Repaid</Th>
                  <Th>You owe</Th>
                  <Th>Lent</Th>
                  <Th>Received</Th>
                  <Th>They owe you</Th>
                </tr>
              </thead>
              <tbody className="[&_tr:hover]:bg-white/4">
                {byContact.length === 0 ? (
                  <tr>
                    <Td className="text-zinc-500" colSpan={7}>
                      No loan transactions with a contact yet.
                    </Td>
                  </tr>
                ) : (
                  byContact.map((r) => {
                    const rowClass =
                      r.youOwe > 0
                        ? "bg-amber-500/6"
                        : r.theyOweYou > 0
                          ? "bg-violet-500/7"
                          : "";
                    return (
                      <tr key={r.contactId} className={rowClass}>
                        <Td className="font-medium">
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className={`h-2 w-2 shrink-0 rounded-full ${
                                r.youOwe > 0
                                  ? "bg-amber-400/90 shadow-[0_0_16px_rgba(251,191,36,0.25)]"
                                  : r.theyOweYou > 0
                                    ? "bg-violet-400/90 shadow-[0_0_16px_rgba(167,139,250,0.25)]"
                                    : "bg-white/20"
                              }`}
                              aria-hidden
                            />
                            <span className="min-w-0 truncate">{r.contactName}</span>
                            {r.youOwe > 0 ? (
                              <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/12 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                                repay
                              </span>
                            ) : null}
                            {r.theyOweYou > 0 ? (
                              <span className="shrink-0 rounded-full border border-violet-500/30 bg-violet-500/12 px-2 py-0.5 text-[11px] font-semibold text-violet-200">
                                collect
                              </span>
                            ) : null}
                          </div>
                        </Td>
                      <Td className="tabular-nums">{formatInr(r.borrowed)}</Td>
                      <Td className="tabular-nums">{formatInr(r.repaid)}</Td>
                      <Td
                        className={
                          r.youOwe > 0
                            ? "tabular-nums font-semibold text-amber-200"
                            : "tabular-nums"
                        }
                      >
                        {formatInr(r.youOwe)}
                      </Td>
                      <Td className="tabular-nums">{formatInr(r.lent)}</Td>
                      <Td className="tabular-nums">{formatInr(r.received)}</Td>
                      <Td
                        className={
                          r.theyOweYou > 0
                            ? "tabular-nums font-semibold text-violet-200"
                            : "tabular-nums"
                        }
                      >
                        {formatInr(r.theyOweYou)}
                      </Td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </section>

      {hasNoContactActivity ? (
        <section className="relative z-1 space-y-3">
          <h2 className="text-lg font-semibold tracking-tight text-ink">Without contact</h2>
          <GlassCard variant="signature" hideAccent noLift panelClassName="!p-5">
            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <div className="rounded-xl border border-white/8 bg-white/3 px-3 py-2.5">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Borrowed</dt>
                <dd className="mt-1 font-semibold tabular-nums">{formatInr(noContact.borrowed)}</dd>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/3 px-3 py-2.5">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Repaid</dt>
                <dd className="mt-1 font-semibold tabular-nums">{formatInr(noContact.repaid)}</dd>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/3 px-3 py-2.5">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">You owe</dt>
                <dd
                  className={`mt-1 font-semibold tabular-nums ${noContact.youOwe > 0 ? "text-amber-200" : ""}`}
                >
                  {formatInr(noContact.youOwe)}
                </dd>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/3 px-3 py-2.5">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Lent</dt>
                <dd className="mt-1 font-semibold tabular-nums">{formatInr(noContact.lent)}</dd>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/3 px-3 py-2.5">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Received</dt>
                <dd className="mt-1 font-semibold tabular-nums">{formatInr(noContact.received)}</dd>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/3 px-3 py-2.5">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">They owe you</dt>
                <dd
                  className={`mt-1 font-semibold tabular-nums ${noContact.theyOweYou > 0 ? "text-violet-200" : ""}`}
                >
                  {formatInr(noContact.theyOweYou)}
                </dd>
              </div>
            </dl>
          </GlassCard>
        </section>
      ) : null}

      {/* By subcategory moved into the insights band above */}
    </div>
  );
}
