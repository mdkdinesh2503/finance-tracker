import type { ReactNode } from "react";
import Link from "next/link";

import { GlassCard } from "@/components/ui/glass-card";
import type { LendingAnalyticsSnapshot } from "@/lib/types/lending-analytics";
import { formatInr } from "@/lib/utilities/format";
import {
  transactionChipClass,
  transactionTypeLabel,
} from "@/lib/utilities/transactions/type-ui";

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
      className={`border-b border-white/[0.04] px-3 py-2.5 text-sm text-ink transition-colors duration-150 first:rounded-l-lg last:rounded-r-lg ${className}`}
      colSpan={colSpan}
    >
      {children}
    </td>
  );
}

function NetChip({ net }: { net: number }) {
  if (net === 0) {
    return (
      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-zinc-500">
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
  const { totals, byContact, noContact, bySubcategory } = data;
  const hasNoContactActivity =
    noContact.borrowed > 0 ||
    noContact.repaid > 0 ||
    noContact.lent > 0 ||
    noContact.received > 0;

  const netReceivable = totals.theyOweYou - totals.youOwe;
  const maxExposure = Math.max(totals.youOwe, totals.theyOweYou, 1);
  const youBarPct = (totals.youOwe / maxExposure) * 100;
  const theyBarPct = (totals.theyOweYou / maxExposure) * 100;

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

      <header className="relative z-[1] space-y-8">
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
                href="/analytics/income"
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
              You owe (borrow − repay)
            </p>
            <p className="mt-2 text-2xl font-semibold text-amber-100 tabular-nums sm:text-3xl">
              {formatInr(totals.youOwe)}
            </p>
            <p className="mt-auto pt-3 text-[11px] text-zinc-500">
              Borrowed {formatInr(totals.borrowed)} · Repaid {formatInr(totals.repaid)}
            </p>
          </GlassCard>

          <GlassCard
            variant="signature"
            className="lending-hero-stat flex h-full min-h-0 flex-col"
            panelClassName="!flex !min-h-0 !flex-1 !flex-col !p-5"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              They owe you (lend − receive)
            </p>
            <p className="mt-2 text-2xl font-semibold text-violet-100 tabular-nums sm:text-3xl">
              {formatInr(totals.theyOweYou)}
            </p>
            <p className="mt-auto pt-3 text-[11px] text-zinc-500">
              Lent {formatInr(totals.lent)} · Received {formatInr(totals.received)}
            </p>
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

      <section className="relative z-[1] space-y-4">
        <GlassCard variant="signature" hideAccent noLift panelClassName="!p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Exposure mix</p>
          <p className="mt-2 text-xs text-ink-muted">
            Relative scale — not a payoff order. Assign contacts on each loan transaction for per-person
            rows below.
          </p>
          <div className="mt-5 space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                <span>You owe</span>
                <span className="tabular-nums text-amber-200/95">{formatInr(totals.youOwe)}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[#0a1020] ring-1 ring-white/5">
                <div
                  className="h-full rounded-full bg-linear-to-r from-amber-600 to-amber-400 motion-safe:transition-all motion-safe:duration-500"
                  style={{ width: `${youBarPct}%` }}
                  aria-hidden
                />
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                <span>They owe you</span>
                <span className="tabular-nums text-violet-200/95">{formatInr(totals.theyOweYou)}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[#0a1020] ring-1 ring-white/5">
                <div
                  className="h-full rounded-full bg-linear-to-r from-violet-600 to-violet-400 motion-safe:transition-all motion-safe:duration-500"
                  style={{ width: `${theyBarPct}%` }}
                  aria-hidden
                />
              </div>
            </div>
          </div>
        </GlassCard>
      </section>

      <section className="relative z-[1] space-y-3">
        <h2 className="text-lg font-semibold tracking-tight text-ink">By contact</h2>
        <p className="text-xs text-ink-muted">Balances aggregate all repayments and receipts per person</p>
        <GlassCard variant="signature" hideAccent panelClassName="!p-0 !overflow-hidden">
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
              <tbody className="[&_tr:hover]:bg-white/[0.04]">
                {byContact.length === 0 ? (
                  <tr>
                    <Td className="text-zinc-500" colSpan={7}>
                      No loan transactions with a contact yet.
                    </Td>
                  </tr>
                ) : (
                  byContact.map((r) => (
                    <tr key={r.contactId}>
                      <Td className="font-medium">{r.contactName}</Td>
                      <Td className="tabular-nums">{formatInr(r.borrowed)}</Td>
                      <Td className="tabular-nums">{formatInr(r.repaid)}</Td>
                      <Td className={r.youOwe > 0 ? "tabular-nums text-amber-200" : "tabular-nums"}>
                        {formatInr(r.youOwe)}
                      </Td>
                      <Td className="tabular-nums">{formatInr(r.lent)}</Td>
                      <Td className="tabular-nums">{formatInr(r.received)}</Td>
                      <Td className={r.theyOweYou > 0 ? "tabular-nums text-violet-200" : "tabular-nums"}>
                        {formatInr(r.theyOweYou)}
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </section>

      {hasNoContactActivity ? (
        <section className="relative z-[1] space-y-3">
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

      <section className="relative z-[1] space-y-3">
        <h2 className="text-lg font-semibold tracking-tight text-ink">By subcategory</h2>
        <p className="text-xs text-ink-muted">Per leaf and transaction type</p>
        <GlassCard variant="signature" hideAccent panelClassName="!p-0 !overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-left">
              <thead>
                <tr>
                  <Th>Type</Th>
                  <Th>Subcategory</Th>
                  <Th>Transactions</Th>
                  <Th>Total</Th>
                </tr>
              </thead>
              <tbody className="[&_tr:hover]:bg-white/[0.04]">
                {bySubcategory.length === 0 ? (
                  <tr>
                    <Td className="text-zinc-500" colSpan={4}>
                      No borrow, repay, lend, or receive transactions yet.
                    </Td>
                  </tr>
                ) : (
                  bySubcategory.map((r, i) => (
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
        </GlassCard>
      </section>
    </div>
  );
}
