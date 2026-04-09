"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

export function LogoutButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      className="inline-flex items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-rose-500/20 hover:bg-rose-500/8 hover:text-rose-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/25 focus-visible:ring-offset-2 focus-visible:ring-offset-(--ring-offset) cursor-pointer"
      disabled={pending}
      onClick={() => {
        start(async () => {
          await logoutAction();
          router.replace("/login");
          router.refresh();
        });
      }}
    >
      <LogOutIcon className="opacity-80" />
      Log out
    </Button>
  );
}

