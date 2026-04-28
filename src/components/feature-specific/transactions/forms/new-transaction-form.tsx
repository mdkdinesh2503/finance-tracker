"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import type { TransactionType } from "@/lib/db/schema";
import { createTransactionAction, quickEntrySuggestAction } from "@/app/actions/transactions";
import type { CategoryOption } from "../components/category-selector";
import { CategoryCascadeFields, parentIdForLeaf } from "../components/category-cascade-fields";
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
import {
  GIFTS_OCCASIONS_PARENT_NAME,
  SALARY_WAGES_PARENT_NAME,
  giftRecipientRequiredForSubcategory,
} from "@/lib/constants/category-rules";

type BorrowRow = { id: string; name: string };
type LocRow = { id: string; name: string };
type CoRow = { id: string; name: string };

const FALLBACK_SUGGESTED_AMOUNT = "250.00";

type Props = {
  categories: CategoryOption[];
  locations: LocRow[];
  contacts: BorrowRow[];
  companies: CoRow[];
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
    <div className="mb-4 border-b border-white/10 pb-3">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-primary">{step}</p>
      <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink">{title}</h2>
      {hint ? <p className="mt-1 text-xs leading-relaxed text-ink-muted">{hint}</p> : null}
    </div>
  );
}

function StepCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "rounded-2xl border border-white/10 bg-white/3 p-4 shadow-sm sm:p-5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

