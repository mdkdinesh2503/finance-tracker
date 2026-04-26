type AuthPageHeaderProps = {
  title: string;
  description: string;
  accent?: "cyan" | "emerald";
};

const accentClasses: Record<NonNullable<AuthPageHeaderProps["accent"]>, string> = {
  cyan: "from-transparent via-cyan-400/50 to-transparent sm:from-cyan-400/40 sm:via-violet-400/45 sm:to-transparent",
  emerald:
    "from-transparent via-emerald-400/45 to-transparent sm:from-emerald-400/35 sm:via-cyan-400/40 sm:to-transparent",
};

export function AuthPageHeader({ title, description, accent = "cyan" }: AuthPageHeaderProps) {
  return (
    <header className="text-center sm:text-left">
      <h2 className="bg-linear-to-br from-white via-white to-white/70 bg-clip-text text-2xl font-semibold tracking-tight text-transparent sm:text-[1.65rem]">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-white/55">{description}</p>
      <div
        className={`mx-auto mt-4 h-px w-14 rounded-full bg-linear-to-r sm:mx-0 sm:w-16 ${accentClasses[accent]}`}
        aria-hidden
      />
    </header>
  );
}

