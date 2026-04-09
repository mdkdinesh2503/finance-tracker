"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { TransactionType } from "@/lib/db/schema";
import {
  createTransactionAction,
  quickEntrySuggestAction,
} from "@/app/actions/transactions";
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
  const initialParent = parentIdForLeaf(categories, initialLeaf);

  const [amount, setAmount] = useState(suggestions.amount ?? "");
  const [parentCategoryId, setParentCategoryId] = useState(initialParent);
  const [categoryId, setCategoryId] = useState(initialLeaf);
  const [txType, setTxType] = useState<TransactionType | "">(
    () => (initialLeaf && categories.find((c) => c.id === initialLeaf)?.type) || "",
  );
  const [locationId, setLocationId] = useState(suggestions.locationId ?? "");
  const [note, setNote] = useState("");
  const [contactId, setContactId] = useState("");
  const [quickText, setQuickText] = useState("");
  const [date, setDate] = useState(() => formatLocalYMD(new Date()));
  const [time, setTime] = useState(defaultTime);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

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
    setFormError(null);
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
        setFormError(res.error);
        return;
      }
      router.replace("/transactions");
      router.refresh();
    });
  }

  function runQuickEntry() {
    startQeTransition(async () => {
      const res = await quickEntrySuggestAction({ text: quickText });
      if (!res.ok) {
        setFormError(res.error);
        return;
      }
      const leaf = res.data.categoryId ?? "";
      setCategoryId(leaf);
      setParentCategoryId(parentIdForLeaf(categories, leaf));
      setTxType((leaf && categories.find((c) => c.id === leaf)?.type) || "");
      setLocationId(res.data.locationId ?? "");
      setAmount(res.data.amount ?? "");
    });
  }

  return (
    <div className="space-y-6">
      {formError ? (
        <p className="text-sm text-rose-400" role="alert">
          {formError}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
        <div className="space-y-6">
          <GlassCard variant="signature" noLift hideAccent panelClassName="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-ink-muted">Cash balance</p>
                <p className="text-xl font-semibold tracking-tight text-ink">
                  {formatCurrency(cashBalance)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-full border border-(--border) bg-(--surface)/40 px-3 py-1 text-xs text-ink">
                  You owe{" "}
                  <span className="ml-1 font-semibold text-ink">
                    {formatCurrency(loansSummary.youOwe)}
                  </span>
                </div>
                <div className="rounded-full border border-(--border) bg-(--surface)/40 px-3 py-1 text-xs text-ink">
                  Owed to you{" "}
                  <span className="ml-1 font-semibold text-ink">
                    {formatCurrency(loansSummary.theyOweYou)}
                  </span>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard variant="signature" noLift panelClassName="p-6">
            <SectionLabel
              step="Quick"
              title="Quick entry"
              hint="Type a sentence and auto-fill fields."
            />
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="space-y-0">
                <Label htmlFor="quick-text">Text</Label>
                <Input
                  id="quick-text"
                  value={quickText}
                  onChange={(e) => setQuickText(e.target.value)}
                  placeholder="e.g. 250 coffee at Starbucks"
                  autoComplete="off"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={runQuickEntry}
                disabled={qePending}
              >
                {qePending ? "Parsing…" : "Suggest"}
              </Button>
            </div>
            <p className="mt-3 text-xs text-ink-muted">
              Tip: include a place and category keywords for better suggestions.
            </p>
          </GlassCard>

          <GlassCard variant="signature" noLift panelClassName="p-6">
            <SectionLabel step="1" title="Amount + category" hint="Pick a subcategory to lock the transaction type." />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-ink-muted">
                    {formatCurrency(0).replace(/[0-9.,\s]/g, "").trim() || "¤"}
                  </div>
                  <Input
                    id="amount"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    aria-invalid={!!errors.amount}
                    className="pl-8"
                    placeholder="0.00"
                  />
                </div>
                {errors.amount ? <p className="text-xs text-rose-400">{errors.amount}</p> : null}
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <div className="rounded-xl border border-(--border) bg-(--surface)/40 px-3 py-2.5 text-sm text-ink-muted">
                  {categoryTypeLabel}
                </div>
                {errors.type ? <p className="text-xs text-rose-400">{errors.type}</p> : null}
              </div>
            </div>

            <div className="mt-5">
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
          </GlassCard>

          <GlassCard variant="signature" noLift panelClassName="p-6">
            <SectionLabel step="2" title="Details" hint="Add context so future-you can search faster." />
            <div className="grid gap-4 sm:grid-cols-2">
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
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <DropdownSelect
                  id="location"
                  value={locationId || null}
                  onChange={(v) => setLocationId(v ?? "")}
                  options={locationOptions}
                  emptyLabel="—"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="note">Note</Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional: who/why/what made this transaction special?"
                />
              </div>

              {showLoanPerson ? (
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="contact">Contact</Label>
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
              ) : null}
            </div>
          </GlassCard>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4">
          <GlassCard variant="signature" noLift panelClassName="p-6">
            <div className="mb-4 border-b border-(--border) pb-3">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-primary">
                Review
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink">Ready to save</h2>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                Double-check the essentials before writing to your ledger.
              </p>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-ink-muted">Amount</span>
                <span className="font-semibold text-ink">
                  {amount ? formatCurrency(Number(amount) || 0) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-ink-muted">Category</span>
                <span className="truncate font-medium text-ink" title={selectedCategoryName}>
                  {selectedCategoryName}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-ink-muted">Type</span>
                <span className="font-medium text-ink">{categoryTypeLabel}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-ink-muted">When</span>
                <span className="font-medium text-ink">
                  {date || "—"} {time || ""}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-ink-muted">Location</span>
                <span className="truncate font-medium text-ink" title={selectedLocationName}>
                  {selectedLocationName}
                </span>
              </div>
              {showLoanPerson ? (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-ink-muted">Contact</span>
                  <span className="truncate font-medium text-ink" title={selectedContactName}>
                    {selectedContactName}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <Button type="button" onClick={submit} disabled={pending}>
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
              <p className="pt-1 text-xs text-ink-muted">
                Nothing is saved until you hit <span className="font-medium text-ink">Save</span>.
              </p>
            </div>
          </GlassCard>

          <GlassCard variant="simple" noLift className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Pro tip</p>
            <p className="mt-2 text-sm text-ink-muted">
              If you do this often, quick entry is fastest:{" "}
              <span className="font-medium text-ink">“450 groceries at DMart”</span>.
            </p>
          </GlassCard>
        </aside>
      </div>
    </div>
  );
}

