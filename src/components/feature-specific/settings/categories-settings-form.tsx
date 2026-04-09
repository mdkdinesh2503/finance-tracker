"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createCategoryParentAction,
  createCategorySubAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/app/actions/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { SettingsSection } from "./settings-section";
import type { TransactionType } from "@/lib/db/schema";
import type {
  CategoryParentWithSubs,
  CategorySubWithUsage,
} from "@/lib/services/transactions";

// NOTE: This file is copied from the existing implementation and only adjusted
// for the new component locations/import paths.

const PARENT_TYPES: TransactionType[] = [
  "EXPENSE",
  "INCOME",
  "INVESTMENT",
  "BORROW",
  "REPAYMENT",
  "LEND",
  "RECEIVE",
];

function typeLabel(t: TransactionType): string {
  switch (t) {
    case "EXPENSE":
      return "Expense";
    case "INCOME":
      return "Income";
    case "BORROW":
      return "Borrow";
    case "REPAYMENT":
      return "Repay";
    case "INVESTMENT":
      return "Invest";
    case "LEND":
      return "Lend";
    case "RECEIVE":
      return "Receive";
    default:
      return t;
  }
}

export function CategoriesSettingsForm({ tree }: { tree: CategoryParentWithSubs[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [err, setErr] = useState<string | null>(null);

  const [newParentName, setNewParentName] = useState("");
  const [newParentType, setNewParentType] = useState<TransactionType>("EXPENSE");

  const [selectedParentId, setSelectedParentId] = useState<string>(() => tree[0]?.id ?? "");
  const [newSubParentId, setNewSubParentId] = useState<string>(() => tree[0]?.id ?? "");
  const [newSubName, setNewSubName] = useState("");

  const [editing, setEditing] = useState<{
    id: string;
    name: string;
    type?: TransactionType;
    parentId?: string | null;
  } | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
    usage: number;
    kind: "parent" | "sub";
  } | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  function addParent() {
    setErr(null);
    startTransition(async () => {
      const res = await createCategoryParentAction(newParentName, newParentType);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setNewParentName("");
      setNewParentType("EXPENSE");
      router.refresh();
    });
  }

  function addSub(parentId: string) {
    setErr(null);
    startTransition(async () => {
      const res = await createCategorySubAction(parentId, newSubName);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setNewSubName("");
      router.refresh();
    });
  }

  function startEditParent(p: { id: string; name: string; type: TransactionType }) {
    setEditing({ id: p.id, name: p.name, type: p.type });
  }

  function startEditSub(s: { id: string; name: string; parentId?: string | null }) {
    setEditing({ id: s.id, name: s.name, parentId: s.parentId ?? null });
  }

  function cancelEdit() {
    setEditing(null);
  }

  function saveEdit() {
    if (!editing) return;
    setErr(null);
    startTransition(async () => {
      const res = await updateCategoryAction(editing.id, editing.name, editing.type);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setEditing(null);
      router.refresh();
    });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeletePending(true);
    setErr(null);
    const res = await deleteCategoryAction(deleteTarget.id);
    setDeletePending(false);
    if (res.ok) {
      setDeleteTarget(null);
      router.refresh();
    } else {
      setErr(res.error);
      setDeleteTarget(null);
    }
  }

  const selectedParent = tree.find((p) => p.id === selectedParentId) ?? tree[0] ?? null;
  const selectedParentHasChildren = (selectedParent?.children?.length ?? 0) > 0;
  const selectedParentHasUsedChild = (selectedParent?.children ?? []).some((c) => (c.txCount ?? 0) > 0);
  const selectedParentUsed = (selectedParent?.txAsParentCount ?? 0) > 0;

  return (
    <>
      <SettingsSection
        eyebrow="Reference data"
        title="Categories"
        description="Parents are transaction types. Subcategories are selectable and appear in Transactions."
        headerGradient="bg-linear-to-br from-violet-500/10 via-transparent to-transparent"
        icon={
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        }
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-ink-muted">Create</p>
            <p className="mt-1 text-xs text-ink-muted">Add a parent first, then add subcategories under it.</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_14rem_auto] sm:items-end">
              <div className="space-y-0">
                <Label htmlFor="new-parent-name">New parent category</Label>
                <Input
                  id="new-parent-name"
                  value={newParentName}
                  onChange={(e) => setNewParentName(e.target.value)}
                  placeholder="e.g. Housing"
                  autoComplete="off"
                />
              </div>
              <DropdownSelect
                value={newParentType}
                onChange={(v) => setNewParentType(v as TransactionType)}
                options={PARENT_TYPES.map((t) => ({ id: t, name: typeLabel(t) }))}
                emptyLabel=""
                includeEmptyOption={false}
                className="w-full"
              />
              <Button type="button" onClick={addParent} disabled={pending || newParentName.trim().length === 0}>
                Add
              </Button>
            </div>
          </div>

          {err ? (
            <p className="text-sm text-rose-400" role="alert">
              {err}
            </p>
          ) : null}

          {tree.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/3 p-8 text-center">
              <p className="text-sm font-semibold text-ink">No categories yet</p>
              <p className="mt-1 text-xs text-ink-muted">Create your first parent category to get started.</p>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[1fr_1.35fr]">
              <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-ink-muted">
                  Parent categories
                </p>
                <p className="mt-1 text-xs text-ink-muted">Pick a parent to view its subcategories.</p>

                <div className="mt-4">
                  {selectedParent ? (
                    editing?.id === selectedParent.id ? (
                      <div
                        className={`rounded-2xl border p-3 ring-1 ${
                          selectedParentUsed || selectedParentHasUsedChild
                            ? "border-violet-400/20 bg-violet-500/6 ring-violet-400/12"
                            : "border-primary/20 bg-primary/8 ring-primary/15"
                        }`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border bg-linear-to-br text-sm font-extrabold shadow-[0_10px_26px_-18px_rgba(0,0,0,0.95)] ${
                                selectedParentUsed || selectedParentHasUsedChild
                                  ? "border-violet-400/20 from-violet-500/18 to-white/6 text-violet-100"
                                  : "border-primary/25 from-primary/18 to-white/6 text-primary/90"
                              }`}
                            >
                              {(editing.name.trim()[0] ?? "?").toUpperCase()}
                            </div>
                          </div>

                          <div className="min-w-0 flex-1 sm:pl-2">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="relative min-w-0 flex-1">
                                  <div className="flex h-10 items-center rounded-xl border border-white/0 px-3">
                                    <span className="select-none text-sm font-semibold text-ink/0">.</span>
                                  </div>
                                  <div className="absolute inset-0">
                                    <Input
                                      value={editing.name}
                                      onChange={(e) =>
                                        setEditing((s) => (s ? { ...s, name: e.target.value } : s))
                                      }
                                      autoFocus
                                      className={`h-10 ${
                                        selectedParentUsed || selectedParentHasUsedChild
                                          ? "border-violet-400/30 focus:border-violet-400/55 focus:ring-violet-400/20"
                                          : "border-primary/30 focus:border-primary/55 focus:ring-primary/20"
                                      }`}
                                      aria-label="Parent name"
                                    />
                                  </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={saveEdit}
                                    disabled={pending || editing.name.trim().length === 0}
                                    title="Save"
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/14 text-primary/90 shadow-[0_10px_26px_-18px_rgba(0,0,0,0.95)] transition hover:border-primary/45 hover:bg-primary/18 hover:text-primary disabled:opacity-50"
                                  >
                                    <svg
                                      className="h-[18px] w-[18px]"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth={2.0}
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelEdit}
                                    disabled={pending}
                                    title="Cancel"
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-ink-muted transition hover:border-white/14 hover:bg-white/8 hover:text-ink disabled:opacity-50"
                                  >
                                    <svg
                                      className="h-[18px] w-[18px]"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth={2.0}
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18" />
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              </div>

                              <DropdownSelect
                                value={editing.type ?? selectedParent.type}
                                onChange={(v) =>
                                  setEditing((s) => (s ? { ...s, type: v as TransactionType } : s))
                                }
                                options={PARENT_TYPES.map((t) => ({ id: t, name: typeLabel(t) }))}
                                emptyLabel=""
                                includeEmptyOption={false}
                                disabled={selectedParentUsed || selectedParentHasUsedChild}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`flex items-center justify-between gap-3 rounded-2xl border p-3 ring-1 ${
                          selectedParentUsed || selectedParentHasUsedChild
                            ? "border-violet-400/20 bg-violet-500/6 ring-violet-400/12"
                            : "border-primary/35 bg-primary/12 ring-primary/20"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">{selectedParent.name}</p>
                          <p className="mt-0.5 truncate text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted/90">
                            {typeLabel(selectedParent.type)}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEditParent(selectedParent)}
                            disabled={pending}
                            title="Edit"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/18 bg-linear-to-br from-primary/16 to-white/4 text-primary/85 shadow-[0_10px_26px_-18px_rgba(0,0,0,0.95)] transition hover:border-primary/28 hover:from-primary/22 hover:text-primary disabled:opacity-50"
                          >
                            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5a2.1 2.1 0 013 3L8 18l-4 1 1-4 11.5-11.5z" />
                            </svg>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({
                                id: selectedParent.id,
                                name: selectedParent.name,
                                usage: selectedParent.txAsParentCount ?? 0,
                                kind: "parent",
                              })
                            }
                            disabled={pending || selectedParentUsed || selectedParentHasChildren || selectedParentHasUsedChild}
                            title={
                              selectedParentHasChildren
                                ? "Remove subcategories before deleting this group"
                                : selectedParentHasUsedChild
                                  ? "Remove transactions using subcategories first"
                                  : selectedParentUsed
                                  ? "Remove transactions using this category first"
                                  : "Delete"
                            }
                            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-linear-to-br shadow-[0_10px_26px_-18px_rgba(0,0,0,0.95)] transition ${
                              selectedParentHasChildren || selectedParentUsed || selectedParentHasUsedChild
                                ? "border-violet-400/18 from-violet-500/10 to-white/4 text-violet-200/70 opacity-80"
                                : "border-rose-400/18 from-rose-500/12 to-white/4 text-rose-200/80 hover:border-rose-400/28 hover:from-rose-500/18 hover:text-rose-200"
                            } disabled:opacity-50`}
                          >
                            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 11v7" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14 11v7" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 7V5h6v2" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 7l1 14h10l1-14" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )
                  ) : null}
                </div>

                <div className="mt-4 grid gap-2">
                  {[...tree]
                    .sort((a, b) => {
                      const aUsed = (a.txAsParentCount ?? 0) > 0;
                      const bUsed = (b.txAsParentCount ?? 0) > 0;
                      if (aUsed !== bUsed) return aUsed ? -1 : 1;
                      return a.name.localeCompare(b.name);
                    })
                    .map((p) => {
                      const selected = p.id === (selectedParent?.id ?? "");
                      const used = (p.txAsParentCount ?? 0) > 0;
                      const badge = used ? `${p.txAsParentCount} tx` : null;

                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedParentId(p.id);
                            setNewSubParentId(p.id);
                          }}
                          className={`group relative flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left shadow-[0_14px_44px_-28px_rgba(0,0,0,0.9)] transition ${
                            selected
                              ? "border-primary/35 bg-primary/12 ring-1 ring-primary/20"
                              : used
                                ? "border-violet-400/20 bg-violet-500/5 ring-1 ring-violet-400/10 hover:border-violet-400/28"
                                : "border-white/10 bg-white/2 hover:border-white/14 hover:bg-white/3"
                          }`}
                          title={`${p.name} · ${typeLabel(p.type)}`}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-semibold text-ink">{p.name}</p>
                            <p className="mt-0.5 truncate text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted/90">
                              {typeLabel(p.type)}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            {badge ? (
                              <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
                                {badge}
                              </span>
                            ) : null}
                            {selected ? (
                              <span className="rounded-lg border border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary/90">
                                Selected
                              </span>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-ink-muted">
                  Subcategories
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  Create subcategories under a parent, then use them in Transactions.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-[220px_1fr_auto] sm:items-end">
                  <div className="space-y-1">
                    <Label>Parent</Label>
                    <DropdownSelect
                      value={newSubParentId}
                      onChange={(v) => {
                        const id = String(v);
                        setNewSubParentId(id);
                        setSelectedParentId(id);
                      }}
                      options={tree.map((p) => ({ id: p.id, name: `${p.name} · ${typeLabel(p.type)}` }))}
                      emptyLabel="Select parent"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-sub-name">Subcategory name</Label>
                    <Input
                      id="new-sub-name"
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      placeholder="e.g. Rent"
                      autoComplete="off"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={() => addSub(newSubParentId)}
                    disabled={pending || newSubParentId.trim().length === 0 || newSubName.trim().length === 0}
                  >
                    Add
                  </Button>
                </div>

                <div className="mt-5 border-t border-white/10 pt-4">
                  {selectedParent ? (
                    <>
                      <div>
                        {(selectedParent.children ?? []).length === 0 ? (
                          <p className="py-6 text-sm text-ink-muted">No subcategories yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {[...(selectedParent.children ?? [])]
                              .sort((a, b) => {
                                const aUsed = (a.txCount ?? 0) > 0;
                                const bUsed = (b.txCount ?? 0) > 0;
                                if (aUsed !== bUsed) return aUsed ? -1 : 1;
                                return a.name.localeCompare(b.name);
                              })
                              .map((s: CategorySubWithUsage) => {
                                const isEditing = editing?.id === s.id;
                                const used = (s.txCount ?? 0) > 0;
                                const badge = used ? `${s.txCount} tx` : null;
                                const initial = (s.name.trim()[0] ?? "?").toUpperCase();

                                return (
                                  <div
                                    key={s.id}
                                    className={`group relative overflow-visible rounded-2xl border p-3 shadow-[0_14px_44px_-28px_rgba(0,0,0,0.9)] ${
                                      used
                                        ? "border-violet-400/20 bg-violet-500/5 ring-1 ring-violet-400/10"
                                        : "border-white/10 bg-white/2 hover:border-white/14"
                                    }`}
                                  >
                                    <div
                                      className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl bg-linear-to-br from-white/8 via-white/3 to-transparent"
                                      aria-hidden
                                    >
                                      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-violet-500/10 blur-2xl" />
                                      <div className="absolute -left-10 -bottom-10 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />
                                      {used ? (
                                        <div className="absolute -left-12 top-2 h-24 w-24 rounded-full bg-violet-500/12 blur-2xl" />
                                      ) : null}
                                    </div>

                                    <div className="relative flex items-center gap-3">
                                      <div
                                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border bg-linear-to-br text-sm font-extrabold shadow-[0_10px_26px_-18px_rgba(0,0,0,0.95)] ${
                                          used
                                            ? "border-violet-400/20 from-violet-500/18 to-white/6 text-violet-100"
                                            : "border-white/12 from-white/16 to-white/6 text-ink"
                                        }`}
                                      >
                                        {initial}
                                      </div>

                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                          <div className="relative min-w-0 flex-1">
                                            <div className="flex h-10 items-center rounded-xl border border-white/0 px-3">
                                              {!isEditing ? (
                                                <div className="flex min-w-0 items-center gap-2">
                                                  <p
                                                    className={`block min-w-0 truncate whitespace-nowrap text-[15px] font-semibold leading-5 ${
                                                      used ? "text-ink/90" : "text-ink"
                                                    }`}
                                                  >
                                                    {s.name}
                                                  </p>
                                                  {badge ? (
                                                    <span className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
                                                      {badge}
                                                    </span>
                                                  ) : null}
                                                </div>
                                              ) : null}
                                            </div>

                                            {isEditing ? (
                                              <div className="absolute inset-0">
                                                <Input
                                                  value={editing.name}
                                                  onChange={(e) =>
                                                    setEditing((st) => (st ? { ...st, name: e.target.value } : st))
                                                  }
                                                  autoFocus
                                                  className="h-10"
                                                />
                                              </div>
                                            ) : null}
                                          </div>

                                          {isEditing ? (
                                            <>
                                              <button
                                                type="button"
                                                onClick={saveEdit}
                                                disabled={pending || editing.name.trim().length === 0}
                                                title="Save"
                                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/14 text-primary/90 shadow-[0_10px_26px_-18px_rgba(0,0,0,0.95)] transition hover:border-primary/45 hover:bg-primary/18 hover:text-primary disabled:opacity-50"
                                              >
                                                <svg
                                                  className="h-[18px] w-[18px]"
                                                  viewBox="0 0 24 24"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  strokeWidth={2.0}
                                                >
                                                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
                                                </svg>
                                              </button>
                                              <button
                                                type="button"
                                                onClick={cancelEdit}
                                                disabled={pending}
                                                title="Cancel"
                                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-ink-muted transition hover:border-white/14 hover:bg-white/8 hover:text-ink disabled:opacity-50"
                                              >
                                                <svg
                                                  className="h-[18px] w-[18px]"
                                                  viewBox="0 0 24 24"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  strokeWidth={2.0}
                                                >
                                                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18" />
                                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12" />
                                                </svg>
                                              </button>
                                            </>
                                          ) : (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => startEditSub(s)}
                                                disabled={pending}
                                                title="Edit"
                                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/18 bg-linear-to-br from-primary/16 to-white/4 text-primary/85 shadow-[0_10px_26px_-18px_rgba(0,0,0,0.95)] transition hover:border-primary/28 hover:from-primary/22 hover:text-primary disabled:opacity-50"
                                              >
                                                <svg
                                                  className="h-[18px] w-[18px]"
                                                  viewBox="0 0 24 24"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  strokeWidth={1.9}
                                                >
                                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
                                                  <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M16.5 3.5a2.1 2.1 0 013 3L8 18l-4 1 1-4 11.5-11.5z"
                                                  />
                                                </svg>
                                              </button>

                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setDeleteTarget({
                                                    id: s.id,
                                                    name: s.name,
                                                    usage: s.txCount ?? 0,
                                                    kind: "sub",
                                                  })
                                                }
                                                disabled={pending || used}
                                                title={used ? "Remove transactions using this subcategory first" : "Delete"}
                                                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-linear-to-br shadow-[0_10px_26px_-18px_rgba(0,0,0,0.95)] transition ${
                                                  used
                                                    ? "border-violet-400/18 from-violet-500/10 to-white/4 text-violet-200/70 opacity-80"
                                                    : "border-rose-400/18 from-rose-500/12 to-white/4 text-rose-200/80 hover:border-rose-400/28 hover:from-rose-500/18 hover:text-rose-200"
                                                } disabled:opacity-50`}
                                              >
                                                <svg
                                                  className="h-[18px] w-[18px]"
                                                  viewBox="0 0 24 24"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  strokeWidth={1.9}
                                                >
                                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16" />
                                                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 11v7" />
                                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 11v7" />
                                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 7V5h6v2" />
                                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 7l1 14h10l1-14" />
                                                </svg>
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="py-8 text-center text-sm text-ink-muted">Select a parent to view subcategories.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </SettingsSection>

      <ConfirmDialog
        open={deleteTarget != null}
        title={deleteTarget?.kind === "parent" ? "Remove parent category?" : "Remove subcategory?"}
        description={
          deleteTarget
            ? `This will delete “${deleteTarget.name}”. You can only remove categories not referenced by transactions.`
            : ""
        }
        pending={deletePending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}

