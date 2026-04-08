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
import { ConfirmDialog } from "@/components/settings/confirm-dialog";
import { EntityTag } from "@/components/settings/entity-tag";
import { SettingsSection } from "@/components/settings/settings-section";
import type { TransactionType } from "@/lib/db/schema";
import type {
  CategoryParentWithSubs,
  CategorySubWithUsage,
} from "@/features/transactions/services";

const PARENT_TYPES: TransactionType[] = [
  "EXPENSE",
  "INCOME",
  "BORROW",
  "REPAYMENT",
  "LEND",
  "RECEIVE",
  "INVESTMENT",
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
      return "Repayment";
    case "LEND":
      return "Lend";
    case "RECEIVE":
      return "Receive";
    case "INVESTMENT":
      return "Investment";
    default:
      return t;
  }
}

type SubWithParent = CategorySubWithUsage & {
  parentId: string;
  parentName: string;
};

function flattenSubs(tree: CategoryParentWithSubs[]): SubWithParent[] {
  const out: SubWithParent[] = [];
  for (const p of tree) {
    for (const c of p.children) {
      out.push({
        ...c,
        parentId: p.id,
        parentName: p.name,
      });
    }
  }
  return out;
}

const parentIcon = (
  <svg
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75A2.25 2.25 0 0115.75 13.5H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25zM13.5 6.75a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25v-2.25z"
    />
  </svg>
);

const subIcon = (
  <svg
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 6h.008v.008H6V6z"
    />
  </svg>
);

