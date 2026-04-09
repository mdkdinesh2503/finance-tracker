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
import { Textarea } from "@/components/ui/textarea";

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
    "inline-flex h-8 w-8 items-center justify-center rounded-lg border text-white/75 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60";
  const cls =
    tone === "danger"
      ? `${base} border-rose-500/25 bg-rose-500/5 hover:border-rose-500/40 hover:bg-rose-500/10`
      : `${base} border-white/10 bg-white/2 hover:border-white/20 hover:bg-white/5`;
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
  const byLoc = useMemo(() => new Map(locations.map((l) => [l.id, l.name])), [locations]);
  const byCon = useMemo(() => new Map(contacts.map((c) => [c.id, c.name])), [contacts]);

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
      description="Keyword match in quick entry text → category and/or contact."
      headerGradient="bg-gradient-to-br from-sky-950/45 via-transparent to-transparent"
      icon={
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h14" />
        </svg>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm font-medium text-white/80">Keyword</div>
          <Input
            value={keyword}
            onChange={(e) => setKeyword(normalizeRuleKeyword(e.target.value))}
            placeholder='e.g. "chit" (you can type "1000 chit")'
          />
          <p className="text-xs text-zinc-500">
            Tip: if you type an amount first (like <span className="text-zinc-400">“2000 chit”</span>), we’ll store just the keyword.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="text-sm font-medium text-white/80">Category group</div>
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
          <div className="space-y-2">
            <div className="text-sm font-medium text-white/80">Contact (optional)</div>
            <DropdownSelect value={contactId} onChange={setContactId} options={contacts} emptyLabel="—" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="text-sm font-medium text-white/80">Subcategory</div>
            <DropdownSelect
              value={categoryId}
              onChange={setCategoryId}
              options={subOptions}
              emptyLabel={parentId ? "Select subcategory" : "Select a group first"}
              disabled={!parentId}
            />
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium text-white/80">Location</div>
            <DropdownSelect value={locationId} onChange={setLocationId} options={locations} emptyLabel="Select location" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium text-white/80">Note (optional)</div>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note to apply when this rule matches (e.g. Chit contribution)"
          />
          <p className="text-xs text-zinc-500">
            When this keyword matches in Add transaction quick entry, this note will be used.
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={addRule}
          disabled={pending || keyword.trim().length === 0 || !categoryId || !locationId}
        >
          {pending ? "Adding…" : "Add rule"}
        </Button>

        <div className="mt-2 border-t border-white/10 pt-4">
          {rules.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              No rules yet — add a keyword above.
            </p>
          ) : (
            <ul className="space-y-2">
              {rules.map((r) => {
                const cat = r.categoryId ? byCat.get(r.categoryId) : null;
                const loc = r.locationId ? byLoc.get(r.locationId) : null;
                const con = r.contactId ? byCon.get(r.contactId) : null;
                return (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/3 px-3 py-2"
                  >
                    {editingId === r.id ? (
                      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="text-xs font-medium text-white/70">Keyword</div>
                          <Input
                            value={editKeyword}
                            onChange={(e) => setEditKeyword(normalizeRuleKeyword(e.target.value))}
                            placeholder='e.g. "chit"'
                          />
                          <div className="pt-2">
                            <div className="text-xs font-medium text-white/70">Note</div>
                            <Textarea
                              value={editNote}
                              onChange={(e) => setEditNote(e.target.value)}
                              placeholder="Optional"
                            />
                          </div>
                        </div>
                        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-4">
                          <div className="space-y-2">
                            <div className="text-xs font-medium text-white/70">Group</div>
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
                          <div className="space-y-2">
                            <div className="text-xs font-medium text-white/70">Contact</div>
                            <DropdownSelect
                              value={editContactId}
                              onChange={setEditContactId}
                              options={contacts}
                              emptyLabel="—"
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="text-xs font-medium text-white/70">Subcategory</div>
                            <DropdownSelect
                              value={editCategoryId}
                              onChange={setEditCategoryId}
                              options={editSubOptions}
                              emptyLabel={editParentId ? "Select" : "Pick group"}
                              disabled={!editParentId}
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="text-xs font-medium text-white/70">Location</div>
                            <DropdownSelect
                              value={editLocationId}
                              onChange={setEditLocationId}
                              options={locations}
                              emptyLabel="Select"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button type="button" onClick={saveEdit} disabled={pending}>
                            Save
                          </Button>
                          <Button type="button" variant="ghost" onClick={cancelEdit} disabled={pending}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="truncate text-sm font-medium text-white/90">
                              {r.keyword}
                            </span>
                            <span className="text-xs text-zinc-500">
                              {cat ? `Cat: ${cat}` : "Cat: —"} ·{" "}
                              {con ? `Contact: ${con}` : "Contact: —"} ·{" "}
                              {loc ? `Loc: ${loc}` : "Loc: —"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <IconButton label="Edit rule" onClick={() => startEdit(r)} disabled={pending}>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6 6M3 21h6l12-12a2.5 2.5 0 10-3.536-3.536L5 17H3v4z" />
                            </svg>
                          </IconButton>
                          <IconButton
                            label="Delete rule"
                            tone="danger"
                            onClick={() => del(r.id)}
                            disabled={pending}
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </IconButton>
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {err ? (
          <p className="text-sm text-rose-400" role="alert">
            {err}
          </p>
        ) : null}
      </div>
    </SettingsSection>
  );
}

