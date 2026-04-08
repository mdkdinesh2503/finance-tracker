"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { TransactionType } from "@/lib/db/schema";
import { createTransactionAction, quickEntrySuggestAction } from "@/app/actions/transactions";
import type { CategoryOption } from "@/components/transactions/category-selector";
import {
  CategoryCascadeFields,
  parentIdForLeaf,
} from "@/components/transactions/category-cascade-fields";
import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { TimePickerField } from "@/components/ui/time-picker-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatLocalYMD } from "@/lib/utils/date-presets";
import { formatCurrency } from "@/lib/utils/format";
import type { SuggestionDTO } from "@/features/transactions/types";

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
    <div className="mb-4 border-b border-white/10 pb-3">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-primary">
        {step}
      </p>
      <h2 className="mt-1 text-lg font-semibold tracking-tight text-white">
        {title}
      </h2>
      {hint ? (
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">{hint}</p>
      ) : null}
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
    () =>
      (initialLeaf &&
        categories.find((c) => c.id === initialLeaf)?.type) ||
      ""
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
    [locations]
  );

  const contactOptions = useMemo(
    () => contacts.map((b) => ({ id: b.id, name: b.name })),
    [contacts]
  );

  const categoryTypeLabel = useMemo(() => {
    if (!txType) return "—";
    return txType.replace(/_/g, " ");
  }, [txType]);

  function onParentChange(pid: string) {
    setParentCategoryId(pid);
    setCategoryId("");
    setTxType("");
  }

  function onSubChange(
    id: string | null,
    type: TransactionType | null
  ) {
    if (!id || !type) {
      setCategoryId("");
      setTxType("");
      return;
    }
    setCategoryId(id);
    setTxType(type);
  }

  const applySuggestions = () => {
    if (suggestions.amount) setAmount(suggestions.amount);
    if (suggestions.locationId) setLocationId(suggestions.locationId);
    if (suggestions.categoryId) {
      const leaf = suggestions.categoryId;
      setParentCategoryId(parentIdForLeaf(categories, leaf));
      setCategoryId(leaf);
      const c = categories.find((x) => x.id === leaf);
      if (c) setTxType(c.type);
    }
  };

  function applyQuickEntry() {
    setFormError(null);
    startQeTransition(async () => {
      const res = await quickEntrySuggestAction({ text: quickText });
      if (!res.ok) {
        setFormError(res.error);
        return;
      }
      setAmount(res.data.amount);
      setNote(res.data.note);
      if (res.data.contactId) setContactId(res.data.contactId);
      if (res.data.categoryId) {
        const leaf = res.data.categoryId;
        setParentCategoryId(parentIdForLeaf(categories, leaf));
        setCategoryId(leaf);
        const c = categories.find((x) => x.id === leaf);
        if (c) setTxType(c.type);
      } else {
        setCategoryId("");
        setTxType(res.data.type);
      }
      setErrors({});
    });
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    const n = Number(amount);
    if (!amount || !Number.isFinite(n) || n <= 0) {
      e.amount = "Enter a positive amount";
    }
    if (!categoryId) {
      e.category = parentCategoryId
        ? "Choose a subcategory"
        : "Choose a category group and subcategory";
    }
    if (!locationId) e.location = "Choose a location";
    if (!date) e.date = "Date required";
    if (!time) e.time = "Time required";
    if (showLoanPerson && !contactId) {
      e.contact = "Choose a contact for this loan";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function submit() {
    setFormError(null);
    if (!validate()) return;
    startTransition(async () => {
      const res = await createTransactionAction({
        amount: Number(amount).toFixed(2),
        categoryId,
        locationId,
        contactId: showLoanPerson ? contactId : undefined,
        transactionDate: date,
        transactionTime: time.length === 5 ? `${time}:00` : time,
        note: note || undefined,
      });
      if (res.ok) {
        router.push("/transactions");
        router.refresh();
      } else {
        setFormError(res.error);
      }
    });
  }

  return (
    <div className="relative mx-auto max-w-5xl px-4 pb-24 pt-4 sm:px-5">
      <div
        className="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-primary/12 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-20 top-48 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl"
        aria-hidden
      />

      <div className="relative overflow-hidden rounded-3xl border border-white/12 bg-linear-to-br from-slate-900/95 via-[#0c1222]/98 to-[#070b12] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.65)] ring-1 ring-white/6 backdrop-blur-xl">
        <div
          className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/45 to-transparent"
          aria-hidden
        />
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/[0.07] blur-2xl" aria-hidden />

        <div className="relative p-6 sm:p-9 lg:p-10">
          <header className="mb-10 flex flex-col gap-4 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-primary">
                New entry
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Add transaction
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500">
                Pick a category group, then a subcategory. Transaction type follows
                your subcategory automatically.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                className="shrink-0 self-start rounded-xl border border-white/10 bg-white/3 px-4 text-xs sm:self-auto"
                onClick={applySuggestions}
              >
                Use suggestions
              </Button>
            </div>
          </header>

          <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="space-y-10 lg:col-span-7">
              <section>
                <SectionLabel
                  step="00 · Quick entry"
                  title="Type once, auto-fill"
                  hint="Example: “250 rent” or “1200 dinesh” (amount first). Matches your quick-entry rules."
                />
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    value={quickText}
                    onChange={(e) => setQuickText(e.target.value)}
                    placeholder="e.g. 250 rent"
                    className="flex-1 rounded-2xl"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0"
                    onClick={applyQuickEntry}
                    disabled={qePending || !quickText.trim()}
                  >
                    {qePending ? "Filling…" : "Auto fill"}
                  </Button>
                </div>
              </section>

              <section>
                <SectionLabel
                  step="01 · Value"
                  title="How much?"
                  hint="Use your usual currency; amounts are stored with two decimals."
                />
                <div
                  className={`flex items-center rounded-xl border border-(--border) bg-(--surface)/50 backdrop-blur-md transition focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 ${
                    errors.amount
                      ? "border-rose-500/50 ring-1 ring-rose-500/25"
                      : ""
                  }`}
                >
                  <span
                    className="shrink-0 select-none border-r border-(--border) py-2.5 pl-3 pr-2.5 text-sm font-medium tabular-nums text-ink-muted"
                    aria-hidden
                  >
                    ₹
                  </span>
                  <input
                    id="amount"
                    inputMode="decimal"
                    autoComplete="off"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    aria-invalid={!!errors.amount}
                    placeholder="0.00"
                    className="min-w-0 flex-1 border-0 bg-transparent py-2.5 pr-3 pl-2.5 text-base font-semibold tabular-nums tracking-tight text-ink outline-none placeholder:text-ink-muted"
                  />
                </div>
                {errors.amount ? (
                  <p className="mt-2 text-xs text-rose-400" role="alert">
                    {errors.amount}
                  </p>
                ) : null}
              </section>

              <section>
                <SectionLabel
                  step="02 · Category"
                  title="Where does this belong?"
                />
                <div className="rounded-2xl border border-white/8 bg-black/20 p-4 sm:p-5">
                  <CategoryCascadeFields
                    categories={categories}
                    parentId={parentCategoryId}
                    subId={categoryId}
                    onParentChange={onParentChange}
                    onSubChange={onSubChange}
                    error={errors.category}
                  />
                </div>
              </section>

              <section>
                <SectionLabel step="03 · Place" title="Location" />
                <DropdownSelect
                  id="location"
                  value={locationId || null}
                  onChange={(id) => setLocationId(id ?? "")}
                  options={locationOptions}
                  emptyLabel="Select location"
                  aria-invalid={!!errors.location}
                />
                {errors.location ? (
                  <p className="mt-2 text-xs text-rose-400" role="alert">
                    {errors.location}
                  </p>
                ) : null}
              </section>

              {showLoanPerson ? (
                <section>
                  <SectionLabel
                    step="04 · Person"
                    title="Contact"
                  />
                  <DropdownSelect
                    id="contact"
                    value={contactId || null}
                    onChange={(id) => setContactId(id ?? "")}
                    options={contactOptions}
                    emptyLabel="Select contact"
                    aria-invalid={!!errors.contact}
                  />
                  {errors.contact ? (
                    <p className="mt-2 text-xs text-rose-400" role="alert">
                      {errors.contact}
                    </p>
                  ) : null}
                  {contacts.length === 0 ? (
                    <p className="mt-2 text-xs text-zinc-500">
                      Add people under Settings → People you track first.
                    </p>
                  ) : null}
                </section>
              ) : null}

              <section>
                <SectionLabel
                  step={showLoanPerson ? "05 · Extra" : "04 · Extra"}
                  title="Notes"
                  hint="Optional — visible in your transaction list."
                />
                <Input
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Coffee with team, invoice #…"
                  className="rounded-2xl"
                />
              </section>
            </div>

            <aside className="space-y-6 lg:col-span-5">
              <div className="rounded-2xl border border-primary/20 bg-linear-to-b from-primary/12 to-transparent p-6 shadow-inner shadow-black/20">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-primary">
                  Type
                </p>
                <p className="mt-3 text-2xl font-semibold capitalize tracking-tight text-white">
                  {categoryTypeLabel}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                  Set by the subcategory you choose. Borrow and repayment rows
                  need a person.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/25 p-6">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-primary">
                  Loans snapshot
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/3 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-white/55">
                      You owe
                    </p>
                    <p className="mt-1 text-base font-semibold tabular-nums tracking-tight text-amber-200">
                      {formatCurrency(loansSummary.youOwe)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/3 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-white/55">
                      Others owe you
                    </p>
                    <p className="mt-1 text-base font-semibold tabular-nums tracking-tight text-emerald-200">
                      {formatCurrency(loansSummary.theyOweYou)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/25 p-6">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-primary">
                  Balance snapshot
                </p>
                <div className="mt-4">
                  <div className="rounded-xl border border-white/10 bg-white/3 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-white/55">
                      Available balance
                    </p>
                    <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-emerald-200">
                      {formatCurrency(cashBalance)}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                  Expense, Investment, Repayment, and Lend are blocked if they exceed this balance.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/25 p-6">
                <SectionLabel
                  step="When"
                  title="Date & time"
                  hint="Stored in your local timezone."
                />
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <DatePickerField
                      id="date"
                      value={date}
                      onChange={(v) => v && setDate(v)}
                      allowClear={false}
                      aria-invalid={!!errors.date}
                      aria-describedby={errors.date ? "date-err" : undefined}
                    />
                    {errors.date ? (
                      <p
                        id="date-err"
                        className="text-xs text-rose-400"
                        role="alert"
                      >
                        {errors.date}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Time</Label>
                    <TimePickerField
                      id="time"
                      value={time}
                      onChange={setTime}
                      aria-invalid={!!errors.time}
                      aria-describedby={
                        errors.time ? "time-err" : undefined
                      }
                    />
                    {errors.time ? (
                      <p
                        id="time-err"
                        className="text-xs text-rose-400"
                        role="alert"
                      >
                        {errors.time}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              {formError ? (
                <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200" role="alert">
                  {formError}
                </p>
              ) : null}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  className="min-h-12 flex-1 rounded-xl text-base font-semibold shadow-lg shadow-primary/20"
                  onClick={() => submit()}
                  disabled={pending}
                >
                  {pending ? "Saving…" : "Save transaction"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-12 rounded-xl border border-white/10"
                  onClick={() => router.push("/transactions")}
                >
                  Cancel
                </Button>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