export function CategoriesSettingsForm({
  tree,
}: {
  tree: CategoryParentWithSubs[];
}) {
  const router = useRouter();
  const [parentFormErr, setParentFormErr] = useState<string | null>(null);
  const [subFormErr, setSubFormErr] = useState<string | null>(null);
  const [listErr, setListErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [parentName, setParentName] = useState("");
  const [parentType, setParentType] = useState<TransactionType>("EXPENSE");
  const [subParentId, setSubParentId] = useState("");
  const [subName, setSubName] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const hasParents = tree.length > 0;
  const flatSubs = flattenSubs(tree);

  function addParent() {
    setParentFormErr(null);
    setListErr(null);
    startTransition(async () => {
      const res = await createCategoryParentAction(parentName, parentType);
      if (res.ok) {
        setParentName("");
        router.refresh();
      } else {
        setParentFormErr(res.error);
      }
    });
  }

  function addSub() {
    setSubFormErr(null);
    setListErr(null);
    if (!subParentId) {
      setSubFormErr("Choose a parent group first");
      return;
    }
    startTransition(async () => {
      const res = await createCategorySubAction(subParentId, subName);
      if (res.ok) {
        setSubName("");
        router.refresh();
      } else {
        setSubFormErr(res.error);
      }
    });
  }

  function saveEdit() {
    if (!editingId) return;
    setListErr(null);
    startTransition(async () => {
      const res = await updateCategoryAction(editingId, editName);
      if (res.ok) {
        setEditingId(null);
        setEditName("");
        router.refresh();
      } else {
        setListErr(res.error);
      }
    });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeletePending(true);
    setListErr(null);
    const res = await deleteCategoryAction(deleteTarget.id);
    setDeletePending(false);
    if (res.ok) {
      setDeleteTarget(null);
      router.refresh();
    } else {
      setListErr(res.error);
      setDeleteTarget(null);
    }
  }

  function renderEditBar(borderClass: string) {
    return (
      <div
        className={`flex w-full min-w-[min(100%,300px)] max-w-lg flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center ${borderClass}`}
      >
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="flex-1 border-white/15 bg-black/30"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") saveEdit();
            if (e.key === "Escape") {
              setEditingId(null);
              setEditName("");
            }
          }}
        />
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="ghost"
            className="!px-3 !py-2"
            onClick={() => {
              setEditingId(null);
              setEditName("");
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="!px-3 !py-2"
            onClick={saveEdit}
            disabled={pending}
          >
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {listErr ? (
        <p className="text-sm text-rose-400" role="alert">
          {listErr}
        </p>
      ) : null}

      <SettingsSection
        eyebrow="Shared lookups"
        title="Parent categories"
        description="Top-level groups (optgroup headings); pick a transaction type when creating."
        headerGradient="bg-gradient-to-br from-amber-950/45 via-transparent to-transparent"
        icon={parentIcon}
      >
        <div className="max-h-72 overflow-y-auto rounded-xl border border-white/[0.07] bg-black/25 p-4">
          <div className="flex flex-wrap gap-3">
            {!hasParents && !editingId ? (
              <p className="w-full py-8 text-center text-sm text-zinc-500">
                No parent categories yet — add one below, then add subcategories in the next section.
              </p>
            ) : null}
            {tree.map((p) => (
              <Fragment key={p.id}>
                {editingId === p.id ? (
                  renderEditBar(
                    "border-amber-500/35 bg-amber-950/20"
                  )
                ) : (
                  <EntityTag
                    accent="amber"
                    name={p.name}
                    badge={`${typeLabel(p.type)} · ${
                      p.children.length
                        ? `${p.children.length} subcategor${
                            p.children.length === 1 ? "y" : "ies"
                          }`
                        : "No subcategories yet"
                    }`}
                    onEdit={() => {
                      setEditingId(p.id);
                      setEditName(p.name);
                      setListErr(null);
                    }}
                    onDeleteClick={() =>
                      setDeleteTarget({ id: p.id, name: p.name })
                    }
                    deleteDisabled={
                      p.children.length > 0 || p.txAsParentCount > 0
                    }
                    deleteDisabledTitle={
                      p.children.length > 0
                        ? "Remove subcategories first"
                        : "Reassign transactions first"
                    }
                  />
                )}
              </Fragment>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <Label
              htmlFor="new-parent-cat"
              className="!normal-case !tracking-normal text-zinc-400"
            >
              New parent category
            </Label>
            <div className="flex max-w-xl flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                id="new-parent-cat"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="e.g. Health"
                className="min-w-0 flex-1"
                onKeyDown={(e) => e.key === "Enter" && addParent()}
              />
              <DropdownSelect
                aria-label="Transaction type for new parent category"
                value={parentType}
                onChange={(v) => {
                  if (v && PARENT_TYPES.includes(v as TransactionType)) {
                    setParentType(v as TransactionType);
                  }
                }}
                options={PARENT_TYPES.map((t) => ({
                  id: t,
                  name: typeLabel(t),
                }))}
                emptyLabel="Type"
                includeEmptyOption={false}
                className="sm:w-44"
              />
            </div>
          </div>
          <Button
            type="button"
            onClick={addParent}
            disabled={pending}
            className="shrink-0"
          >
            {pending ? "Adding…" : "Add"}
          </Button>
        </div>

        {parentFormErr ? (
          <p className="mt-4 text-sm text-rose-400" role="alert">
            {parentFormErr}
          </p>
        ) : null}
      </SettingsSection>

      <SettingsSection
        eyebrow="Shared lookups"
        title="Subcategories"
        description="Selectable options inside a parent; same type as the group. Remove only when unused on transactions."
        headerGradient="bg-gradient-to-br from-cyan-950/40 via-transparent to-transparent"
        icon={subIcon}
      >
        <div className="max-h-72 overflow-y-auto rounded-xl border border-white/[0.07] bg-black/25 p-4">
          <div className="flex flex-wrap gap-3">
            {flatSubs.length === 0 && !editingId ? (
              <p className="w-full py-8 text-center text-sm text-zinc-500">
                No subcategories yet — create a parent category above, then add subs here.
              </p>
            ) : null}
            {flatSubs.map((c) => (
              <Fragment key={c.id}>
                {editingId === c.id ? (
                  renderEditBar(
                    "border-cyan-500/35 bg-cyan-950/25"
                  )
                ) : (
                  <EntityTag
                    accent="cyan"
                    name={c.name}
                    badge={
                      c.txCount > 0
                        ? `${c.parentName} · ${c.txCount} transaction${
                            c.txCount === 1 ? "" : "s"
                          }`
                        : `${c.parentName} · unused`
                    }
                    onEdit={() => {
                      setEditingId(c.id);
                      setEditName(c.name);
                      setListErr(null);
                    }}
                    onDeleteClick={() =>
                      setDeleteTarget({ id: c.id, name: c.name })
                    }
                    deleteDisabled={c.txCount > 0}
                    deleteDisabledTitle="Change transactions using this subcategory first"
                  />
                )}
              </Fragment>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <Label
              htmlFor="sub-parent"
              className="!normal-case !tracking-normal text-zinc-400"
            >
              New subcategory
            </Label>
            <div className="grid max-w-xl grid-cols-1 gap-2 sm:grid-cols-[12.5rem_minmax(0,1fr)] sm:items-stretch sm:gap-3">
              <DropdownSelect
                id="sub-parent"
                value={subParentId || null}
                onChange={(v) => setSubParentId(v ?? "")}
                options={tree.map((p) => ({ id: p.id, name: p.name }))}
                emptyLabel="Parent category…"
                className="w-full min-w-0"
              />
              <Input
                id="sub-name"
                aria-label="Subcategory name"
                value={subName}
                onChange={(e) => setSubName(e.target.value)}
                placeholder="e.g. Pharmacy"
                className="min-w-0 w-full"
                onKeyDown={(e) => e.key === "Enter" && addSub()}
              />
            </div>
          </div>
          <Button
            type="button"
            onClick={addSub}
            disabled={pending || !hasParents}
            className="shrink-0"
          >
            {pending ? "Adding…" : "Add"}
          </Button>
        </div>

        {subFormErr ? (
          <p className="mt-4 text-sm text-rose-400" role="alert">
            {subFormErr}
          </p>
        ) : null}
      </SettingsSection>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Remove “${deleteTarget?.name ?? ""}”?`}
        description="Only allowed when no transactions (or subcategories, for a parent) depend on it."
        confirmLabel="Remove"
        pending={deletePending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
