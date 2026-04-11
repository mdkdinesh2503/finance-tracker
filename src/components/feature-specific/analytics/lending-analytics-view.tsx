import type { ReactNode } from "react";
import Link from "next/link";

import { PageHeader } from "@/components/common/page-header";
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
    <th className="border-b border-white/10 px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
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
      className={`border-b border-white/5 px-2 py-2 text-sm text-ink ${className}`}
      colSpan={colSpan}
    >
      {children}
    </td>
  );
}

export function LendingAnalyticsView({ data }: Props) {
  const { totals, byContact, noContact, bySubcategory } = data;
  const hasNoContactActivity =
    noContact.borrowed > 0 ||
    noContact.repaid > 0 ||
    noContact.lent > 0 ||
    noContact.received > 0;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Insights"
        title="Lending & borrowing"
        subtitle={
          <>
            Balances use <strong className="text-ink">all</strong> repayments and receipts against
            that contact—whether you record one full payment or several partial ones (for example
            ₹500 + ₹500 to settle ₹1,000 borrowed). Subcategory labels (partial vs full) are for
            reporting only. Use{" "}
            <Link href="/analytics" className="text-primary underline-offset-2 hover:underline">
              Analytics
            </Link>{" "}
            for expenses and income trends.
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <GlassCard className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            You owe (borrow − repay)
          </p>
          <p className="mt-1 text-xl font-semibold text-amber-200">
            {formatInr(totals.youOwe)}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Borrowed {formatInr(totals.borrowed)} · Repaid {formatInr(totals.repaid)}
          </p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            They owe you (lend − receive)
          </p>
          <p className="mt-1 text-xl font-semibold text-violet-200">
            {formatInr(totals.theyOweYou)}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Lent {formatInr(totals.lent)} · Received {formatInr(totals.received)}
          </p>
        </GlassCard>
        <GlassCard className="p-4 sm:col-span-2 lg:col-span-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Subcategories
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            Pick a leaf under Personal Borrowing, Debt Settlement, Friends &amp; Family Loan, or
            Loan Recovery when you add a transaction—e.g. Emergency Borrowing, Partial
            Repayment, Full Loan Recovery.
          </p>
        </GlassCard>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">By contact</h2>
        <p className="text-sm text-ink-muted">
          Assign a contact on borrow, repay, lend, and receive so balances stay per person.
        </p>
        <GlassCard className="overflow-x-auto p-0" hideAccent>
          <table className="w-full min-w-[640px] border-collapse">
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
            <tbody>
              {byContact.length === 0 ? (
                <tr>
                  <Td className="text-zinc-500" colSpan={7}>
                    No loan transactions with a contact yet.
                  </Td>
                </tr>
              ) : (
                byContact.map((r) => (
                  <tr key={r.contactId}>
                    <Td className="font-medium text-ink">{r.contactName}</Td>
                    <Td>{formatInr(r.borrowed)}</Td>
                    <Td>{formatInr(r.repaid)}</Td>
                    <Td className={r.youOwe > 0 ? "text-amber-200" : ""}>
                      {formatInr(r.youOwe)}
                    </Td>
                    <Td>{formatInr(r.lent)}</Td>
                    <Td>{formatInr(r.received)}</Td>
                    <Td className={r.theyOweYou > 0 ? "text-violet-200" : ""}>
                      {formatInr(r.theyOweYou)}
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </GlassCard>
      </section>

      {hasNoContactActivity ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">Without contact</h2>
          <GlassCard className="p-4">
            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-zinc-500">Borrowed</dt>
                <dd>{formatInr(noContact.borrowed)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Repaid</dt>
                <dd>{formatInr(noContact.repaid)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">You owe</dt>
                <dd className={noContact.youOwe > 0 ? "text-amber-200" : ""}>
                  {formatInr(noContact.youOwe)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Lent</dt>
                <dd>{formatInr(noContact.lent)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Received</dt>
                <dd>{formatInr(noContact.received)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">They owe you</dt>
                <dd className={noContact.theyOweYou > 0 ? "text-violet-200" : ""}>
                  {formatInr(noContact.theyOweYou)}
                </dd>
              </div>
            </dl>
          </GlassCard>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">By subcategory</h2>
        <p className="text-sm text-ink-muted">
          Totals per leaf category and transaction type (includes uncategorized rows).
        </p>
        <GlassCard className="overflow-x-auto p-0" hideAccent>
          <table className="w-full min-w-[480px] border-collapse">
            <thead>
              <tr>
                <Th>Type</Th>
                <Th>Subcategory</Th>
                <Th>Transactions</Th>
                <Th>Total</Th>
              </tr>
            </thead>
            <tbody>
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
                    <Td className="text-ink">{r.categoryName}</Td>
                    <Td>{r.count}</Td>
                    <Td className="tabular-nums">{formatInr(r.total)}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </GlassCard>
      </section>
    </div>
  );
}
