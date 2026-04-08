"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  addLocationLookupAction,
  deleteLocationLookupAction,
  updateLocationLookupAction,
} from "@/app/actions/lookups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/settings/confirm-dialog";
import { EntityTag } from "@/components/settings/entity-tag";
import { SettingsSection } from "@/components/settings/settings-section";

export type LocationRow = { id: string; name: string; txCount: number };

export function LocationsLookupForm({ locations: initial }: { locations: LocationRow[] }) {
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
      const res = await addLocationLookupAction(name);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setName("");
      router.refresh();
    });
  }

  function saveEdit() {
    if (!editingId) return;
    setErr(null);
    startTransition(async () => {
      const res = await updateLocationLookupAction(editingId, editName);
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
    const res = await deleteLocationLookupAction(deleteTarget.id);
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
        eyebrow="Shared lookups"
        title="Location tags"
        description="Shared list — rename anytime; remove only when no transaction uses that place."
        headerGradient="bg-gradient-to-br from-cyan-950/40 via-transparent to-transparent"
        icon={
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
        }
      >
        <div className="max-h-80 overflow-y-auto rounded-xl border border-white/[0.07] bg-black/25 p-4">
          <div className="flex flex-wrap gap-3">
            {initial.length === 0 && !editingId ? (
              <p className="w-full py-8 text-center text-sm text-zinc-500">
                No locations yet.
              </p>
            ) : null}
            {initial.map((l) =>
              editingId === l.id ? (
                <div
                  key={l.id}
                  className="flex w-full min-w-[min(100%,300px)] max-w-lg flex-col gap-3 rounded-xl border border-cyan-500/35 bg-cyan-950/25 p-4 sm:flex-row sm:items-center"
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
                      variant="secondary"
                      className="!px-3 !py-2"
                      onClick={saveEdit}
                      disabled={pending}
                    >
                      {pending ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </div>
              ) : (
                <EntityTag
                  key={l.id}
                  accent="cyan"
                  name={l.name}
                  badge={
                    l.txCount > 0
                      ? `${l.txCount} transaction${l.txCount === 1 ? "" : "s"}`
                      : "Unused — safe to remove"
                  }
                  onEdit={() => {
                    setEditingId(l.id);
                    setEditName(l.name);
                    setErr(null);
                  }}
                  onDeleteClick={() =>
                    setDeleteTarget({ id: l.id, name: l.name })
                  }
                  deleteDisabled={l.txCount > 0}
                  deleteDisabledTitle="Reassign transactions first"
                />
              )
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="newloc" className="!normal-case !tracking-normal text-zinc-400">
              New location
            </Label>
            <Input
              id="newloc"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bangalore"
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
        description="Only allowed when no transactions use this location."
        confirmLabel="Remove"
        pending={deletePending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
