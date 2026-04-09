"use client";

import { useMemo } from "react";
import type { DatePreset } from "@/lib/types/filters";
import { useTransactionFilters } from "@/lib/store/transaction-filters.store";
import { Label } from "@/components/ui/label";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Input } from "@/components/ui/input";

const PRESET_PILLS: { value: Exclude<DatePreset, "CUSTOM_RANGE">; label: string }[] = [
  { value: "ALL_TIME", label: "All time" },
  { value: "THIS_AND_PREVIOUS_YEAR", label: "This + previous year" },
  { value: "THIS_YEAR", label: "This year" },
  { value: "THIS_MONTH", label: "This month" },
  { value: "LAST_MONTH", label: "Last month" },
];

function pillClasses(active: boolean) {
  return [
    "rounded-full border px-3.5 py-2 text-xs font-medium transition-colors",
    active
      ? "border-primary/60 bg-[var(--dropdown-selected-bg)] text-white shadow-sm shadow-primary/20"
      : "border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] hover:border-primary/40 hover:bg-[color-mix(in_srgb,var(--primary)_12%,var(--surface))]",
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
    <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-white/20 bg-white/6 shadow-(--shadow-card) backdrop-blur-md">
      <div className="border-b border-white/10 bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] px-4 py-5 sm:px-5">
        <p className="mb-4 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Filters
        </p>
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
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Time range
        </p>
        <p className="max-w-3xl text-xs leading-relaxed text-zinc-500">
          Quick presets set the filters above.{" "}
          <strong className="font-medium text-zinc-400">all years</strong>{" "}
          matches that calendar month across every year (month is compared in UTC, same as charts).{" "}
          <strong className="font-medium text-zinc-400">Last month</strong> is the full previous calendar month only. Default is all time.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
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
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 bg-black/20 px-4 py-3 sm:px-5">
        <Button type="button" variant="ghost" onClick={() => reset()}>
          Reset filters
        </Button>
        {onExport ? (
          <Button type="button" onClick={onExport} disabled={exportPending}>
            {exportPending ? "Exporting…" : "Export CSV"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