export function NewTransactionForm({
  categories,
  locations,
  contacts,
  companies,
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
  const [companyId, setCompanyId] = useState("");
  const [quickText, setQuickText] = useState("");
  const [date, setDate] = useState(() => formatLocalYMD(new Date()));
  const [time, setTime] = useState(defaultTime);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fundedByInvestment, setFundedByInvestment] = useState(false);
  const [investmentUsedCategoryId, setInvestmentUsedCategoryId] = useState<string | null>(null);
  const [investmentUsedAmount, setInvestmentUsedAmount] = useState("");
  const showLoanPerson =
    txType === "BORROW" ||
    txType === "REPAYMENT" ||
    txType === "LEND" ||
    txType === "RECEIVE";

  const selectedLeafCat = useMemo(
    () => (categoryId ? categories.find((c) => c.id === categoryId) : undefined),
    [categories, categoryId],
  );

  const parentOfSelected = useMemo(() => {
    if (!selectedLeafCat?.parentId) return undefined;
    return categories.find((c) => c.id === selectedLeafCat.parentId);
  }, [categories, selectedLeafCat]);

  const showSalaryCompany =
    parentOfSelected?.name === SALARY_WAGES_PARENT_NAME && txType === "INCOME";

  const showGiftRecipient =
    parentOfSelected?.name === GIFTS_OCCASIONS_PARENT_NAME &&
    txType === "EXPENSE" &&
    selectedLeafCat != null &&
    giftRecipientRequiredForSubcategory(selectedLeafCat.name);

  const showRechargeContact =
    txType === "EXPENSE" && selectedLeafCat?.name === "Mobile Recharge";

  const showContactBlock = showLoanPerson || showGiftRecipient || showRechargeContact;

  const notesStepLabel = `${4 + (showSalaryCompany ? 1 : 0) + (showContactBlock ? 1 : 0)} · Extra`;

  const investmentLeafOptions = useMemo(() => {
    return categories
      .filter((c) => c.type === "INVESTMENT" && c.isSelectable)
      .map((c) => ({ id: c.id, name: c.name }));
  }, [categories]);

  const locationOptions = useMemo(
    () => locations.map((l) => ({ id: l.id, name: l.name })),
    [locations],
  );

  const contactOptions = useMemo(
    () => contacts.map((b) => ({ id: b.id, name: b.name })),
    [contacts],
  );

  const companyOptions = useMemo(
    () => companies.map((c) => ({ id: c.id, name: c.name })),
    [companies],
  );

  const suggestedCategory = useMemo(() => {
    if (!suggestions.categoryId) return null;
    const leaf = categories.find((c) => c.id === suggestions.categoryId) ?? null;
    if (!leaf) return null;
    const parent = leaf.parentId ? categories.find((c) => c.id === leaf.parentId) : undefined;
    return { leaf, parentName: parent?.name ?? null };
  }, [categories, suggestions.categoryId]);

  const suggestedLocation = useMemo(() => {
    if (!suggestions.locationId) return null;
    return locations.find((l) => l.id === suggestions.locationId) ?? null;
  }, [locations, suggestions.locationId]);

  const suggestedAmountLabel = useMemo(() => {
    if (!suggestions.amount) return null;
    const n = Number(suggestions.amount);
    if (!Number.isFinite(n) || n <= 0) return null;
    return formatCurrency(n);
  }, [suggestions.amount]);

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
    if (txType === "EXPENSE" && fundedByInvestment) {
      if (!investmentUsedCategoryId) next.investmentUsedCategory = "Pick the investment subcategory";
      const u = Number(investmentUsedAmount);
      if (!Number.isFinite(u) || u <= 0) next.investmentUsedAmount = "Enter a valid investment-used amount";
      if (Number.isFinite(u) && Number.isFinite(n) && u > n) next.investmentUsedAmount = "Cannot exceed expense amount";
    }
    if (showContactBlock && !contactId) {
      next.contact = showGiftRecipient
        ? "Pick who the gift is for"
        : showRechargeContact
          ? "Pick who this recharge is for"
          : "Pick a contact";
    }
    if (showSalaryCompany && !companyId) next.company = "Pick an employer (company)";
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
        contactId: showContactBlock ? contactId ?? "" : "",
        companyId: showSalaryCompany ? companyId ?? "" : "",
        transactionDate: date,
        transactionTime: time,
        investmentUsedCategoryId:
          txType === "EXPENSE" && fundedByInvestment
            ? (investmentUsedCategoryId ?? "")
            : "",
        investmentUsedAmount:
          txType === "EXPENSE" && fundedByInvestment ? investmentUsedAmount : "",
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
      setContactId(res.data.contactId ?? "");
      setNote(res.data.note ?? "");
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
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
                disabled={pending || qePending}
                className="h-9 rounded-xl border border-white/10 bg-white/4 px-3 text-xs font-semibold text-ink-muted hover:bg-white/6 hover:text-ink"
              >
                Back
              </Button>
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
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[
                    // Seeded quick-entry rule keywords live in `src/lib/db/ops/seed.ts`
                    "3600 pf",
                    "2000 chit",
                    "1000 rd",
                    "860 recharge",
                  ].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setQuickText(t)}
                      className="rounded-full border border-white/10 bg-white/4 px-2.5 py-1 text-[11px] font-medium text-ink-muted transition-colors hover:bg-white/6 hover:text-ink"
                      title="Tap to fill quick entry"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="relative grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-[1fr_380px] lg:items-start">
          <div className="space-y-10">
            <StepCard>
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
            </StepCard>

            <StepCard>
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
            </StepCard>

            <StepCard>
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
            </StepCard>

            {txType === "EXPENSE" ? (
              <StepCard>
                <SectionLabel
                  step="04 · Funding"
                  title="Funded by investment?"
                  hint="If you spent money by withdrawing from an investment (PF/RD/etc), enable this. It reduces investment totals and won’t block on cash balance."
                />
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">
                        Use investment amount
                      </p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        Optional
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFundedByInvestment((v) => {
                          const next = !v;
                          if (next) {
                            if (!investmentUsedAmount) setInvestmentUsedAmount(amount || "");
                          } else {
                            setInvestmentUsedCategoryId(null);
                            setInvestmentUsedAmount("");
                          }
                          return next;
                        });
                      }}
                      className={`relative h-7 w-12 rounded-full border transition-colors ${
                        fundedByInvestment
                          ? "border-sky-500/30 bg-sky-500/25"
                          : "border-white/10 bg-white/6"
                      }`}
                      aria-pressed={fundedByInvestment}
                      aria-label="Toggle investment funding"
                    >
                      <span
                        className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow transition-[left,background-color] ${
                          fundedByInvestment ? "left-6 bg-sky-200" : "left-1 bg-zinc-200"
                        }`}
                        aria-hidden
                      />
                    </button>
                  </div>

                  {fundedByInvestment ? (
                    <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/3 p-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-ink-muted">
                          From which investment subcategory?
                        </Label>
                        <DropdownSelect
                          id="investmentUsedCategory"
                          value={investmentUsedCategoryId}
                          onChange={(v) => setInvestmentUsedCategoryId(v)}
                          options={investmentLeafOptions}
                          emptyLabel="Select investment (e.g. Partial Fund)"
                          includeEmptyOption
                          aria-invalid={!!errors.investmentUsedCategory}
                        />
                        {errors.investmentUsedCategory ? (
                          <p className="text-xs text-rose-400">
                            {errors.investmentUsedCategory}
                          </p>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-ink-muted">
                          Investment amount used
                        </Label>
                        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/3">
                          <div className="grid grid-cols-[54px_1fr]">
                            <div className="flex items-center justify-center border-r border-white/10 bg-white/5 text-sm font-semibold text-ink">
                              ₹
                            </div>
                            <Input
                              id="investmentUsedAmount"
                              inputMode="decimal"
                              value={investmentUsedAmount}
                              onChange={(e) => setInvestmentUsedAmount(e.target.value)}
                              aria-invalid={!!errors.investmentUsedAmount}
                              className="h-12 rounded-none border-0 bg-transparent px-4 text-base font-semibold tabular-nums tracking-tight focus:ring-0"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        {errors.investmentUsedAmount ? (
                          <p className="text-xs text-rose-400">
                            {errors.investmentUsedAmount}
                          </p>
                        ) : (
                          <p className="text-xs text-ink-muted">
                            Must be ≤ expense amount.
                          </p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </StepCard>
            ) : null}

            {showSalaryCompany ? (
              <StepCard>
                <SectionLabel
                  step="04 · Employer"
                  title="Company"
                  hint="Required for Salary & Wages. Add names under Settings → Employers."
                />
                <div className="mt-4 space-y-2">
                  <DropdownSelect
                    id="company"
                    value={companyId || null}
                    onChange={(v) => setCompanyId(v ?? "")}
                    options={companyOptions}
                    emptyLabel="—"
                    includeEmptyOption={companyOptions.length === 0}
                    aria-invalid={!!errors.company}
                  />
                  {errors.company ? <p className="text-xs text-rose-400">{errors.company}</p> : null}
                </div>
              </StepCard>
            ) : null}

            {showContactBlock ? (
              <StepCard>
                <SectionLabel
                  step={`${4 + (showSalaryCompany ? 1 : 0)} · Person`}
                  title={showGiftRecipient ? "Gift for" : "Contact"}
                  hint={
                    showGiftRecipient
                      ? "Who is this birthday or personal gift for?"
                      : "Required for loan transactions."
                  }
                />
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
              </StepCard>
            ) : null}

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

            <GlassCard variant="signature" noLift hideAccent panelClassName="!p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                {notesStepLabel}
              </p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight text-ink">Notes</h3>
              <p className="mt-1 text-sm text-ink-muted">Optional — visible in your transaction list.</p>
              <div className="mt-4">
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Coffee with team, invoice #…"
                />
              </div>
            </GlassCard>

            <div className="flex items-center gap-3 pt-2">
              <Button type="button" onClick={submit} disabled={pending} className="flex-1">
                {pending ? "Saving…" : "Save transaction"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending || qePending}>
                Cancel
              </Button>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile sticky actions */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#060912]/70 backdrop-blur lg:hidden">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3">
          <Button type="button" onClick={submit} disabled={pending} className="flex-1">
            {pending ? "Saving…" : "Save"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()} disabled={pending || qePending}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

