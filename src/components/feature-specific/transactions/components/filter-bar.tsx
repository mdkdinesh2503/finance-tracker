"use client";

import { useMemo } from "react";
import type { DatePreset } from "@/lib/types/filters";
import { useTransactionFilters } from "@/lib/store/transaction-filters.store";
import { Label } from "@/components/ui/label";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Input } from "@/components/ui/input";
import { GlassCard } from "@/components/ui/glass-card";

const PRESET_PILLS: { value: Exclude<DatePreset, "CUSTOM_RANGE">; label: string }[] = [
  { value: "ALL_TIME", label: "All time" },
  { value: "THIS_AND_PREVIOUS_YEAR", label: "This + previous year" },
  { value: "THIS_YEAR", label: "This year" },
  { value: "THIS_MONTH", label: "This month" },
  { value: "LAST_MONTH", label: "Last month" },
];

function pillClasses(active: boolean) {
  return [
    "rounded-full border px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap",
    active
      ? "border-primary/60 bg-[var(--dropdown-selected-bg)] text-white shadow-sm shadow-primary/20"
      : "border-(--border) bg-(--surface) text-ink hover:border-primary/40 hover:bg-[color-mix(in_srgb,var(--primary)_12%,var(--surface))]",
  ].join(" ");
}

type Opt = { id: string; name: string };

type Props = {
  locations: Opt[];
  onExport?: () => void;
  exportPending?: boolean;
};

export function FilterBar({ locations, onExport, exportPending }: Props) {
  const {
    datePreset,
    fromDate,
    toDate,
    categoryContains,
    locationId,
    setDatePreset,
    setFromDate,
    setToDate,
    setCategoryContains,
    setLocationId,
    reset,
  } = useTransactionFilters();

  const { thisMonthAllYearsLabel, lastMonthAllYearsLabel } = useMemo(() => {
    const now = new Date();
    const thisM = now.toLocaleString(undefined, { month: "long" });
    const prev = new Date(now);
    prev.setMonth(prev.getMonth() - 1);
    const prevM = prev.toLocaleString(undefined, { month: "long" });
    return {
      thisMonthAllYearsLabel: `${thisM} · all years`,
      lastMonthAllYearsLabel: `${prevM} · all years`,
    };
  }, []);

  return (
    <GlassCard
      variant="signature"
      noLift
      className="sticky top-3 z-30 overflow-hidden"
      panelClassName="!p-0"
    >
      <div className="border-b border-(--border) bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] px-4 py-5 sm:px-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/25 bg-linear-to-br from-primary/18 to-transparent text-primary"
              aria-hidden
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M7 12h10M10 18h4" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                Filters
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                Everything below matches these controls.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => reset()}
              className="gap-2 rounded-full px-3 py-2 text-xs border border-(--border)! bg-(--glass-simple-bg)! text-ink! hover:bg-surface!"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 12a9 9 0 11-2.64-6.36M21 3v6h-6"
                />
              </svg>
              Reset
            </Button>
            {onExport ? (
              <Button
                type="button"
                variant="secondary"
                onClick={onExport}
                disabled={exportPending}
                className="gap-2 rounded-full px-3 py-2 text-xs border border-primary/40! bg-primary! text-white! shadow-lg shadow-primary/20! hover:bg-primary-hover! hover:shadow-xl hover:shadow-primary/25!"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3v10m0 0l4-4m-4 4l-4-4"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"
                  />
                </svg>
                {exportPending ? "Exporting…" : "Export CSV"}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
          <div className="min-w-0 space-y-0">
            <Label htmlFor="filter-from">From date</Label>
            <DatePickerField id="filter-from" value={fromDate} onChange={setFromDate} />
          </div>
          <div className="min-w-0 space-y-0">
            <Label htmlFor="filter-to">To date</Label>
            <DatePickerField id="filter-to" value={toDate} onChange={setToDate} />
          </div>
          <div className="min-w-0 space-y-0 sm:col-span-2 xl:col-span-1">
            <Label htmlFor="filter-cat">Category contains</Label>
            <Input
              id="filter-cat"
              type="search"
              placeholder="e.g. Rent"
              value={categoryContains}
              onChange={(e) => setCategoryContains(e.target.value)}
              autoComplete="off"
              className="rounded-xl"
            />
          </div>
          <div className="min-w-0 space-y-0 sm:col-span-2 xl:col-span-1">
            <Label htmlFor="floc">Location</Label>
            <DropdownSelect
              id="floc"
              value={locationId}
              onChange={setLocationId}
              options={locations}
              emptyLabel="All locations"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3 px-4 py-5 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            Time range
          </p>
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-muted">
            presets
          </p>
        </div>

        <div className="relative">
          <div className="scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {PRESET_PILLS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setDatePreset(p.value)}
                className={pillClasses(datePreset === p.value)}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setDatePreset("THIS_MONTH_ALL_YEARS")}
              className={pillClasses(datePreset === "THIS_MONTH_ALL_YEARS")}
            >
              {thisMonthAllYearsLabel}
            </button>
            <button
              type="button"
              onClick={() => setDatePreset("LAST_MONTH_ALL_YEARS")}
              className={pillClasses(datePreset === "LAST_MONTH_ALL_YEARS")}
            >
              {lastMonthAllYearsLabel}
            </button>
          </div>
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-8 opacity-70"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-8 opacity-70"
            aria-hidden
          />
        </div>

        <p className="max-w-3xl text-xs leading-relaxed text-ink-muted">
          <strong className="font-medium text-ink">all years</strong> matches that calendar month
          across every year. <strong className="font-medium text-ink">Last month</strong> is the
          full previous calendar month only.
        </p>
      </div>
    </GlassCard>
  );
}

