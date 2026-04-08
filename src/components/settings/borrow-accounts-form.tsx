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
import { ConfirmDialog } from "@/components/settings/confirm-dialog";
import { EntityTag } from "@/components/settings/entity-tag";
import { SettingsSection } from "@/components/settings/settings-section";

export type BorrowAccountRow = { id: string; name: string; loanTxCount: number };

export function BorrowAccountsForm({ accounts }: { accounts: BorrowAccountRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
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
        description="Common list for borrow/repayment and lend/receive. Rename anytime; remove only when there are no linked rows."
        headerGradient="bg-gradient-to-br from-violet-950/50 via-transparent to-transparent"
        icon={
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
        }
      >
        <div className="max-h-80 overflow-y-auto rounded-xl border border-white/[0.07] bg-black/25 p-4">
          <div className="flex flex-wrap gap-3">
            {accounts.length === 0 && !editingId ? (
              <p className="w-full py-8 text-center text-sm text-zinc-500">
                No tags yet — add a name below.
              </p>
            ) : null}
            {accounts.map((a) =>
              editingId === a.id ? (
                <div
                  key={a.id}
                  className="flex w-full min-w-[min(100%,300px)] max-w-lg flex-col gap-3 rounded-xl border border-primary/35 bg-primary/10 p-4 sm:flex-row sm:items-center"
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
                      className="px-3! py-2!"
                      onClick={() => {
                        setEditingId(null);
                        setEditName("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      className="px-3! py-2!"
                      onClick={saveEdit}
                      disabled={pending}
                    >
                      {pending ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </div>
              ) : (
                <EntityTag
                  key={a.id}
                  accent="violet"
                  name={a.name}
                  badge={
                    a.loanTxCount > 0
                      ? `${a.loanTxCount} linked transaction${a.loanTxCount === 1 ? "" : "s"}`
                      : "Unused — safe to remove"
                  }
                  onEdit={() => {
                    setEditingId(a.id);
                    setEditName(a.name);
                    setErr(null);
                  }}
                  onDeleteClick={() =>
                    setDeleteTarget({ id: a.id, name: a.name })
                  }
                  deleteDisabled={a.loanTxCount > 0}
                  deleteDisabledTitle="Remove linked loan rows first"
                />
              )
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="bname" className="normal-case! tracking-normal! text-zinc-400">
              New person
            </Label>
            <Input
              id="bname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dinesh"
              className="max-w-md"
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
          </div>
          <Button type="button" onClick={add} disabled={pending} className="shrink-0">
            {pending ? "Adding…" : "Add"}
          </Button>
        </div>

        {err ? (
          <p className="mt-4 text-sm text-rose-400" role="alert">
            {err}
          </p>
        ) : null}
      </SettingsSection>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Remove “${deleteTarget?.name ?? ""}”?`}
        description="Only possible when this person has no linked loan transactions."
        confirmLabel="Remove"
        pending={deletePending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
