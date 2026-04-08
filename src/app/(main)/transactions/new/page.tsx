import {
  balanceFromSums,
  listContacts,
  listLocations,
  listSelectableCategories,
  getSuggestions,
  sumByTypeForUser,
} from "@/features/transactions/services";
import { getDb } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth/session";
import { NewTransactionForm } from "@/components/transactions/new-transaction-form";
import { redirect } from "next/navigation";
import { getLoansByContact } from "@/lib/queries/transactions";

export default async function NewTransactionPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/login");
  }
  const db = getDb();
  const [categories, locations, contacts, suggestions, loans, sums] = await Promise.all([
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
    <NewTransactionForm
      categories={categories}
      locations={locations}
      contacts={contacts}
      suggestions={suggestions}
      loansSummary={loansSummary}
      cashBalance={cashBalance}
    />
  );
}
