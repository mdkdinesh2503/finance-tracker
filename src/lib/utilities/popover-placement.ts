const DEFAULT_GAP = 6;
const VIEWPORT_PAD = 8;

export function computeAnchoredTop(args: {
  triggerRect: DOMRectReadOnly;
  panelHeight: number;
  anchorRoot: HTMLElement | null;
  checkNextSibling?: boolean;
  gap?: number;
}): number {
  const {
    triggerRect: r,
    panelHeight: ph,
    anchorRoot,
    checkNextSibling = true,
    gap = DEFAULT_GAP,
  } = args;

  let top = r.bottom + gap;

  if (checkNextSibling) {
    const next = anchorRoot?.nextElementSibling;
    if (next instanceof HTMLElement) {
      const nTop = next.getBoundingClientRect().top;
      if (top + ph > nTop - VIEWPORT_PAD) {
        top = r.top - ph - gap;
      }
    }
  }

  if (top + ph > window.innerHeight - VIEWPORT_PAD) {
    top = r.top - ph - gap;
  }
  if (top < VIEWPORT_PAD) {
    top = VIEWPORT_PAD;
  }

  return top;
}

