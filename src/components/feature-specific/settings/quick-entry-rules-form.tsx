"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { SettingsSection } from "./settings-section";
import {
  createRuleAction,
  deleteRuleAction,
  updateRuleAction,
} from "@/app/actions/settings";
import type { CategoryParentWithSubs } from "@/lib/services/transactions";
import type { TransactionType } from "@/lib/db/schema";
import { Textarea } from "@/components/ui/textarea";

const CATEGORY_TYPES_REQUIRING_CONTACT: ReadonlySet<TransactionType> = new Set([
  "BORROW",
  "LEND",
  "RECEIVE",
  "REPAYMENT",
]);

type Option = { id: string; name: string };
type RuleRow = {
  id: string;
  keyword: string;
  note?: string | null;
  categoryId: string | null;
  locationId: string | null;
  contactId: string | null;
};

function normalizeRuleKeyword(raw: string): string {
  // Keyword only: strip all digits/currency/punctuation.
  // Example: "1000 chit" -> "chit"
  const s = raw.replace(/[0-9₹.,]/g, " ");
  return s.replace(/\s+/g, " ").trim();
}

function IconButton({
  label,
  tone = "neutral",
  onClick,
  disabled,
  children,
}: {
  label: string;
  tone?: "neutral" | "danger";
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const base =
    "inline-flex h-10 w-10 items-center justify-center rounded-xl border text-ink-muted transition focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50";
  const cls =
    tone === "danger"
      ? `${base} border-rose-400/20 bg-linear-to-br from-rose-500/12 to-white/4 text-rose-200/85 hover:border-rose-400/35 hover:from-rose-500/18 hover:text-rose-100`
      : `${base} border-white/12 bg-white/4 text-ink-muted hover:border-primary/25 hover:bg-primary/10 hover:text-primary`;
  return (
    <button
      type="button"
      className={cls}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-ink-muted">{children}</div>
  );
}

function RuleChip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-ink-muted">
      <span className="shrink-0 text-primary/90" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 truncate text-ink/90">{children}</span>
    </span>
  );
}

