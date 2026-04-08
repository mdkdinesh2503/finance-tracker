"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { z } from "zod";
import { signupAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export function SignupForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const form = new FormData(e.currentTarget);
        const email = String(form.get("email") ?? "");
        const password = String(form.get("password") ?? "");
        const parsed = schema.safeParse({ email, password });
        if (!parsed.success) {
          setError("Use a valid email and a password of at least 8 characters");
          return;
        }
        startTransition(async () => {
          const res = await signupAction(parsed.data);
          if (!res.ok) {
            setError(res.error);
            return;
          }
          router.replace("/dashboard");
          router.refresh();
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <button
            type="button"
            className="text-xs text-white/60 underline underline-offset-4 hover:text-white"
            onClick={() => setShow((v) => !v)}
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>
        <Input
          id="password"
          name="password"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Create a strong password"
        />
        <div className="text-xs text-white/50">
          Minimum 8 characters. Use a phrase you can remember.
        </div>
      </div>

      {error ? (
        <div
          className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <Button className="w-full" type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create account"}
      </Button>

      <div className="border-t border-white/8 pt-5 text-center text-sm text-white/55">
        Already have an account?{" "}
        <a
          className="font-medium text-cyan-300/90 underline decoration-cyan-500/30 underline-offset-4 transition hover:text-cyan-200"
          href="/login"
        >
          Log in
        </a>
      </div>
    </form>
  );
}

