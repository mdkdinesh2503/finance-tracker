"use client";

type Props = {
  name: string;
  badge?: string;
  accent: "violet" | "cyan" | "amber";
  onEdit: () => void;
  onDeleteClick: () => void;
  /** Delete only when unused */
  deleteDisabled?: boolean;
  deleteDisabledTitle?: string;
};

const ring = {
  violet:
    "from-violet-400/90 via-primary/60 to-indigo-900/40 shadow-violet-500/20",
  cyan: "from-cyan-300/90 via-teal-500/50 to-emerald-900/40 shadow-cyan-500/15",
  amber:
    "from-amber-300/90 via-orange-500/55 to-amber-950/50 shadow-amber-500/15",
};

export function EntityTag({
  name,
  badge,
  accent,
  onEdit,
  onDeleteClick,
  deleteDisabled,
  deleteDisabledTitle,
}: Props) {
  const letter = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="group/tag inline-flex max-w-full items-center gap-2 rounded-2xl border border-white/10 bg-zinc-950/50 py-1.5 pl-2 pr-1.5 shadow-sm backdrop-blur-sm transition hover:border-white/20 hover:bg-zinc-900/60">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white shadow-lg ${ring[accent]}`}
      >
        {letter}
      </span>
      <div className="min-w-0 flex-1">
        <span className="block max-w-[12rem] truncate text-sm font-medium text-zinc-100 sm:max-w-[16rem]">
          {name}
        </span>
        {badge ? (
          <span className="mt-0.5 block text-[0.65rem] font-medium tabular-nums text-zinc-500">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-0.5 border-l border-white/10 pl-2">
        <button
          type="button"
          onClick={onEdit}
          title="Rename"
          className="rounded-lg p-2 text-zinc-400 transition hover:bg-primary/15 hover:text-primary"
          aria-label={`Rename ${name}`}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={deleteDisabled ? undefined : onDeleteClick}
          disabled={deleteDisabled}
          title={
            deleteDisabled
              ? deleteDisabledTitle
              : "Remove"
          }
          className="rounded-lg p-2 text-zinc-500 transition hover:bg-rose-500/15 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-500"
          aria-label={`Remove ${name}`}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
