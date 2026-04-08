import { listLocations } from "@/features/transactions/services";
import { getDb } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth/session";
import { TransactionsView } from "@/components/transactions/transactions-view";
import { redirect } from "next/navigation";

export default async function TransactionsPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/login");
  }
  const db = getDb();
  const locs = await listLocations(db, userId);
  const locationOptions = locs.map((l) => ({ id: l.id, name: l.name }));

  return <TransactionsView locationOptions={locationOptions} />;
}
