"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/common/logout-button";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/transactions/new", label: "Add" },
  { href: "/analytics", label: "Analytics" },
  { href: "/analytics/lending", label: "Lending" },
  { href: "/analytics/investments", label: "Invest" },
  { href: "/settings", label: "Settings" },
] as const;

const beforeIncome = links.slice(0, 5);
const afterIncome = links.slice(5);

const incomeSubLinks = [
  { href: "/analytics/income/salary", label: "Salary & Wages" },
  { href: "/analytics/income/other", label: "Other income" },
] as const;

function navLinkActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;
  if (href === "/transactions") {
    return !pathname.startsWith("/transactions/new");
  }
  if (href === "/analytics") {
    return pathname === "/analytics";
  }
  return true;
}

function incomeNavActive(pathname: string): boolean {
  return pathname === "/analytics/income" || pathname.startsWith("/analytics/income/");
}

export function MainNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-(--header-border) bg-(--header-bg) shadow-[0_4px_24px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2.5">
        <div className="flex min-w-0 flex-1 justify-start">
          <Link
            href="/dashboard"
            prefetch={false}
            className="text-base font-semibold tracking-tight text-ink"
          >
            <span className="text-gradient-brand">Expense</span>{" "}
            <span className="text-ink-muted">Tracker</span>
          </Link>
        </div>
        <nav className="flex shrink-0 flex-wrap items-center justify-center gap-1">
          {beforeIncome.map(({ href, label }) => {
            const active = navLinkActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                prefetch={false}
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
          <div className="group/income relative">
            <div className="flex items-center">
              <Link
                href="/analytics/income/salary"
                prefetch={false}
                className={`rounded-l-xl px-3 py-2 text-sm font-medium transition-colors ${
                  incomeNavActive(pathname)
                    ? "text-primary"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                Income
              </Link>
              <span
                className={`rounded-r-xl py-2 pr-2 pl-0.5 text-sm transition-colors ${
                  incomeNavActive(pathname)
                    ? "text-primary"
                    : "text-ink-muted group-hover/income:text-ink"
                }`}
                aria-hidden
              >
                ▾
              </span>
            </div>
            <div
              className="invisible absolute left-0 top-full z-50 min-w-46 pt-1 opacity-0 transition-all duration-150 group-hover/income:visible group-hover/income:opacity-100"
              role="menu"
              aria-label="Income views"
            >
              <div className="rounded-xl border border-white/10 bg-(--header-bg) py-1 shadow-lg shadow-black/40 backdrop-blur-xl">
                {incomeSubLinks.map(({ href, label }) => {
                  const subActive = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      prefetch={false}
                      role="menuitem"
                      className={`block px-3 py-2 text-sm font-medium transition-colors ${
                        subActive
                          ? "bg-primary/12 text-primary"
                          : "text-ink-muted hover:bg-white/5 hover:text-ink"
                      }`}
                    >
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
          {afterIncome.map(({ href, label }) => {
            const active = navLinkActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                prefetch={false}
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
