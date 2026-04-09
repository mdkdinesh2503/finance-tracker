import {
  listContactsWithLoanUsage,
  listContacts,
  listSelectableCategories,
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

export default async function SettingsPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/login");
  }
  const [accounts, locs, categoryTree, categories, contacts, rules] = await Promise.all([
    listContactsWithLoanUsage(db, userId),
    listLocationsWithUsage(db, userId),
    listCategoriesWithUsageTree(db, userId),
    listSelectableCategories(db, userId),
    listContacts(db, userId),
    getRulesForUser(userId),
  ]);

  return (
    <div className="relative mx-auto max-w-3xl space-y-10 pb-20">
      <div
        className="pointer-events-none absolute -right-20 -top-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-16 top-40 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl"
        aria-hidden
      />

      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        subtitle="People and places as tags — edit names anytime; remove only when nothing references them."
      />

      <div className="relative space-y-8">
        <BorrowAccountsForm accounts={accounts} />
        <QuickEntryRulesForm
          rules={rules}
          categories={categories.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))}
          locations={locs.map((l: { id: string; name: string }) => ({ id: l.id, name: l.name }))}
          contacts={contacts.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))}
        />
        <LocationsLookupForm locations={locs} />
        <CategoriesSettingsForm tree={categoryTree} />
      </div>

      <aside className="relative rounded-2xl border border-dashed border-white/12 bg-white/2 px-5 py-4 text-xs leading-relaxed text-zinc-500">
        <p>
          <span className="font-medium text-zinc-400">Privacy:</span> transactions,
          categories, and locations are scoped to your user. New accounts get a
          default category tree automatically.
        </p>
      </aside>
    </div>
  );
}
