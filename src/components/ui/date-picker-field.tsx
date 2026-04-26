"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { DayPickerCustomDropdown } from "@/components/ui/day-picker-year-dropdown";
import { formatLocalYMD } from "@/lib/utilities/date-presets";
import { formatYmdAsDmy, parseYmdToLocalDate } from "@/lib/utilities/format";
import { computeAnchoredTop } from "@/lib/utilities/popover-placement";

type Props = {
  id: string;
  value: string | null;
  onChange: (next: string | null) => void;
  placeholder?: string;
  /** When false, footer hides Clear (e.g. required transaction date). */
  allowClear?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

function calendarIcon(className: string) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5"
      />
    </svg>
  );
}

export function DatePickerField({
  id,
  value,
  onChange,
  placeholder = "dd-mm-yyyy",
  allowClear = true,
  disabled,
  className = "",
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: Props) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [month, setMonth] = useState<Date>(() => {
    const d = value ? parseYmdToLocalDate(value) : undefined;
    return d ?? new Date();
  });
  const [popoverStyle, setPopoverStyle] = useState<{
    top: number;
    left: number;
    minWidth: number;
  }>({ top: 0, left: 0, minWidth: 300 });

  const selected = value ? parseYmdToLocalDate(value) : undefined;
  const yearNow = new Date().getFullYear();
  const startMonth = new Date(1990, 0);
  const endMonth = new Date(yearNow + 8, 11);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const d = value ? parseYmdToLocalDate(value) : undefined;
    setMonth(d ?? new Date());
  }, [open, value]);

  const GAP = 6;

  const updatePopoverPosition = useCallback(() => {
    const btn = triggerRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const pad = 8;
    const minW = Math.max(r.width, 300);
    let left = r.left;
    if (left + minW > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - minW - pad);
    }

    const panel = panelRef.current;
    const top = panel
      ? computeAnchoredTop({
          triggerRect: r,
          panelHeight: panel.getBoundingClientRect().height,
          anchorRoot: rootRef.current,
          gap: GAP,
        })
      : r.bottom + GAP;

    setPopoverStyle((prev) => {
      const next = { top, left, minWidth: minW };
      if (
        Math.abs(prev.top - next.top) < 0.5 &&
        Math.abs(prev.left - next.left) < 0.5 &&
        Math.abs(prev.minWidth - next.minWidth) < 0.5
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePopoverPosition();
    const onReposition = () => updatePopoverPosition();
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
    /** Second pass after the portal mounts so panel height is known. */
  }, [open, popoverStyle, updatePopoverPosition]);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      const el = e.target as HTMLElement;
      if (el.closest?.("[data-expense-rdp-nav-menu]")) return;
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const triggerRing =
    ariaInvalid === true
      ? "border-rose-500/50 ring-2 ring-rose-500/20"
      : "border-(--border) focus:border-primary/50 focus:ring-2 focus:ring-primary/20";

  const panel =
    open && mounted ? (
      <div
        ref={panelRef}
        id={panelId}
        role="dialog"
        aria-label="Choose date"
        className="expense-date-picker-popover glass-dropdown-panel fixed z-200 rounded-2xl p-4 shadow-(--shadow-lift)"
        style={{
          top: popoverStyle.top,
          left: popoverStyle.left,
          minWidth: popoverStyle.minWidth,
        }}
      >
        <DayPicker
          mode="single"
          required={false}
          selected={selected}
          month={month}
          onMonthChange={setMonth}
          onSelect={(d) => {
            onChange(d ? formatLocalYMD(d) : null);
            setOpen(false);
          }}
          components={{ Dropdown: DayPickerCustomDropdown }}
          weekStartsOn={1}
          captionLayout="dropdown"
          startMonth={startMonth}
          endMonth={endMonth}
          navLayout="around"
          className="mx-auto w-full"
          classNames={{
            root: "rdp-root text-[var(--ink)] w-full",
            months: "rdp-months",
            month: "rdp-month w-full",
            month_caption:
              "rdp-month_caption !flex !items-center !justify-center !text-center min-h-[2.75rem]",
            dropdowns:
              "rdp-dropdowns !flex !flex-wrap !items-center !justify-center !gap-2",
            dropdown_root: "rdp-dropdown_root",
            nav: "rdp-nav",
            button_previous:
              "rdp-button_previous text-[var(--ink-muted)] hover:text-primary",
            button_next:
              "rdp-button_next text-[var(--ink-muted)] hover:text-primary",
            month_grid: "rdp-month_grid",
            weekdays: "rdp-weekdays",
            weekday:
              "rdp-weekday text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500",
            week: "rdp-week",
            day: "rdp-day",
            day_button:
              "rdp-day_button text-sm transition-[background-color,color,box-shadow] duration-150",
          }}
        />
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
          {allowClear ? (
            <button
              type="button"
              className="text-xs font-semibold text-primary transition hover:text-primary-hover"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              Clear
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            className="text-xs font-semibold text-primary transition hover:text-primary-hover"
            onClick={() => {
              onChange(formatLocalYMD(new Date()));
              setOpen(false);
            }}
          >
            Today
          </button>
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
        data-state={open ? "open" : "closed"}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-surface px-3 py-2.5 text-left text-sm font-medium text-ink outline-none transition data-[state=open]:border-primary/40 ${triggerRing} ${
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        }`}
      >
        <span
          className={
            value
              ? "tabular-nums text-ink"
              : "text-ink-muted"
          }
        >
          {value ? formatYmdAsDmy(value) : placeholder}
        </span>
        {calendarIcon("h-5 w-5 shrink-0 text-primary")}
      </button>

      {mounted && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
