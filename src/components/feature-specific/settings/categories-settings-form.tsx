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

  const [newSubName, setNewSubName] = useState<Record<string, string>>({});

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
      const name = newSubName[parentId] ?? "";
      const res = await createCategorySubAction(parentId, name);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setNewSubName((s) => ({ ...s, [parentId]: "" }));
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

          <div className="space-y-6">
            {tree.length === 0 ? (
              <p className="py-10 text-center text-sm text-zinc-500">No categories yet.</p>
            ) : (
              tree.map((p) => (
                <div key={p.id} className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {editing?.id === p.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          value={editing.name}
                          onChange={(e) =>
                            setEditing((s) => (s ? { ...s, name: e.target.value } : s))
                          }
                          className="w-[min(20rem,70vw)]"
                          autoFocus
                        />
                        <DropdownSelect
                          value={editing.type ?? p.type}
                          onChange={(v) =>
                            setEditing((s) =>
                              s ? { ...s, type: v as TransactionType } : s,
                            )
                          }
                          options={PARENT_TYPES.map((t) => ({ id: t, name: typeLabel(t) }))}
                          emptyLabel="Select type"
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
                        name={`${p.name} · ${typeLabel(p.type)}`}
                        accent="violet"
                        onEdit={() => startEditParent(p)}
                        onDeleteClick={() =>
                          setDeleteTarget({
                            id: p.id,
                            name: p.name,
                                  usage: p.txAsParentCount ?? 0,
                            kind: "parent",
                          })
                        }
                              deleteDisabled={(p.txAsParentCount ?? 0) > 0}
                        deleteDisabledTitle="Remove transactions using this category first"
                      />
                    )}
                  </div>

                  <div className="ml-2 space-y-2">
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                      <div className="space-y-0">
                        <Label htmlFor={`new-sub-${p.id}`}>New subcategory</Label>
                        <Input
                          id={`new-sub-${p.id}`}
                          value={newSubName[p.id] ?? ""}
                          onChange={(e) =>
                            setNewSubName((s) => ({ ...s, [p.id]: e.target.value }))
                          }
                          placeholder="e.g. Rent"
                          autoComplete="off"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={() => addSub(p.id)}
                        disabled={pending || (newSubName[p.id] ?? "").trim().length === 0}
                      >
                        Add sub
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(p.children ?? []).map((s: CategorySubWithUsage) => (
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
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
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