export function QuickEntryRulesForm({
  categoryTree,
  locations,
  contacts,
  rules,
}: {
  categoryTree: CategoryParentWithSubs[];
  locations: Option[];
  contacts: Option[];
  rules: RuleRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const [keyword, setKeyword] = useState("");
  const [note, setNote] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [contactId, setContactId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKeyword, setEditKeyword] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editParentId, setEditParentId] = useState<string | null>(null);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editLocationId, setEditLocationId] = useState<string | null>(null);
  const [editContactId, setEditContactId] = useState<string | null>(null);

  const parentOptions = useMemo(
    () => categoryTree.map((p) => ({ id: p.id, name: p.name })),
    [categoryTree],
  );
  const subOptions = useMemo(() => {
    const p = parentId ? categoryTree.find((x) => x.id === parentId) : null;
    return (p?.children ?? []).map((c) => ({ id: c.id, name: c.name }));
  }, [categoryTree, parentId]);

  const editSubOptions = useMemo(() => {
    const p = editParentId ? categoryTree.find((x) => x.id === editParentId) : null;
    return (p?.children ?? []).map((c) => ({ id: c.id, name: c.name }));
  }, [categoryTree, editParentId]);

  const subToParent = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of categoryTree) for (const c of p.children) m.set(c.id, p.id);
    return m;
  }, [categoryTree]);

  const byCat = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of categoryTree) {
      for (const c of p.children) m.set(c.id, `${p.name} · ${c.name}`);
    }
    return m;
  }, [categoryTree]);
  const subIdToParentType = useMemo(() => {
    const m = new Map<string, TransactionType>();
    for (const p of categoryTree) {
      for (const c of p.children) {
        m.set(c.id, p.type);
      }
    }
    return m;
  }, [categoryTree]);
  const byLoc = useMemo(() => new Map(locations.map((l) => [l.id, l.name])), [locations]);
  const byCon = useMemo(() => new Map(contacts.map((c) => [c.id, c.name])), [contacts]);

  function contactRequiredForSubcategory(subId: string | null): boolean {
    if (!subId) return false;
    const t = subIdToParentType.get(subId);
    return t != null && CATEGORY_TYPES_REQUIRING_CONTACT.has(t);
  }

  const contactRequiredNew = contactRequiredForSubcategory(categoryId);
  const contactRequiredEdit = contactRequiredForSubcategory(editCategoryId);

  function addRule() {
    setErr(null);
    if (!categoryId) {
      setErr("Category is required");
      return;
    }
    if (!locationId) {
      setErr("Location is required");
      return;
    }
    if (contactRequiredNew && !contactId) {
      setErr("Contact is required for Borrow, Lend, Receive, and Repayment categories");
      return;
    }
    startTransition(async () => {
      const res = await createRuleAction({ keyword, note: note || null, categoryId, locationId, contactId });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setKeyword("");
      setNote("");
      setParentId(null);
      setCategoryId(null);
      setLocationId(null);
      setContactId(null);
      router.refresh();
    });
  }

  function startEdit(r: RuleRow) {
    setErr(null);
    setEditingId(r.id);
    setEditKeyword(r.keyword);
    setEditNote(r.note ?? "");
    const pid = r.categoryId ? subToParent.get(r.categoryId) ?? null : null;
    setEditParentId(pid);
    setEditCategoryId(r.categoryId);
    setEditLocationId(r.locationId);
    setEditContactId(r.contactId);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditKeyword("");
    setEditNote("");
    setEditParentId(null);
    setEditCategoryId(null);
    setEditLocationId(null);
    setEditContactId(null);
  }

  function saveEdit() {
    if (!editingId) return;
    setErr(null);
    if (!editCategoryId) {
      setErr("Category is required");
      return;
    }
    if (!editLocationId) {
      setErr("Location is required");
      return;
    }
    if (contactRequiredEdit && !editContactId) {
      setErr("Contact is required for Borrow, Lend, Receive, and Repayment categories");
      return;
    }
    startTransition(async () => {
      const res = await updateRuleAction({
        id: editingId,
        keyword: editKeyword,
        note: editNote || null,
        categoryId: editCategoryId,
        locationId: editLocationId,
        contactId: editContactId,
      });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      cancelEdit();
      router.refresh();
    });
  }

  function del(id: string) {
    setErr(null);
    startTransition(async () => {
      const res = await deleteRuleAction(id);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <SettingsSection
      eyebrow="Quick entry"
      title="Quick-entry rules"
      description=""
      headerGradient="bg-linear-to-br from-sky-500/12 via-transparent to-cyan-500/8"
      icon={
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.65}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      }
    >
      <div className="space-y-8">
        {/* Composer */}
        <div className="relative overflow-hidden rounded-2xl border border-sky-400/18 bg-linear-to-br from-sky-500/6 via-white/4 to-cyan-500/5 p-4 shadow-[0_20px_50px_-28px_rgba(0,0,0,0.85)] ring-1 ring-sky-400/10 sm:p-5">
          <div
            className="pointer-events-none absolute inset-x-6 top-0 h-px bg-linear-to-r from-sky-400/0 via-sky-400/50 to-sky-400/0"
            aria-hidden
          />
          <div className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-sky-500/15 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-24 -left-12 h-44 w-44 rounded-full bg-cyan-500/10 blur-3xl" aria-hidden />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-stretch lg:gap-6">
            <div className="relative flex min-w-0 flex-1 flex-col gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-sky-400/25 bg-sky-500/15 text-xs font-bold text-sky-200">
                  1
                </span>
                <div>
                  <FieldLabel>Trigger keyword</FieldLabel>
                </div>
              </div>
              <Input
                value={keyword}
                onChange={(e) => setKeyword(normalizeRuleKeyword(e.target.value))}
                placeholder='e.g. chit — or "2000 chit"'
                className="font-mono text-[15px] tracking-wide"
              />
              <p className="text-xs leading-relaxed text-ink-muted">
                We strip numbers and currency symbols — only the <span className="font-medium text-ink/80">keyword</span> is stored.
              </p>
              <div className="mt-auto space-y-2 border-t border-white/10 pt-4">
                <FieldLabel>Note (optional)</FieldLabel>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Applied to the transaction note when this rule matches"
                  className="min-h-18 resize-y"
                />
              </div>
            </div>

            <div className="relative flex min-w-0 flex-1 flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-primary/25 bg-primary/12 text-xs font-bold text-primary">
                  2
                </span>
                <div>
                  <FieldLabel>Apply when matched</FieldLabel>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <FieldLabel>Category group</FieldLabel>
                  <DropdownSelect
                    value={parentId}
                    onChange={(v) => {
                      setParentId(v);
                      setCategoryId(null);
                    }}
                    options={parentOptions}
                    emptyLabel="Select group"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Subcategory</FieldLabel>
                  <DropdownSelect
                    value={categoryId}
                    onChange={setCategoryId}
                    options={subOptions}
                    emptyLabel={parentId ? "Select subcategory" : "Select a group first"}
                    disabled={!parentId}
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Location</FieldLabel>
                  <DropdownSelect
                    value={locationId}
                    onChange={setLocationId}
                    options={locations}
                    emptyLabel="Select location"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>
                    Contact{" "}
                    {contactRequiredNew ? (
                      <span className="text-rose-400/90 normal-case tracking-normal">(required)</span>
                    ) : (
                      <span className="font-normal normal-case tracking-normal text-ink-muted">(optional)</span>
                    )}
                  </FieldLabel>
                  <DropdownSelect value={contactId} onChange={setContactId} options={contacts} emptyLabel="—" />
                </div>
              </div>

              <div className="mt-auto flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-ink-muted">
                  <span className="font-semibold text-ink/90">{rules.length}</span> rule{rules.length === 1 ? "" : "s"} saved
                </p>
                <Button
                  type="button"
                  variant="primary"
                  onClick={addRule}
                  disabled={
                    pending ||
                    keyword.trim().length === 0 ||
                    !categoryId ||
                    !locationId ||
                    (contactRequiredNew && !contactId)
                  }
                  className="w-full shrink-0 sm:w-auto"
                >
                  {pending ? "Adding…" : "Add rule"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Rule deck */}
        <div>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <FieldLabel>Your rules</FieldLabel>
              <p className="mt-1 text-sm font-semibold text-ink">Live shortcuts for quick entry</p>
            </div>
            {rules.length > 0 ? (
              <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs font-semibold text-ink-muted">
                {rules.length} active
              </span>
            ) : null}
          </div>

          {rules.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/2 px-6 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-500/10 text-sky-200/90">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="mt-4 text-sm font-semibold text-ink">No rules yet</p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-ink-muted">
                Build your first rule in the composer above — keywords become one-tap context when you add transactions.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {rules.map((r) => {
                const cat = r.categoryId ? byCat.get(r.categoryId) : null;
                const loc = r.locationId ? byLoc.get(r.locationId) : null;
                const con = r.contactId ? byCon.get(r.contactId) : null;
                return (
                  <li
                    key={r.id}
                    className={`relative overflow-hidden rounded-2xl border shadow-[0_16px_44px_-30px_rgba(0,0,0,0.9)] ${
                      editingId === r.id
                        ? "border-primary/30 bg-primary/6 ring-1 ring-primary/15"
                        : "border-white/10 bg-white/3 ring-1 ring-white/5"
                    }`}
                  >
                    <div
                      className={`absolute inset-y-3 left-0 w-1 rounded-r-full ${
                        editingId === r.id ? "bg-primary/70" : "bg-linear-to-b from-sky-400/80 to-cyan-500/50"
                      }`}
                      aria-hidden
                    />
                    {editingId === r.id ? (
                      <div className="relative flex flex-col gap-4 p-4 pl-5 sm:p-5">
                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="space-y-3">
                            <FieldLabel>Keyword</FieldLabel>
                            <Input
                              value={editKeyword}
                              onChange={(e) => setEditKeyword(normalizeRuleKeyword(e.target.value))}
                              placeholder="keyword"
                              className="font-mono"
                            />
                            <FieldLabel>Note</FieldLabel>
                            <Textarea
                              value={editNote}
                              onChange={(e) => setEditNote(e.target.value)}
                              placeholder="Optional"
                              className="min-h-20"
                            />
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <FieldLabel>Group</FieldLabel>
                              <DropdownSelect
                                value={editParentId}
                                onChange={(v) => {
                                  setEditParentId(v);
                                  setEditCategoryId(null);
                                }}
                                options={parentOptions}
                                emptyLabel="Select"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <FieldLabel>Subcategory</FieldLabel>
                              <DropdownSelect
                                value={editCategoryId}
                                onChange={setEditCategoryId}
                                options={editSubOptions}
                                emptyLabel={editParentId ? "Select" : "Pick group"}
                                disabled={!editParentId}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <FieldLabel>Location</FieldLabel>
                              <DropdownSelect
                                value={editLocationId}
                                onChange={setEditLocationId}
                                options={locations}
                                emptyLabel="Select"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <FieldLabel>
                                Contact{" "}
                                {contactRequiredEdit ? (
                                  <span className="text-rose-400/90 normal-case tracking-normal">(required)</span>
                                ) : null}
                              </FieldLabel>
                              <DropdownSelect
                                value={editContactId}
                                onChange={setEditContactId}
                                options={contacts}
                                emptyLabel="—"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
                          <Button
                            type="button"
                            onClick={saveEdit}
                            disabled={pending || (contactRequiredEdit && !editContactId)}
                          >
                            Save changes
                          </Button>
                          <Button type="button" variant="ghost" onClick={cancelEdit} disabled={pending}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative flex flex-col gap-3 p-4 pl-5 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
                        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl bg-linear-to-br from-white/6 via-transparent to-cyan-500/5 opacity-60" aria-hidden />
                        <div className="relative min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <span className="font-mono text-lg font-bold tracking-tight text-ink">“{r.keyword}”</span>
                            {r.note ? (
                              <span className="max-w-full truncate text-xs italic text-ink-muted">— {r.note}</span>
                            ) : null}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <RuleChip
                              icon={
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h8" />
                                </svg>
                              }
                            >
                              {cat ?? "No category"}
                            </RuleChip>
                            <RuleChip
                              icon={
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                  />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              }
                            >
                              {loc ?? "No location"}
                            </RuleChip>
                            <RuleChip
                              icon={
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                  />
                                </svg>
                              }
                            >
                              {con ?? "No contact"}
                            </RuleChip>
                          </div>
                        </div>
                        <div className="relative flex shrink-0 items-center gap-2">
                          <IconButton label="Edit rule" onClick={() => startEdit(r)} disabled={pending}>
                            <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.85}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M16.5 3.5a2.1 2.1 0 013 3L8 18l-4 1 1-4 11.5-11.5z"
                              />
                            </svg>
                          </IconButton>
                          <IconButton label="Delete rule" tone="danger" onClick={() => del(r.id)} disabled={pending}>
                            <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.85}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 11v7" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14 11v7" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 7V5h6v2" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 7l1 14h10l1-14" />
                            </svg>
                          </IconButton>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {err ? (
          <div
            className="rounded-xl border border-rose-500/25 bg-rose-500/8 px-4 py-3 text-sm text-rose-200"
            role="alert"
          >
            {err}
          </div>
        ) : null}
      </div>
    </SettingsSection>
  );
}

