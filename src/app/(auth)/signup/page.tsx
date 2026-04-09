import { SignupForm } from "./ui/signup-form";

export default function SignupPage() {
  return (
    <div>
      <header className="text-center sm:text-left">
        <h2 className="bg-linear-to-br from-white via-white to-white/70 bg-clip-text text-2xl font-semibold tracking-tight text-transparent sm:text-[1.65rem]">
          Create your account
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/55">
          A few seconds to start tracking spending and income.
        </p>
        <div
          className="mx-auto mt-4 h-px w-14 rounded-full bg-linear-to-r from-transparent via-emerald-400/45 to-transparent sm:mx-0 sm:w-16 sm:from-emerald-400/35 sm:via-cyan-400/40 sm:to-transparent"
          aria-hidden
        />
      </header>

      <div className="mt-7">
        <SignupForm />
      </div>
    </div>
  );
}
