import {
  balanceFromSums,
  getSuggestions,
  listContacts,
  listLocations,
  listSelectableCategories,
  sumByTypeForUser,
} from "@/lib/services/transactions";
import { db } from "@/lib/db/server";
import { getSessionUserId } from "@/lib/auth/session";
import { NewTransactionForm } from "@/components/feature-specific/transactions/new-transaction-form";
import { redirect } from "next/navigation";
import { getLoansByContact } from "@/lib/services/queries/transactions";
import { PageHeader } from "@/components/common/page-header";

export default async function NewTransactionPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/login");
  }
  const [categories, locations, contacts, suggestions, loans, sums] =
    await Promise.all([
      listSelectableCategories(db, userId),
      listLocations(db, userId),
      listContacts(db, userId),
      getSuggestions(db, userId),
      getLoansByContact(userId),
      sumByTypeForUser(db, userId),
    ]);

  const num = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const loansSummary = loans.reduce(
    (acc, r) => {
      acc.youOwe += num(r.youOwe);
      acc.theyOweYou += num(r.theyOweYou);
      return acc;
    },
    { youOwe: 0, theyOweYou: 0 },
  );

  const cashBalance = balanceFromSums(sums);

  return (
    <div className="relative mx-auto w-full max-w-3xl space-y-8 pb-20">
      <div
        className="pointer-events-none absolute -right-20 -top-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-16 top-40 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl"
        aria-hidden
      />

      <PageHeader
        eyebrow="Capture"
        title="New transaction"
        subtitle="Use quick entry or fill the fields. Everything saves to your ledger instantly."
      />

      <NewTransactionForm
        categories={categories}
        locations={locations}
        contacts={contacts}
        suggestions={suggestions}
        loansSummary={loansSummary}
        cashBalance={cashBalance}
      />
    </div>
  );
}

