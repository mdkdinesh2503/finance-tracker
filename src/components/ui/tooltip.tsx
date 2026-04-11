import type { ReactNode } from "react";
import { cn } from "@/lib/utilities/cn";

type Props = {
  content: ReactNode;
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  className?: string;
  children: ReactNode;
};

export function Tooltip({
  content,
  side = "top",
  align = "center",
  className = "",
  children,
}: Props) {
  const sideClass =
    side === "top"
      ? "bottom-full mb-2 origin-bottom"
      : "top-full mt-2 origin-top";

  const alignClass =
    align === "start"
      ? "left-0"
      : align === "end"
        ? "right-0"
        : "left-1/2 -translate-x-1/2";

  return (
    <div className="group/tt relative block w-full">
      <div className="w-full">{children}</div>
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50",
          sideClass,
          alignClass,
          "w-max max-w-[320px]",
          "scale-95 opacity-0 transition duration-150 ease-out",
          "group-hover/tt:scale-100 group-hover/tt:opacity-100",
          "group-focus-within/tt:scale-100 group-focus-within/tt:opacity-100",
          className,
        )}
      >
        <span className="block rounded-xl border border-white/12 bg-(--dropdown-panel-bg) px-3 py-2 text-[11px] font-medium leading-relaxed tracking-wide text-ink shadow-(--shadow-lift)">
          {content}
        </span>
      </span>
    </div>
  );
}

