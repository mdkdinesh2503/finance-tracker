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
import { EntityTag } from "./entity-tag";
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
      const res = await updateCategoryAction(editing.id, editing.name);
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
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
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
            <div className="flex items-end gap-2">
              <DropdownSelect
                value={newParentType}
                onChange={(v) => setNewParentType(v as TransactionType)}
                options={PARENT_TYPES.map((t) => ({ id: t, name: typeLabel(t) }))}
                emptyLabel="Select type"
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
            <p className="py-10 text-center text-sm text-zinc-500">No categories yet.</p>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[1fr_1.35fr]">
              <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-ink-muted">
                  Parent categories
                </p>
                <p className="mt-1 text-xs text-ink-muted">Pick a parent to view its subcategories.</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {tree.map((p) => {
                    const selected = p.id === (selectedParent?.id ?? "");
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedParentId(p.id);
                          setNewSubParentId(p.id);
                        }}
                        className={`max-w-full rounded-full border px-3 py-1 text-left text-xs font-semibold transition ${
                          selected
                            ? "border-primary/35 bg-primary/12 text-ink"
                            : "border-white/10 bg-white/4 text-ink-muted hover:border-white/16 hover:bg-white/6 hover:text-ink"
                        }`}
                        title={`${p.name} · ${typeLabel(p.type)}`}
                      >
                        <span className="truncate">{p.name}</span>
                        <span className="ml-1 text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">
                          {typeLabel(p.type)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 border-t border-white/10 pt-4">
                  {selectedParent ? (
                    editing?.id === selectedParent.id ? (
                      <div className="flex flex-wrap items-end gap-2">
                        <div className="min-w-[min(16rem,80vw)] flex-1 space-y-1">
                          <Label>Parent name</Label>
                          <Input
                            value={editing.name}
                            onChange={(e) =>
                              setEditing((s) => (s ? { ...s, name: e.target.value } : s))
                            }
                            autoFocus
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Type</Label>
                          <DropdownSelect
                            value={editing.type ?? selectedParent.type}
                            onChange={(v) =>
                              setEditing((s) => (s ? { ...s, type: v as TransactionType } : s))
                            }
                            options={PARENT_TYPES.map((t) => ({ id: t, name: typeLabel(t) }))}
                            emptyLabel="Select type"
                          />
                        </div>
                        <Button type="button" onClick={saveEdit} disabled={pending}>
                          Save
                        </Button>
                        <Button type="button" variant="ghost" onClick={cancelEdit} disabled={pending}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <EntityTag
                        name={`${selectedParent.name} · ${typeLabel(selectedParent.type)}`}
                        accent="violet"
                        onEdit={() => startEditParent(selectedParent)}
                        onDeleteClick={() =>
                          setDeleteTarget({
                            id: selectedParent.id,
                            name: selectedParent.name,
                            usage: selectedParent.txAsParentCount ?? 0,
                            kind: "parent",
                          })
                        }
                        deleteDisabled={(selectedParent.txAsParentCount ?? 0) > 0}
                        deleteDisabledTitle="Remove transactions using this category first"
                      />
                    )
                  ) : null}
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
                      onChange={(v) => setNewSubParentId(String(v))}
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
                      <p className="text-xs text-ink-muted">
                        Showing subcategories for{" "}
                        <span className="font-medium text-ink">{selectedParent.name}</span>
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(selectedParent.children ?? []).length === 0 ? (
                          <p className="py-6 text-sm text-ink-muted">No subcategories yet.</p>
                        ) : (
                          (selectedParent.children ?? []).map((s: CategorySubWithUsage) => (
                            <Fragment key={s.id}>
                              {editing?.id === s.id ? (
                                <div className="flex flex-wrap items-center gap-2">
                                  <Input
                                    value={editing.name}
                                    onChange={(e) =>
                                      setEditing((st) => (st ? { ...st, name: e.target.value } : st))
                                    }
                                    className="w-[min(18rem,70vw)]"
                                    autoFocus
                                  />
                                  <Button type="button" onClick={saveEdit} disabled={pending}>
                                    Save
                                  </Button>
                                  <Button type="button" variant="ghost" onClick={cancelEdit} disabled={pending}>
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <EntityTag
                                  name={s.name}
                                  badge={s.txCount ? `${s.txCount} tx` : undefined}
                                  accent="violet"
                                  onEdit={() => startEditSub(s)}
                                  onDeleteClick={() =>
                                    setDeleteTarget({
                                      id: s.id,
                                      name: s.name,
                                      usage: s.txCount ?? 0,
                                      kind: "sub",
                                    })
                                  }
                                  deleteDisabled={(s.txCount ?? 0) > 0}
                                  deleteDisabledTitle="Remove transactions using this subcategory first"
                                />
                              )}
                            </Fragment>
                          ))
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

