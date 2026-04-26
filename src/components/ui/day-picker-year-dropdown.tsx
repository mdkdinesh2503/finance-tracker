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
import { UI, type DropdownProps } from "react-day-picker";
import {
  ScrollNudgeDown,
  ScrollNudgeUp,
  useScrollAreaArrows,
} from "@/components/ui/scroll-column-arrows";
import { computeAnchoredTop } from "@/lib/utilities/popover-placement";

function emitSelectChange(
  onChange: DropdownProps["onChange"],
  numericValue: number
) {
  if (!onChange) return;
  const v = String(numericValue);
  onChange({
    target: { value: v },
    currentTarget: { value: v },
  } as React.ChangeEvent<HTMLSelectElement>);
}

/**
 * Replaces react-day-picker's native &lt;select&gt; for month and year captions.
 * Uses the app glass list (native OS dropdowns stay light on Windows).
 */
export function DayPickerCustomDropdown(props: DropdownProps) {
  const {
    options = [],
    className,
    classNames,
    disabled,
    value,
    onChange,
    "aria-label": ariaLabel,
    style,
  } = props;

  const selected = options.find((o) => o.value === value);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const menuShellRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const [menuFixed, setMenuFixed] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const scrollEdges = useScrollAreaArrows(
    listRef,
    open && mounted && !!menuFixed,
    44,
    [options.length],
  );

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const idx = options.findIndex((o) => o.value === value);
    setHighlight(idx >= 0 ? idx : 0);
  }, [open, value, options]);

  const GAP = 4;

  const placeMenu = useCallback(() => {
    const el = rootRef.current;
    if (!open || !el) return;
    const r = el.getBoundingClientRect();
    const w = Math.max(r.width, 5.5 * 16);
    let left = r.left;
    const pad = 8;
    if (left + w > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - w - pad);
    }

    const measureEl = menuShellRef.current ?? listRef.current;
    const top = measureEl
      ? computeAnchoredTop({
          triggerRect: r,
          panelHeight: measureEl.getBoundingClientRect().height,
          anchorRoot: rootRef.current,
          checkNextSibling: false,
          gap: GAP,
        })
      : r.bottom + GAP;

    const nextPos = { top, left, width: w };
    setMenuFixed((prev) =>
      prev &&
      Math.abs(prev.top - nextPos.top) < 0.5 &&
      Math.abs(prev.left - nextPos.left) < 0.5 &&
      Math.abs(prev.width - nextPos.width) < 0.5
        ? prev
        : nextPos
    );
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setMenuFixed(null);
      return;
    }
    placeMenu();
  }, [open, menuFixed, placeMenu, options.length]);

  useEffect(() => {
    if (!open) return;
    const onViewport = () => placeMenu();
    window.addEventListener("resize", onViewport);
    window.addEventListener("scroll", onViewport, true);
    return () => {
      window.removeEventListener("resize", onViewport);
      window.removeEventListener("scroll", onViewport, true);
    };
  }, [open, placeMenu]);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (menuShellRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open]);

  const rootClass = classNames[UI.DropdownRoot];
  const captionClass = classNames[UI.CaptionLabel];

  const menu =
    mounted && open && menuFixed ? (
      <div
        ref={menuShellRef}
        data-expense-rdp-nav-menu
        className="glass-dropdown-panel fixed z-10000 flex max-h-52 flex-col overflow-hidden shadow-(--shadow-lift) outline-none"
        style={{
          top: menuFixed.top,
          left: menuFixed.left,
          width: menuFixed.width,
          backgroundColor: "var(--dropdown-panel-bg)",
        }}
      >
        <ScrollNudgeUp edges={scrollEdges} />
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          className="min-h-0 flex-1 overflow-y-auto py-1 outline-none scrollbar-hide"
        >
          {options.map((opt, i) => {
            const isSel = opt.value === value;
            const isHi = i === highlight;
            const optClass = [
              "glass-dropdown-option cursor-pointer px-3 py-2.5 text-sm transition-[background-color,color] duration-150",
              isSel
                ? "glass-dropdown-option--selected"
                : isHi
                  ? "glass-dropdown-option--hover"
                  : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSel}
                aria-disabled={opt.disabled}
                className={optClass}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (opt.disabled) return;
                  emitSelectChange(onChange, opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
              </li>
            );
          })}
        </ul>
        <ScrollNudgeDown edges={scrollEdges} />
      </div>
    ) : null;

  return (
    <span
      ref={rootRef}
      data-disabled={disabled}
      className={`${rootClass} inline-flex`}
      style={style}
    >
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-haspopup="listbox"
        className={`flex min-w-0 max-w-44 items-center justify-center gap-1 rounded-md border-0 bg-transparent p-0 text-left text-[0.8125rem] font-semibold text-zinc-100 outline-none transition hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0 disabled:opacity-50 ${className ?? ""}`}
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        <span className={`${captionClass} text-zinc-100`} aria-hidden>
          {selected?.label ?? String(value ?? "")}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-primary transition ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {menu ? createPortal(menu, document.body) : null}
    </span>
  );
}
