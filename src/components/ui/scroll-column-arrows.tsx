"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
  type Ref,
  type RefObject,
} from "react";

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (!ref) return;
  if (typeof ref === "function") ref(value);
  else (ref as MutableRefObject<T | null>).current = value;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function ScrollChevron({ up }: { up: boolean }) {
  return (
    <svg
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={up ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
      />
    </svg>
  );
}

const arrowBtnClass =
  "flex h-6 w-full shrink-0 items-center justify-center rounded-md border border-white/10 " +
  "bg-linear-to-b from-white/[0.09] to-transparent text-zinc-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] " +
  "transition-all duration-200 ease-out " +
  "motion-safe:hover:scale-[1.04] motion-safe:hover:border-primary/40 motion-safe:hover:bg-primary/15 motion-safe:hover:text-primary " +
  "motion-safe:active:scale-[0.96] " +
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40 disabled:grayscale " +
  "disabled:border-white/[0.06] disabled:hover:scale-100 disabled:hover:border-white/[0.06] " +
  "disabled:hover:bg-transparent disabled:hover:text-zinc-500";

export type ScrollAreaEdges = {
  overflow: boolean;
  canScrollUp: boolean;
  canScrollDown: boolean;
  scrollUp: () => void;
  scrollDown: () => void;
  /** Instant scroll by pixels; returns false if nothing moved (at edge). */
  scrollByPixels: (delta: number) => boolean;
};

/**
 * Tracks scroll edges for a viewport; call with the same ref you attach to the scrollable element.
 * `enabled` should be false when the element is unmounted (e.g. closed popover).
 */
export function useScrollAreaArrows(
  viewportRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  scrollStep = 48,
  /** Re-run observers when e.g. list length changes or popover opens. */
  remeasureDeps: unknown[] = [],
): ScrollAreaEdges {
  const reducedMotion = usePrefersReducedMotion();
  const [edges, setEdges] = useState({
    overflow: false,
    canScrollUp: false,
    canScrollDown: false,
  });

  const refresh = useCallback(() => {
    const el = viewportRef.current;
    if (!el || !enabled) {
      setEdges({
        overflow: false,
        canScrollUp: false,
        canScrollDown: false,
      });
      return;
    }
    const { scrollTop, scrollHeight, clientHeight } = el;
    const eps = 2;
    const overflow = scrollHeight > clientHeight + eps;
    if (!overflow) {
      setEdges({ overflow: false, canScrollUp: false, canScrollDown: false });
      return;
    }
    setEdges({
      overflow: true,
      canScrollUp: scrollTop > eps,
      canScrollDown: scrollTop + clientHeight < scrollHeight - eps,
    });
  }, [enabled, viewportRef]);

  useLayoutEffect(() => {
    refresh();
    const el = viewportRef.current;
    if (!el || !enabled) return;
    el.addEventListener("scroll", refresh, { passive: true });
    const ro = new ResizeObserver(refresh);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", refresh);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remeasureDeps is intentional
  }, [enabled, refresh, viewportRef, ...remeasureDeps]);

  const behavior = reducedMotion ? ("auto" as const) : ("smooth" as const);

  const scrollUp = useCallback(() => {
    viewportRef.current?.scrollBy({ top: -scrollStep, behavior });
  }, [viewportRef, scrollStep, behavior]);

  const scrollDown = useCallback(() => {
    viewportRef.current?.scrollBy({ top: scrollStep, behavior });
  }, [viewportRef, scrollStep, behavior]);

  const scrollByPixels = useCallback((delta: number) => {
    const el = viewportRef.current;
    if (!el) return false;
    const before = el.scrollTop;
    const max = el.scrollHeight - el.clientHeight;
    el.scrollTop = Math.max(0, Math.min(before + delta, max));
    return el.scrollTop !== before;
  }, [viewportRef]);

  return {
    overflow: edges.overflow,
    canScrollUp: edges.canScrollUp,
    canScrollDown: edges.canScrollDown,
    scrollUp,
    scrollDown,
    scrollByPixels,
  };
}

function useHoverAutoScroll(
  canScroll: boolean,
  scrollByPixels: (delta: number) => boolean,
  direction: "up" | "down",
) {
  const reducedMotion = usePrefersReducedMotion();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollByPixelsRef = useRef(scrollByPixels);
  useEffect(() => {
    scrollByPixelsRef.current = scrollByPixels;
  }, [scrollByPixels]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => () => stop(), [stop]);

  const start = useCallback(() => {
    stop();
    if (!canScroll) return;
    const step = reducedMotion ? 20 : 7;
    const ms = reducedMotion ? 90 : 42;
    const delta = direction === "up" ? -step : step;
    intervalRef.current = setInterval(() => {
      if (!scrollByPixelsRef.current(delta)) stop();
    }, ms);
  }, [canScroll, direction, reducedMotion, stop]);

  return { onMouseEnter: start, onMouseLeave: stop };
}

export function ScrollNudgeUp({
  edges,
  className = "",
}: {
  edges: Pick<
    ScrollAreaEdges,
    "overflow" | "canScrollUp" | "scrollUp" | "scrollByPixels"
  >;
  className?: string;
}) {
  const hover = useHoverAutoScroll(
    edges.overflow && edges.canScrollUp,
    edges.scrollByPixels,
    "up",
  );
  if (!edges.overflow) return null;
  return (
    <button
      type="button"
      aria-label="Scroll up"
      disabled={!edges.canScrollUp}
      className={`${arrowBtnClass} ${className}`}
      onClick={edges.scrollUp}
      {...hover}
    >
      <ScrollChevron up />
    </button>
  );
}

export function ScrollNudgeDown({
  edges,
  className = "",
}: {
  edges: Pick<
    ScrollAreaEdges,
    "overflow" | "canScrollDown" | "scrollDown" | "scrollByPixels"
  >;
  className?: string;
}) {
  const hover = useHoverAutoScroll(
    edges.overflow && edges.canScrollDown,
    edges.scrollByPixels,
    "down",
  );
  if (!edges.overflow) return null;
  return (
    <button
      type="button"
      aria-label="Scroll down"
      disabled={!edges.canScrollDown}
      className={`${arrowBtnClass} ${className}`}
      onClick={edges.scrollDown}
      {...hover}
    >
      <ScrollChevron up={false} />
    </button>
  );
}

/** Scrolls a child into view inside `viewport` only (no page scroll). */
export function scrollElementIntoViewport(
  viewport: HTMLElement | null,
  selector: string,
): void {
  if (!viewport) return;
  const el = viewport.querySelector<HTMLElement>(selector);
  if (!el) return;
  const vRect = viewport.getBoundingClientRect();
  const eRect = el.getBoundingClientRect();
  const delta = eRect.top - vRect.top - (vRect.height - eRect.height) / 2;
  const next = Math.max(
    0,
    Math.min(
      viewport.scrollTop + delta,
      viewport.scrollHeight - viewport.clientHeight,
    ),
  );
  viewport.scrollTop = next;
}

type ScrollColumnArrowsProps = {
  children: React.ReactNode;
  className?: string;
  viewportClassName?: string;
  scrollStep?: number;
  enabled?: boolean;
  remeasureDeps?: unknown[];
};

export const ScrollColumnArrows = forwardRef<HTMLDivElement, ScrollColumnArrowsProps>(
  function ScrollColumnArrows(
    {
      children,
      className = "",
      viewportClassName = "",
      scrollStep = 48,
      enabled = true,
      remeasureDeps = [],
    },
    ref,
  ) {
    const viewportRef = useRef<HTMLDivElement>(null);
    const edges = useScrollAreaArrows(viewportRef, enabled, scrollStep, remeasureDeps);

    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        viewportRef.current = node;
        assignRef(ref, node);
      },
      [ref],
    );

    return (
      <div className={`flex max-h-52 flex-col overflow-hidden ${className}`}>
        <ScrollNudgeUp edges={edges} />
        <div
          ref={setRefs}
          className={`min-h-0 flex-1 overflow-y-auto scrollbar-hide ${viewportClassName}`}
        >
          {children}
        </div>
        <ScrollNudgeDown edges={edges} />
      </div>
    );
  },
);
