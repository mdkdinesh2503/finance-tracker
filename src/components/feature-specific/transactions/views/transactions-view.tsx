"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  exportTransactionsCsvAction,
  fetchTransactionsListAction,
  fetchUnsettledLoanContactsAction,
} from "@/app/actions/transactions";
import { useTransactionFilters } from "@/lib/store/transaction-filters.store";
import type { TransactionRowDTO } from "@/lib/types/transactions";
import { PageHeader } from "@/components/common/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { FilterBar } from "../components/filter-bar";
import { TransactionsAccordion } from "../components/transactions-accordion";
import { TransactionsListSkeleton } from "@/components/common/skeleton/transactions-list-skeleton";

type Opt = { id: string; name: string };

export function TransactionsView({ locationOptions }: { locationOptions: Opt[] }) {
  const { datePreset, fromDate, toDate, categoryContains, locationId } = useTransactionFilters();
  const [rows, setRows] = useState<TransactionRowDTO[] | null>(null);
  const [unsettled, setUnsettled] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [exporting, setExporting] = useState(false);

  const load = useCallback(() => {
    startTransition(async () => {
      setError(null);
      const [res, loans] = await Promise.all([
        fetchTransactionsListAction({
          datePreset,
          fromDate,
          toDate,
          categoryContains,
          locationId,
        }),
        fetchUnsettledLoanContactsAction(),
      ]);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setRows(res.rows);
      if (loans.ok) {
        setUnsettled(new Set(loans.unsettledContactIds));
      }
    });
  }, [datePreset, fromDate, toDate, categoryContains, locationId]);

  useEffect(() => {
    load();
  }, [load]);

  async function onExport() {
    setExporting(true);
    try {
      const res = await exportTransactionsCsvAction({
        datePreset,
        fromDate,
        toDate,
        categoryContains,
        locationId,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="relative space-y-6">
      <div
        className="pointer-events-none absolute -right-24 -top-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-20 top-48 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl"
        aria-hidden
      />

      <PageHeader
        eyebrow="Records"
        title="Transactions"
        subtitle="Filter and export; CSV matches the filters below."
      />

      <FilterBar locations={locationOptions} onExport={onExport} exportPending={exporting} />

      {error ? (
        <p className="text-sm text-rose-400" role="alert">
          {error}
        </p>
      ) : null}

      <GlassCard variant="signature" noLift className="overflow-hidden" panelClassName="!p-0">
        {rows === null || pending ? (
          <TransactionsListSkeleton />
        ) : (
          <TransactionsAccordion rows={rows} unsettledLoanContacts={unsettled} />
        )}
      </GlassCard>
    </div>
  );
}

