import { Suspense } from "react";
import { AuthPageHeader } from "@/components/feature-specific/auth/auth-page-header";
import { LoginForm } from "@/components/feature-specific/auth/login-form";

export default function LoginPage() {
  return (
    <div>
      <AuthPageHeader
        title="Welcome back"
        description="Sign in to continue where you left off."
        accent="cyan"
      />

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
