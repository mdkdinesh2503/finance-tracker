"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { SettingsSection } from "@/components/settings/settings-section";
import { createRuleAction, deleteRuleAction } from "@/app/actions/settings";

type Option = { id: string; name: string };
type RuleRow = { id: string; keyword: string; categoryId: string | null; contactId: string | null };

export function QuickEntryRulesForm({
  categories,
  contacts,
  rules,
}: {
  categories: Option[];
  contacts: Option[];
  rules: RuleRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const [keyword, setKeyword] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [contactId, setContactId] = useState<string | null>(null);

  const byCat = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const byCon = useMemo(() => new Map(contacts.map((c) => [c.id, c.name])), [contacts]);

  function addRule() {
    setErr(null);
    startTransition(async () => {
      const res = await createRuleAction({
        keyword,
        categoryId,
        contactId,
      });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setKeyword("");
      setCategoryId(null);
      setContactId(null);
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
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="e.g. rent, salary, coffee"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="text-sm font-medium text-white/80">Category (optional)</div>
            <DropdownSelect
              value={categoryId}
              onChange={setCategoryId}
              options={categories}
              emptyLabel="—"
            />
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium text-white/80">Contact (optional)</div>
            <DropdownSelect
              value={contactId}
              onChange={setContactId}
              options={contacts}
              emptyLabel="—"
            />
          </div>
        </div>

        <Button type="button" variant="secondary" onClick={addRule} disabled={pending}>
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
                const con = r.contactId ? byCon.get(r.contactId) : null;
                return (
                  <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/3 px-3 py-2">
                    <div className="min-w-0 text-sm text-white/80">
                      <span className="font-medium text-white">{r.keyword}</span>
                      <span className="text-white/35">{"  →  "}</span>
                      <span className="text-white/60">
                        {cat ? `cat ${cat}` : "cat —"}
                        {con ? ` · con ${con}` : ""}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 text-sm font-medium text-rose-300 hover:text-rose-200"
                      onClick={() => del(r.id)}
                      disabled={pending}
                    >
                      Delete
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {err ? (
          <p className="text-sm text-rose-300" role="alert">
            {err}
          </p>
        ) : null}
      </div>
    </SettingsSection>
  );
}

