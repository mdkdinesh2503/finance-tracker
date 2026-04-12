import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold text-white">Welcome</h1>
        <p className="text-sm text-white/65">
          Set up a few basics so tracking stays effortless.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/settings"
          prefetch={false}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 transition hover:bg-white/8"
        >
          Go to Settings
        </Link>
        <Link
          href="/transactions/new"
          prefetch={false}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 transition hover:bg-white/8"
        >
          Add your first transaction
        </Link>
      </div>

      <div className="pt-2">
        <Link
          href="/dashboard"
          prefetch={false}
          className="text-sm text-indigo-200 hover:text-indigo-100"
        >
          Skip for now →
        </Link>
      </div>
    </div>
  );
}

