import { MainNav } from "@/components/common/main-nav";
import { PageFade } from "@/components/motion/page-fade";
import { ensureDefaultReferenceDataForUser } from "@/lib/db/reference";
import { getDb } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth/session";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getSessionUserId();
  if (userId) {
    await ensureDefaultReferenceDataForUser(getDb(), userId);
  }

  return (
    <div className="relative min-h-screen app-page-orbs">
      <div className="pointer-events-none fixed inset-0 z-0 hero-grid-bg" aria-hidden />
      <div className="relative z-10 flex min-h-screen flex-col">
        <MainNav />
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-3 py-3">
          <PageFade>{children}</PageFade>
        </main>
      </div>
    </div>
  );
}
