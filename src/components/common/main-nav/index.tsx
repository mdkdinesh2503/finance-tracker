"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/common/logout-button";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/transactions/new", label: "Add" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
];

function navLinkActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;
  if (href === "/transactions") {
    return !pathname.startsWith("/transactions/new");
  }
  return true;
}

export function MainNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-(--header-border) bg-(--header-bg) shadow-[0_4px_24px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2.5">
        <div className="flex min-w-0 flex-1 justify-start">
          <Link
            href="/dashboard"
            className="text-base font-semibold tracking-tight text-ink"
          >
            <span className="text-gradient-brand">Expense</span>{" "}
            <span className="text-ink-muted">Tracker</span>
          </Link>
        </div>
        <nav className="flex shrink-0 flex-wrap items-center justify-center gap-1">
          {links.map(({ href, label }) => {
            const active = navLinkActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "text-primary"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex min-w-0 flex-1 justify-end">
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}

