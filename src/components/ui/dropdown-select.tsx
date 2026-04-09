"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

export type DropdownOption = { id: string; name: string };

type Props = {
  id?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  options: DropdownOption[];
  /** Shown when `value` is null */
  emptyLabel: string;
  /** When false, list is only `options` (no blank first row). Default true. */
  includeEmptyOption?: boolean;
  className?: string;
  disabled?: boolean;
  "aria-invalid"?: boolean;
  "aria-label"?: string;
};

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-ink-muted transition-transform ${open ? "rotate-180" : ""}`}
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
  );
}

export function DropdownSelect({
  id: propId,
  value,
  onChange,
  options,
  emptyLabel,
  includeEmptyOption = true,
  className = "",
  disabled = false,
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel,
}: Props) {
  const genId = useId();
  const buttonId = propId ?? genId;
  const listId = `${buttonId}-listbox`;
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [menuFixed, setMenuFixed] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const rows: { id: string | null; name: string }[] = includeEmptyOption
    ? [{ id: null, name: emptyLabel }, ...options.map((o) => ({ id: o.id, name: o.name }))]
    : options.map((o) => ({ id: o.id, name: o.name }));

  const idx = rows.findIndex((r) => r.id === value);
  const selectedIndex = idx >= 0 ? idx : 0;

  const GAP = 4;
  const VIEWPORT_PAD = 8;

  const placeMenu = useCallback(() => {
    if (!open || !buttonRef.current) return;
    const btn = buttonRef.current.getBoundingClientRect();
    const list = listRef.current;
    /** Provisional “open below” so the list mounts and we can measure height. */
    if (!list) {
      const nextPos = {
        top: btn.bottom + GAP,
        left: btn.left,
        width: btn.width,
      };
      setMenuFixed((prev) =>
        prev &&
        Math.abs(prev.top - nextPos.top) < 0.5 &&
        Math.abs(prev.left - nextPos.left) < 0.5 &&
        Math.abs(prev.width - nextPos.width) < 0.5
          ? prev
          : nextPos
      );
      return;
    }

    const lh = list.getBoundingClientRect().height;
    let top = btn.bottom + GAP;

    const next = wrapRef.current?.nextElementSibling;
    if (next instanceof HTMLElement) {
      const nTop = next.getBoundingClientRect().top;
      if (top + lh > nTop - VIEWPORT_PAD) {
        top = btn.top - lh - GAP;
      }
    }

    if (top + lh > window.innerHeight - VIEWPORT_PAD) {
      top = btn.top - lh - GAP;
    }
    if (top < VIEWPORT_PAD) {
      top = VIEWPORT_PAD;
    }

    const nextPos = { top, left: btn.left, width: btn.width };
    setMenuFixed((prev) =>
      prev &&
      Math.abs(prev.top - nextPos.top) < 0.5 &&
      Math.abs(prev.left - nextPos.left) < 0.5 &&
      Math.abs(prev.width - nextPos.width) < 0.5
        ? prev
        : nextPos
    );
  }, [open]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setMenuFixed(null);
      return;
    }
    placeMenu();
    /** `menuFixed` in deps: first pass mounts the portal list; second pass measures and flips above siblings. */
  }, [open, menuFixed, placeMenu, rows.length]);

  useEffect(() => {
    if (!open || disabled) return;
    const onViewportChange = () => placeMenu();
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [open, disabled, placeMenu]);

  const pick = useCallback(
    (id: string | null) => {
      if (disabled) return;
      onChange(id);
      setOpen(false);
    },
    [onChange, disabled]
  );

  useEffect(() => {
    if (!open || disabled) return;
    setHighlight(selectedIndex);
    const t = requestAnimationFrame(() => listRef.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [open, selectedIndex, disabled]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if (listRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const display =
    value === null
      ? emptyLabel
      : (options.find((o) => o.id === value)?.name ?? emptyLabel);

  function onButtonKeyDown(e: ReactKeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  }

  function onListKeyDown(e: ReactKeyboardEvent<HTMLUListElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((i) => Math.min(i + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(rows[highlight]!.id);
    } else if (e.key === "Home") {
      e.preventDefault();
      setHighlight(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setHighlight(rows.length - 1);
    }
  }

  const menu =
    mounted && open && menuFixed && !disabled ? (
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        tabIndex={0}
        onKeyDown={onListKeyDown}
        className="glass-dropdown-panel fixed z-10000 max-h-60 overflow-auto py-1 outline-none"
        style={{
          top: menuFixed.top,
          left: menuFixed.left,
          width: menuFixed.width,
        }}
      >
        {rows.map((row, i) => {
          const isValue = row.id === value;
          const isHi = i === highlight;
          const optClass = [
            "glass-dropdown-option cursor-pointer px-3 py-2.5 text-sm transition-[background-color,color] duration-150",
            isValue
              ? "glass-dropdown-option--selected"
              : isHi
                ? "glass-dropdown-option--hover"
                : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <li
              key={row.id ?? "__empty__"}
              role="option"
              aria-selected={isValue}
              className={optClass}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(row.id)}
            >
              {row.name}
            </li>
          );
        })}
      </ul>
    ) : null;

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        id={buttonId}
        type="button"
        role="combobox"
        disabled={disabled}
        aria-expanded={disabled ? false : open}
        aria-controls={listId}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid === true || undefined}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onButtonKeyDown}
        data-state={open ? "open" : "closed"}
        className={`flex w-full items-center justify-between rounded-xl border border-(--border) bg-surface px-3 py-2.5 text-left text-sm font-medium text-ink outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 data-[state=open]:border-primary/40 ${
          disabled ? "cursor-not-allowed opacity-45" : ""
        } ${ariaInvalid === true ? "border-rose-500/50 ring-1 ring-rose-500/25" : ""}`}
      >
        <span className="truncate">{display}</span>
        <Chevron open={open} />
      </button>

      {menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
