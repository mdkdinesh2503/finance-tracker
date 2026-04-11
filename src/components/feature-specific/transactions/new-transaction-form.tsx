"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import type { TransactionType } from "@/lib/db/schema";
import { createTransactionAction, quickEntrySuggestAction } from "@/app/actions/transactions";
import type { CategoryOption } from "./category-selector";
import { CategoryCascadeFields, parentIdForLeaf } from "./category-cascade-fields";
import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { TimePickerField } from "@/components/ui/time-picker-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/ui/glass-card";
import { Textarea } from "@/components/ui/textarea";
import { formatLocalYMD } from "@/lib/utilities/date-presets";
import { formatCurrency } from "@/lib/utilities/format";
import type { SuggestionDTO } from "@/lib/types/transactions";

type BorrowRow = { id: string; name: string };
type LocRow = { id: string; name: string };

const FALLBACK_SUGGESTED_AMOUNT = "250.00";

type Props = {
  categories: CategoryOption[];
  locations: LocRow[];
  contacts: BorrowRow[];
  suggestions: SuggestionDTO;
  loansSummary: { youOwe: number; theyOweYou: number };
  cashBalance: number;
};

function defaultTime(): string {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function firstParentCategoryId(categories: CategoryOption[]): string {
  const parents = categories
    .filter((c) => !c.isSelectable)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return parents[0]?.id ?? "";
}

function SectionLabel({
  step,
  title,
  hint,
}: {
  step: string;
  title: string;
  hint?: string;
}) {
  return (
    <div className="mb-4 border-b border-(--border) pb-3">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-primary">{step}</p>
      <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink">{title}</h2>
      {hint ? <p className="mt-1 text-xs leading-relaxed text-ink-muted">{hint}</p> : null}
    </div>
  );
}

export function NewTransactionForm({
  categories,
  locations,
  contacts,
  suggestions,
  loansSummary,
  cashBalance,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [qePending, startQeTransition] = useTransition();

  const initialLeaf = suggestions.categoryId ?? "";
  const initialParent =
    parentIdForLeaf(categories, initialLeaf) || firstParentCategoryId(categories);
  const initialLocationId = suggestions.locationId ?? locations[0]?.id ?? "";

  const [amount, setAmount] = useState(suggestions.amount ?? "");
  const [parentCategoryId, setParentCategoryId] = useState(initialParent);
  const [categoryId, setCategoryId] = useState(initialLeaf);
  const [txType, setTxType] = useState<TransactionType | "">(
    () => (initialLeaf && categories.find((c) => c.id === initialLeaf)?.type) || "",
  );
  const [locationId, setLocationId] = useState(initialLocationId);
  const [note, setNote] = useState("");
  const [contactId, setContactId] = useState("");
  const [quickText, setQuickText] = useState("");
  const [date, setDate] = useState(() => formatLocalYMD(new Date()));
  const [time, setTime] = useState(defaultTime);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const showLoanPerson =
    txType === "BORROW" ||
    txType === "REPAYMENT" ||
    txType === "LEND" ||
    txType === "RECEIVE";

  const locationOptions = useMemo(
    () => locations.map((l) => ({ id: l.id, name: l.name })),
    [locations],
  );

  const contactOptions = useMemo(
    () => contacts.map((b) => ({ id: b.id, name: b.name })),
    [contacts],
  );

  const categoryTypeLabel = useMemo(() => {
    if (!txType) return "—";
    return txType.replace(/_/g, " ");
  }, [txType]);

  const selectedCategoryName = useMemo(() => {
    if (!categoryId) return "—";
    return categories.find((c) => c.id === categoryId)?.name ?? "—";
  }, [categories, categoryId]);

  const selectedLocationName = useMemo(() => {
    if (!locationId) return "—";
    return locations.find((l) => l.id === locationId)?.name ?? "—";
  }, [locations, locationId]);

  const selectedContactName = useMemo(() => {
    if (!contactId) return "—";
    return contacts.find((c) => c.id === contactId)?.name ?? "—";
  }, [contacts, contactId]);

  function applySuggestions() {
    const leaf =
      suggestions.categoryId ??
      categories.find((c) => c.isSelectable)?.id ??
      "";
    setCategoryId(leaf);
    setParentCategoryId(parentIdForLeaf(categories, leaf));
    setTxType((leaf && categories.find((c) => c.id === leaf)?.type) || "");

    const loc =
      suggestions.locationId ??
      locations[0]?.id ??
      "";
    setLocationId(loc);

    setAmount(suggestions.amount ?? FALLBACK_SUGGESTED_AMOUNT);
  }

  function onParentChange(pid: string) {
    setParentCategoryId(pid);
    setCategoryId("");
    setTxType("");
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) next.amount = "Enter a valid amount";
    if (!categoryId) next.category = "Pick a subcategory";
    if (!txType) next.type = "Pick a transaction type";
    if (!date) next.date = "Pick a date";
    if (!time) next.time = "Pick a time";
    if (showLoanPerson && !contactId) next.contact = "Pick a contact";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function submit() {
    if (!validate()) return;
    startTransition(async () => {
      const res = await createTransactionAction({
        amount,
        categoryId,
        locationId: locationId ?? "",
        note: note ?? "",
        contactId: showLoanPerson ? contactId ?? "" : "",
        transactionDate: date,
        transactionTime: time,
      });
      if (!res.ok) {
        toast.error("Couldn’t save", { description: res.error });
        return;
      }
      toast.success("Transaction saved");
      router.replace("/transactions");
      router.refresh();
    });
  }

  function runQuickEntry() {
    startQeTransition(async () => {
      const res = await quickEntrySuggestAction({ text: quickText });
      if (!res.ok) {
        toast.error("Quick entry didn’t work", { description: res.error });
        return;
      }
      const leaf = res.data.categoryId ?? "";
      setCategoryId(leaf);
      setParentCategoryId(parentIdForLeaf(categories, leaf));
      setTxType((leaf && categories.find((c) => c.id === leaf)?.type) || "");
      setLocationId(res.data.locationId ?? locations[0]?.id ?? "");
      setAmount(res.data.amount ?? "");
    });
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/12 bg-linear-to-br from-[#070b12] via-[#0a1220] to-[#05070d] shadow-(--shadow-lift) ring-1 ring-white/8 backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -left-28 -bottom-24 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" aria-hidden />

        <div className="relative border-b border-white/10 px-5 py-5 sm:px-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                New entry
              </p>
              <h2 className="mt-1 text-pretty text-2xl font-semibold tracking-tight text-ink">
                Add transaction
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                Pick a category group, then a subcategory. Transaction type follows your
                subcategory automatically.
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={applySuggestions}
                className="inline-flex items-center justify-center rounded-xl border border-white/12 bg-white/4 px-3.5 py-2 text-xs font-semibold text-ink-muted transition-colors hover:border-white/18 hover:bg-white/6 hover:text-ink"
              >
                Use suggestions
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/4 p-3 sm:p-3.5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                  Quick entry
                </p>
                <div className="mt-2 flex gap-2">
                  <Input
                    value={quickText}
                    onChange={(e) => setQuickText(e.target.value)}
                    placeholder='e.g. "250 coffee at Starbucks"'
                    autoComplete="off"
                    className="h-11"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={runQuickEntry}
                    disabled={qePending || quickText.trim().length === 0}
                    className="h-11 shrink-0"
                  >
                    {qePending ? "Parsing…" : "Suggest"}
                  </Button>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="relative grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-[1fr_380px] lg:items-start">
          <div className="space-y-10">
            <div>
              <SectionLabel
                step="01 · Value"
                title="How much?"
                hint="Use your usual currency; amounts are stored with two decimals."
              />
              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/3">
                <div className="grid grid-cols-[54px_1fr]">
                  <div className="flex items-center justify-center border-r border-white/10 bg-white/5 text-sm font-semibold text-ink">
                    ₹
                  </div>
                  <Input
                    id="amount"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    aria-invalid={!!errors.amount}
                    className={`h-12 rounded-none border-0 bg-transparent px-4 text-base font-semibold tabular-nums tracking-tight focus:ring-0 ${
                      errors.amount ? "text-rose-200" : ""
                    }`}
                    placeholder="0.00"
                  />
                </div>
              </div>
              {errors.amount ? <p className="mt-2 text-xs text-rose-400">{errors.amount}</p> : null}
            </div>

            <div>
              <SectionLabel
                step="02 · Category"
                title="Where does this belong?"
                hint="Choose a group, then a subcategory."
              />
              <div className="mt-4">
                <CategoryCascadeFields
                  categories={categories}
                  parentId={parentCategoryId}
                  subId={categoryId}
                  onParentChange={onParentChange}
                  onSubChange={(id, t) => {
                    setCategoryId(id ?? "");
                    setTxType(t ?? "");
                  }}
                  error={errors.category}
                />
              </div>
            </div>

            <div>
              <SectionLabel step="03 · Place" title="Location" />
              <div className="mt-4 space-y-2">
                <DropdownSelect
                  id="location"
                  value={locationId || null}
                  onChange={(v) => setLocationId(v ?? "")}
                  options={locationOptions}
                  emptyLabel="—"
                  includeEmptyOption={locationOptions.length === 0}
                  aria-invalid={!!errors.location}
                />
                {errors.location ? <p className="text-xs text-rose-400">{errors.location}</p> : null}
              </div>
            </div>

            {showLoanPerson ? (
              <div>
                <SectionLabel step="04 · Person" title="Contact" hint="Required for loan transactions." />
                <div className="mt-4 space-y-2">
                  <DropdownSelect
                    id="contact"
                    value={contactId || null}
                    onChange={(v) => setContactId(v ?? "")}
                    options={contactOptions}
                    emptyLabel="—"
                    aria-invalid={!!errors.contact}
                  />
                  {errors.contact ? <p className="text-xs text-rose-400">{errors.contact}</p> : null}
                </div>
              </div>
            ) : null}

            <div>
              <SectionLabel step="05 · Extra" title="Notes" hint="Optional — visible in your transaction list." />
              <div className="mt-4">
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Coffee with team, invoice #…"
                />
              </div>
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-4">
            <GlassCard variant="signature" noLift hideAccent panelClassName="!p-5" className="overflow-hidden">
              <div className="pointer-events-none absolute -right-20 -top-16 h-48 w-48 rounded-full bg-primary/12 blur-3xl" aria-hidden />
              <p className="relative text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                Type
              </p>
              <p className="relative mt-2 text-3xl font-semibold tracking-tight text-ink">
                {txType ? txType.replace(/_/g, " ") : "—"}
              </p>
              <p className="relative mt-2 text-sm text-ink-muted">
                Set by the subcategory you choose.
              </p>
              {errors.type ? <p className="mt-3 text-xs text-rose-400">{errors.type}</p> : null}
            </GlassCard>

            <GlassCard variant="signature" noLift hideAccent panelClassName="!p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                Balance
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                Snapshot before saving this entry.
              </p>

              <div className="mt-4 grid gap-2">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/4 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-400/80" aria-hidden />
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                      Cash
                    </span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums tracking-tight text-ink">
                    {formatCurrency(cashBalance)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl border border-orange-500/20 bg-orange-500/8 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-orange-400/80" aria-hidden />
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-200/90">
                      Pending liability
                    </span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums tracking-tight text-ink">
                    {formatCurrency(loansSummary.youOwe)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400/80" aria-hidden />
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200/90">
                      Pending receivable
                    </span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums tracking-tight text-ink">
                    {formatCurrency(loansSummary.theyOweYou)}
                  </span>
                </div>
              </div>
            </GlassCard>

            <GlassCard variant="signature" noLift hideAccent panelClassName="!p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                When
              </p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight text-ink">Date & time</h3>
              <p className="mt-1 text-sm text-ink-muted">Stored in your local timezone.</p>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <DatePickerField id="date" value={date} onChange={(d) => setDate(d ?? "")} />
                  {errors.date ? <p className="text-xs text-rose-400">{errors.date}</p> : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <TimePickerField id="time" value={time} onChange={setTime} />
                  {errors.time ? <p className="text-xs text-rose-400">{errors.time}</p> : null}
                </div>
              </div>
            </GlassCard>

            <div className="flex items-center gap-3 pt-2">
              <Button type="button" onClick={submit} disabled={pending} className="flex-1">
                {pending ? "Saving…" : "Save transaction"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
                disabled={pending || qePending}
              >
                Cancel
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

