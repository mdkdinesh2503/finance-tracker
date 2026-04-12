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

export const revalidate = 60;

export default async function NewTransactionPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/login");
  }
  const categories = await listSelectableCategories(db, userId);
  const locations = await listLocations(db, userId);
  const contacts = await listContacts(db, userId);
  const suggestions = await getSuggestions(db, userId);
  const loans = await getLoansByContact(userId);
  const sums = await sumByTypeForUser(db, userId);

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
    <div className="relative mx-auto w-full max-w-5xl space-y-8 pb-24">
      <div
        className="pointer-events-none absolute -right-24 -top-16 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-24 top-52 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl"
        aria-hidden
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

