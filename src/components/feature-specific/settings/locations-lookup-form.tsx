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
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EntityTag } from "./entity-tag";
import { SettingsSection } from "./settings-section";

export type LocationRow = { id: string; name: string; txCount: number };

export function LocationsLookupForm({ locations: initial }: { locations: LocationRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const locations = initial;

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
        description="Add places you frequently spend at. Delete only when no transactions reference them."
        headerGradient="bg-linear-to-br from-cyan-500/10 via-transparent to-transparent"
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
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-0">
              <Label htmlFor="loc-name">New location</Label>
              <Input
                id="loc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Home"
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
            {locations.map((l) => {
              const editing = editingId === l.id;
              const deleteDisabled = l.txCount > 0;
              const badge = l.txCount > 0 ? `${l.txCount} tx` : undefined;
              return (
                <div key={l.id} className="max-w-full">
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
                      name={l.name}
                      badge={badge}
                      accent="cyan"
                      onEdit={() => {
                        setEditingId(l.id);
                        setEditName(l.name);
                      }}
                      onDeleteClick={() => setDeleteTarget({ id: l.id, name: l.name })}
                      deleteDisabled={deleteDisabled}
                      deleteDisabledTitle="Remove transactions using this location first"
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
        title="Remove location?"
        description={
          deleteTarget
            ? `This will delete “${deleteTarget.name}”. You can only remove locations not referenced by transactions.`
            : ""
        }
        pending={deletePending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}

