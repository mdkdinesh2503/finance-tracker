import { Suspense } from "react";
import { LoginForm } from "./ui/login-form";

export default function LoginPage() {
  return (
    <div>
      <header className="text-center sm:text-left">
        <h2 className="bg-linear-to-br from-white via-white to-white/70 bg-clip-text text-2xl font-semibold tracking-tight text-transparent sm:text-[1.65rem]">
          Welcome back
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/55">
          Sign in to continue where you left off.
        </p>
        <div
          className="mx-auto mt-4 h-px w-14 rounded-full bg-linear-to-r from-transparent via-cyan-400/50 to-transparent sm:mx-0 sm:w-16 sm:from-cyan-400/40 sm:via-violet-400/45 sm:to-transparent"
          aria-hidden
        />
      </header>

      <div className="mt-7">
        <Suspense
          fallback={
            <div
              className="h-44 animate-pulse rounded-2xl bg-white/4 ring-1 ring-white/6"
              aria-hidden
            />
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
