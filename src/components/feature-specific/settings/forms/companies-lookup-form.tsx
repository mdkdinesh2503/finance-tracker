"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  addCompanyLookupAction,
  deleteCompanyLookupAction,
  updateCompanyLookupAction,
} from "@/app/actions/lookups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { SettingsSection } from "../components/settings-section";

export type CompanyRow = { id: string; name: string; txCount: number };

export function CompaniesLookupForm({ companies: initial }: { companies: CompanyRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const companies = [...initial].sort((a, b) => {
    const aUsed = a.txCount > 0;
    const bUsed = b.txCount > 0;
    if (aUsed !== bUsed) return aUsed ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  function add() {
    setErr(null);
    startTransition(async () => {
      const res = await addCompanyLookupAction(name);
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
      const res = await updateCompanyLookupAction(editingId, editName);
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
    const res = await deleteCompanyLookupAction(deleteTarget.id);
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
        title="Employers (salary)"
        description=""
        headerGradient="bg-linear-to-br from-primary/10 via-transparent to-transparent"
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
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-0">
              <Label htmlFor="co-name">New company</Label>
              <Input
                id="co-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Acme Corp"
                autoComplete="organization"
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

          {companies.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/3 p-8 text-center">
              <p className="text-sm font-semibold text-ink">No companies yet</p>
              <p className="mt-1 text-xs text-ink-muted">
                Add employers you receive salary from. They attach to Salary &amp; Wages entries.
              </p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {companies.map((c) => {
                const editing = editingId === c.id;
                const deleteDisabled = c.txCount > 0;
                const initialChar = (c.name.trim()[0] ?? "?").toUpperCase();
                const badge = c.txCount > 0 ? `${c.txCount} tx` : null;

                return (
                  <div
                    key={c.id}
                    className={`group relative overflow-visible rounded-2xl border p-3 shadow-[0_14px_44px_-28px_rgba(0,0,0,0.9)] ${
                      deleteDisabled
                        ? "border-emerald-400/20 bg-emerald-500/5 ring-1 ring-emerald-400/10"
                        : "border-white/10 bg-white/2 hover:border-white/14"
                    }`}
                  >
                    <div
                      className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl bg-linear-to-br from-white/8 via-white/3 to-transparent"
                      aria-hidden
                    >
                      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />
                      <div className="absolute -left-10 -bottom-10 h-28 w-28 rounded-full bg-cyan-500/10 blur-2xl" />
                      {deleteDisabled ? (
                        <div className="absolute -left-12 top-2 h-24 w-24 rounded-full bg-emerald-500/12 blur-2xl" />
                      ) : null}
                    </div>

                    <div className="relative flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border bg-linear-to-br text-sm font-extrabold shadow-[0_10px_26px_-18px_rgba(0,0,0,0.95)] ${
                          deleteDisabled
                            ? "border-emerald-400/20 from-emerald-500/18 to-white/6 text-emerald-100"
                            : "border-white/12 from-white/16 to-white/6 text-ink"
                        }`}
                      >
                        {initialChar}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="relative min-w-0 flex-1">
                            <div className="flex h-10 items-center rounded-xl border border-white/0 px-3">
                              {!editing ? (
                                <div className="flex min-w-0 items-center gap-2">
                                  <p
                                    className={`block min-w-0 truncate whitespace-nowrap text-[15px] font-semibold leading-5 ${
                                      deleteDisabled ? "text-ink/90" : "text-ink"
                                    }`}
                                  >
                                    {c.name}
                                  </p>
                                  {badge ? (
                                    <span className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
                                      {badge}
                                    </span>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>

                            {editing ? (
                              <div className="absolute inset-0">
                                <Input
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  autoFocus
                                  className="h-10"
                                />
                              </div>
                            ) : null}
                          </div>

                          {editing ? (
                            <>
                              <button
                                type="button"
                                onClick={saveEdit}
                                disabled={pending || editName.trim().length === 0}
                                title="Save"
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/14 text-primary/90 shadow-[0_10px_26px_-18px_rgba(0,0,0,0.95)] transition hover:border-primary/45 hover:bg-primary/18 hover:text-primary disabled:opacity-50"
                              >
                                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.0}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(null);
                                  setEditName("");
                                }}
                                disabled={pending}
                                title="Cancel"
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-ink-muted transition hover:border-white/14 hover:bg-white/8 hover:text-ink disabled:opacity-50"
                              >
                                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.0}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12" />
                                </svg>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(c.id);
                                  setEditName(c.name);
                                }}
                                disabled={pending}
                                title="Edit"
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/18 bg-linear-to-br from-primary/16 to-white/4 text-primary/85 shadow-[0_10px_26px_-18px_rgba(0,0,0,0.95)] transition hover:border-primary/28 hover:from-primary/22 hover:text-primary disabled:opacity-50"
                              >
                                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9}>
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
                                onClick={() => setDeleteTarget({ id: c.id, name: c.name })}
                                disabled={pending || deleteDisabled}
                                title={
                                  deleteDisabled
                                    ? "Remove transactions using this company first"
                                    : "Delete"
                                }
                                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-linear-to-br shadow-[0_10px_26px_-18px_rgba(0,0,0,0.95)] transition ${
                                  deleteDisabled
                                    ? "border-emerald-400/18 from-emerald-500/10 to-white/4 text-emerald-200/70 opacity-80"
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
      </SettingsSection>

      <ConfirmDialog
        open={deleteTarget != null}
        title="Remove company?"
        description={
          deleteTarget
            ? `This will delete “${deleteTarget.name}”. You can only remove companies not referenced by transactions.`
            : ""
        }
        pending={deletePending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
