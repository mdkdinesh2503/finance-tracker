"use client";

import { useTransactionFilters } from "@/lib/store/transaction-filters.store";
import { Label } from "@/components/ui/label";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Input } from "@/components/ui/input";
import { GlassCard } from "@/components/ui/glass-card";

type Opt = { id: string; name: string };

type Props = {
  locations: Opt[];
  onExport?: () => void;
  exportPending?: boolean;
  sortOrder?: "asc" | "desc";
  onToggleSort?: () => void;
};

export function FilterBar({ locations, onExport, exportPending, sortOrder = "desc", onToggleSort }: Props) {
  const {
    fromDate,
    toDate,
    categoryContains,
    locationId,
    setFromDate,
    setToDate,
    setCategoryContains,
    setLocationId,
    reset,
  } = useTransactionFilters();

  return (
    <GlassCard
      variant="signature"
      noLift
      className="overflow-hidden"
      panelClassName="!p-0"
    >
      <div className="bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] px-4 py-5 sm:px-5">
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
            {onToggleSort ? (
              <Button
                type="button"
                variant="ghost"
                onClick={onToggleSort}
                title={sortOrder === "desc" ? "Newest first — click for oldest first" : "Oldest first — click for newest first"}
                className="gap-1.5 rounded-full px-3 py-2 text-xs border border-(--border)! bg-(--glass-simple-bg)! text-ink! hover:border-primary/40! hover:bg-[color-mix(in_srgb,var(--primary)_10%,var(--surface))]!"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  {sortOrder === "desc" ? (
                    <>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 9h9M3 14h5" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4-4 4" />
                    </>
                  ) : (
                    <>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 9h9M3 14h5" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8l-4 4 4 4" />
                    </>
                  )}
                </svg>
                {sortOrder === "desc" ? "Newest first" : "Oldest first"}
              </Button>
            ) : null}
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
    </GlassCard>
  );
}
