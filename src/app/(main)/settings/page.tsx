import {
  listContactsWithLoanUsage,
  listContacts,
  listCategoriesWithUsageTree,
  listLocationsWithUsage,
} from "@/lib/services/transactions";
import { db } from "@/lib/db/server";
import { getSessionUserId } from "@/lib/auth/session";
import { PageHeader } from "@/components/common/page-header";
import { BorrowAccountsForm } from "@/components/feature-specific/settings/borrow-accounts-form";
import { QuickEntryRulesForm } from "@/components/feature-specific/settings/quick-entry-rules-form";
import { CategoriesSettingsForm } from "@/components/feature-specific/settings/categories-settings-form";
import { LocationsLookupForm } from "@/components/feature-specific/settings/locations-lookup-form";
import { redirect } from "next/navigation";
import { getRulesForUser } from "@/lib/services/transactions";
import Link from "next/link";

const SETTINGS_TABS = [
  { id: "categories", label: "Categories" },
  { id: "quick-entry", label: "Quick entry" },
  { id: "locations", label: "Locations" },
  { id: "people", label: "People you track" },
] as const;

type SettingsTabId = (typeof SETTINGS_TABS)[number]["id"];

function isSettingsTabId(v: unknown): v is SettingsTabId {
  return typeof v === "string" && (SETTINGS_TABS as readonly { id: string }[]).some((t) => t.id === v);
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const activeTab: SettingsTabId = isSettingsTabId(sp.tab) ? sp.tab : "categories";
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/login");
  }
  const [accounts, locs, categoryTree, contacts, rules] = await Promise.all([
    listContactsWithLoanUsage(db, userId),
    listLocationsWithUsage(db, userId),
    listCategoriesWithUsageTree(db, userId),
    listContacts(db, userId),
    getRulesForUser(userId),
  ]);

  return (
    <div className="relative mx-auto w-full max-w-7xl pb-24">
      <div
        className="pointer-events-none absolute -right-24 -top-16 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-24 top-52 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl"
        aria-hidden
      />

      <div className="relative space-y-6">
        <PageHeader
          eyebrow="Workspace"
          title="Settings"
          subtitle="People and places as tags — edit names anytime; remove only when nothing references them."
        />

        <div className="sticky top-3 z-10 -mx-2">
          <div className="rounded-3xl bg-linear-to-r from-primary/35 via-white/12 to-cyan-500/28 p-px">
            <div className="rounded-3xl border border-white/8 bg-black/30 p-2 backdrop-blur-xl">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {SETTINGS_TABS.map((t) => {
                  const active = t.id === activeTab;
                  const icon =
                    t.id === "categories" ? (
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h10M7 12h10M7 17h10" />
                      </svg>
                    ) : t.id === "quick-entry" ? (
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                      </svg>
                    ) : t.id === "locations" ? (
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-4.5 7-11a7 7 0 10-14 0c0 6.5 7 11 7 11z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5h.01" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 11a4 4 0 10-8 0 4 4 0 008 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 20a8 8 0 0116 0" />
                      </svg>
                    );

                  return (
                    <Link
                      key={t.id}
                      href={`/settings?tab=${t.id}`}
                      aria-current={active ? "page" : undefined}
                      className={`group relative flex h-12 items-center justify-center rounded-2xl px-3 transition duration-200 ${
                        active
                          ? "bg-linear-to-b from-white/18 to-white/8 text-ink shadow-[0_14px_40px_-22px_rgba(0,0,0,0.95)] ring-1 ring-primary/40"
                          : "bg-white/5 text-ink-muted ring-1 ring-white/8 hover:bg-white/9 hover:text-ink hover:ring-white/14"
                      }`}
                    >
                      {active ? (
                        <span
                          className="pointer-events-none absolute inset-x-4 -top-px h-px bg-linear-to-r from-primary/0 via-primary/80 to-primary/0"
                          aria-hidden
                        />
                      ) : null}
                      <span
                        className={`pointer-events-none absolute -inset-0.5 rounded-[1.15rem] opacity-0 blur-md transition duration-200 ${
                          active ? "bg-primary/25 opacity-100" : "bg-primary/15 group-hover:opacity-40"
                        }`}
                        aria-hidden
                      />
                      <span className="flex items-center gap-2">
                        <span
                          className={`transition duration-200 ${
                            active ? "text-primary" : "text-ink-muted group-hover:text-primary/90"
                          }`}
                          aria-hidden
                        >
                          {icon}
                        </span>
                        <span className="text-sm font-semibold tracking-tight">{t.label}</span>
                      </span>
                      {active ? (
                        <span
                          className="pointer-events-none absolute inset-x-6 -bottom-[7px] h-[2px] rounded-full bg-linear-to-r from-primary/0 via-primary/85 to-primary/0"
                          aria-hidden
                        />
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          {activeTab === "categories" ? <CategoriesSettingsForm tree={categoryTree} /> : null}
          {activeTab === "quick-entry" ? (
            <QuickEntryRulesForm
              rules={rules}
              categoryTree={categoryTree}
              locations={locs.map((l: { id: string; name: string }) => ({ id: l.id, name: l.name }))}
              contacts={contacts.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))}
            />
          ) : null}
          {activeTab === "locations" ? <LocationsLookupForm locations={locs} /> : null}
          {activeTab === "people" ? <BorrowAccountsForm accounts={accounts} /> : null}
        </div>
      </div>
    </div>
  );
}
