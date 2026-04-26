"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  ScrollColumnArrows,
  scrollElementIntoViewport,
} from "@/components/ui/scroll-column-arrows";
import { computeAnchoredTop } from "@/lib/utilities/popover-placement";

const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

function parseTime(value: string): { h24: number; m: number } {
  const [a, b] = value.split(":");
  const h24 = Math.min(23, Math.max(0, Number.parseInt(a || "0", 10) || 0));
  const m = Math.min(59, Math.max(0, Number.parseInt(b || "0", 10) || 0));
  return { h24, m };
}

function toValue(h24: number, minutes: number): string {
  return `${String(h24).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function to12h(h24: number): { h12: number; pm: boolean } {
  const pm = h24 >= 12;
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return { h12, pm };
}

function from12h(h12: number, isPm: boolean, minutes: number): string {
  let h24: number;
  if (isPm) {
    h24 = h12 === 12 ? 12 : h12 + 12;
  } else {
    h24 = h12 === 12 ? 0 : h12;
  }
  return toValue(h24, minutes);
}

function formatDisplay12(h24: number, m: number): string {
  const { h12, pm } = to12h(h24);
  const ampm = pm ? "PM" : "AM";
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function clockIcon(cls: string) {
  return (
    <svg
      className={cls}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

type Props = {
  id: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

export function TimePickerField({
  id,
  value,
  onChange,
  disabled,
  className = "",
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: Props) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hourColRef = useRef<HTMLDivElement>(null);
  const minColRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const { h24, m } = useMemo(() => parseTime(value || "00:00"), [value]);
  const { h12, pm } = useMemo(() => to12h(h24), [h24]);

  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);

  useEffect(() => setMounted(true), []);

  const GAP = 6;

  const updatePosition = useCallback(() => {
    const btn = triggerRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const panelEl = panelRef.current;
    const pad = 8;
    const pw = panelEl?.offsetWidth ?? 200;
    let left = r.left;
    if (left + pw > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - pw - pad);
    }

    const top = panelEl
      ? computeAnchoredTop({
          triggerRect: r,
          panelHeight: panelEl.getBoundingClientRect().height,
          anchorRoot: rootRef.current,
          gap: GAP,
        })
      : r.bottom + GAP;

    setPos((prev) => {
      const next = { top, left };
      if (
        Math.abs(prev.top - next.top) < 0.5 &&
        Math.abs(prev.left - next.left) < 0.5
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const onMove = () => updatePosition();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, pos, updatePosition]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      scrollElementIntoViewport(hourColRef.current, `[data-hour="${h12}"]`);
      scrollElementIntoViewport(minColRef.current, `[data-minute="${m}"]`);
    });
  }, [open, h12, m]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const ring =
    ariaInvalid === true
      ? "border-rose-500/50 ring-2 ring-rose-500/20"
      : "border-[var(--border)] focus:border-primary/50 focus:ring-2 focus:ring-primary/20";

  const colBtn = (active: boolean) =>
    [
      "glass-dropdown-option w-full cursor-pointer rounded-lg px-1.5 py-2 text-center text-sm tabular-nums transition-[background-color,color] duration-150",
      active
        ? "glass-dropdown-option--selected"
        : "hover:bg-white/[0.07]",
    ].join(" ");

  const panel =
    open && mounted ? (
      <div
        ref={panelRef}
        id={panelId}
        role="dialog"
        aria-label="Choose time"
        className="glass-dropdown-panel fixed z-10000 w-max max-w-[calc(100vw-16px)] p-3 shadow-(--shadow-lift)"
        style={{
          top: pos.top,
          left: pos.left,
          backgroundColor: "var(--dropdown-panel-bg)",
        }}
      >
        <div className="flex gap-2">
          <div className="flex w-11 shrink-0 flex-col">
            <span className="mb-1.5 text-center text-[0.6rem] font-bold uppercase tracking-wider text-zinc-500">
              Hour
            </span>
            <ScrollColumnArrows
              ref={hourColRef}
              className="rounded-lg border border-white/10"
              enabled={open}
            >
              {HOURS_12.map((h) => (
                <button
                  key={h}
                  type="button"
                  data-hour={h}
                  className={colBtn(h === h12)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onChange(from12h(h, pm, m))}
                >
                  {String(h).padStart(2, "0")}
                </button>
              ))}
            </ScrollColumnArrows>
          </div>
          <div className="flex w-11 shrink-0 flex-col">
            <span className="mb-1.5 text-center text-[0.6rem] font-bold uppercase tracking-wider text-zinc-500">
              Min
            </span>
            <ScrollColumnArrows
              ref={minColRef}
              className="rounded-lg border border-white/10"
              enabled={open}
            >
              {minutes.map((min) => (
                <button
                  key={min}
                  type="button"
                  data-minute={min}
                  className={colBtn(min === m)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onChange(from12h(h12, pm, min))}
                >
                  {String(min).padStart(2, "0")}
                </button>
              ))}
            </ScrollColumnArrows>
          </div>
          <div className="flex w-14 shrink-0 flex-col">
            <span className="mb-1.5 text-center text-[0.6rem] font-bold uppercase tracking-wider text-zinc-500">
              &nbsp;
            </span>
            <div className="flex max-h-52 flex-col gap-1 overflow-hidden rounded-lg border border-white/10 p-1">
              <button
                type="button"
                className={colBtn(!pm)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onChange(from12h(h12, false, m))}
              >
                AM
              </button>
              <button
                type="button"
                className={colBtn(pm)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onChange(from12h(h12, true, m))}
              >
                PM
              </button>
            </div>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? panelId : undefined}
        aria-describedby={ariaDescribedBy}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-surface px-3 py-2.5 text-left text-sm font-medium text-ink outline-none transition ${ring} ${
          disabled
            ? "cursor-not-allowed opacity-50"
            : "cursor-pointer hover:border-white/18"
        }`}
      >
        <span className="tabular-nums">{formatDisplay12(h24, m)}</span>
        {clockIcon("h-5 w-5 shrink-0 text-primary")}
      </button>
      {mounted && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
