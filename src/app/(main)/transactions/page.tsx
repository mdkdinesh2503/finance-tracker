import { listLocations } from "@/lib/services/transactions";
import { db } from "@/lib/db/core/server";
import { getSessionUserId } from "@/lib/auth/session";
import { TransactionsView } from "@/components/feature-specific/transactions/views/transactions-view";
import { redirect } from "next/navigation";

export const revalidate = 60;

export default async function TransactionsPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/login");
  }
  const locs = await listLocations(db, userId);
  const locationOptions = locs.map((l) => ({ id: l.id, name: l.name }));

  return <TransactionsView locationOptions={locationOptions} />;
}

