"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createContactAction,
  deleteContactAction,
  updateContactAction,
} from "@/app/actions/transactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EntityTag } from "./entity-tag";
import { SettingsSection } from "./settings-section";

export type BorrowAccountRow = { id: string; name: string; loanTxCount: number };

export function BorrowAccountsForm({ accounts }: { accounts: BorrowAccountRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  function add() {
    setErr(null);
    startTransition(async () => {
      const res = await createContactAction(name);
      if (res.ok) {
        setName("");
        router.refresh();
      } else {
        setErr(res.error);
      }
    });
  }

  function saveEdit() {
    if (!editingId) return;
    setErr(null);
    startTransition(async () => {
      const res = await updateContactAction(editingId, editName);
      if (res.ok) {
        setEditingId(null);
        setEditName("");
        router.refresh();
      } else {
        setErr(res.error);
      }
    });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeletePending(true);
    setErr(null);
    const res = await deleteContactAction(deleteTarget.id);
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
        eyebrow="Contacts loans"
        title="People you track"
        description="Add names you borrow from or lend to. Delete only when no loan transactions reference them."
        headerGradient="bg-linear-to-br from-amber-500/10 via-transparent to-transparent"
        icon={
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 20h5v-2a4 4 0 00-4-4h-1m-4 6H2v-2a4 4 0 014-4h7m0 6v-2a4 4 0 00-4-4H6m5-6a4 4 0 11-8 0 4 4 0 018 0zm8 2a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-0">
              <Label htmlFor="contact-name">New contact</Label>
              <Input
                id="contact-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex"
                autoComplete="off"
              />
            </div>
            <Button type="button" onClick={add} disabled={pending || name.trim().length === 0}>
              Add
            </Button>
          </div>

          {err ? (
            <p className="text-sm text-rose-400" role="alert">
              {err}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {accounts.map((a) => {
              const editing = editingId === a.id;
              const deleteDisabled = a.loanTxCount > 0;
              const badge =
                a.loanTxCount > 0 ? `${a.loanTxCount} loan tx` : undefined;
              return (
                <div key={a.id} className="max-w-full">
                  {editing ? (
                    <div className="flex max-w-full items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-[min(18rem,70vw)]"
                        autoFocus
                      />
                      <Button type="button" onClick={saveEdit} disabled={pending}>
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(null);
                          setEditName("");
                        }}
                        disabled={pending}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <EntityTag
                      name={a.name}
                      badge={badge}
                      accent="amber"
                      onEdit={() => {
                        setEditingId(a.id);
                        setEditName(a.name);
                      }}
                      onDeleteClick={() => setDeleteTarget({ id: a.id, name: a.name })}
                      deleteDisabled={deleteDisabled}
                      deleteDisabledTitle="Remove loan transactions first"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </SettingsSection>

      <ConfirmDialog
        open={deleteTarget != null}
        title="Remove contact?"
        description={
          deleteTarget
            ? `This will delete “${deleteTarget.name}”. You can only remove contacts not referenced by loan transactions.`
            : ""
        }
        pending={deletePending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}

