import { useEffect } from "react";

const TAU_MS = 78;
const MIN_HEIGHT = 280;
const SKIP =
  "[data-radix-popper-content-wrapper], [role='listbox'], [role='menu'], [cmdk-list], .ProseMirror, textarea";

/**
 * Eases wheel and trackpad scrolling inside the portal.
 * The document scroll on the public site stays native; the portal locks the
 * document and scrolls its own panels, which CSS scroll-behavior does not ease.
 */
export default function SmoothScroll() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const targets = new Map<HTMLElement, number>();
    const pendingScrolls = new WeakMap<HTMLElement, number>();
    const previousBehavior = new WeakMap<HTMLElement, string>();
    let frame = 0;
    let last = 0;

    const maxScroll = (el: HTMLElement) => Math.max(0, el.scrollHeight - el.clientHeight);

    const canScrollY = (el: HTMLElement) => {
      const overflow = getComputedStyle(el).overflowY;
      return (overflow === "auto" || overflow === "scroll") && maxScroll(el) > 1;
    };

    const canMove = (el: HTMLElement, delta: number) => {
      if (delta > 0) return el.scrollTop < maxScroll(el) - 0.5;
      if (delta < 0) return el.scrollTop > 0.5;
      return false;
    };

    const findScroller = (start: EventTarget | null, delta: number) => {
      const origin = start instanceof Element ? start : null;
      if (!origin?.closest("[data-smooth-scroll='portal']")) return null;

      let node: Element | null = origin;
      while (node instanceof HTMLElement && node.closest("[data-smooth-scroll='portal']")) {
        if (canScrollY(node)) {
          if (!canMove(node, delta)) {
            node = node.parentElement;
            continue;
          }
          if (origin.closest(SKIP) && node.closest(SKIP)) return null;
          if (node.clientHeight < MIN_HEIGHT) return null;
          return node;
        }
        node = node.parentElement;
      }
      return null;
    };

    const lockScroll = (el: HTMLElement) => {
      if (!previousBehavior.has(el)) previousBehavior.set(el, el.style.scrollBehavior);
      el.style.scrollBehavior = "auto";
    };

    const unlockScroll = (el: HTMLElement) => {
      if (!previousBehavior.has(el)) return;
      el.style.scrollBehavior = previousBehavior.get(el) ?? "";
      previousBehavior.delete(el);
    };

    const write = (el: HTMLElement, y: number) => {
      lockScroll(el);
      const before = el.scrollTop;
      pendingScrolls.set(el, (pendingScrolls.get(el) ?? 0) + 1);
      el.scrollTop = y;
      if (el.scrollTop === before) pendingScrolls.set(el, Math.max(0, (pendingScrolls.get(el) ?? 1) - 1));
    };

    const tick = (now: number) => {
      const dt = Math.min(34, now - last);
      last = now;
      const blend = 1 - Math.exp(-dt / TAU_MS);
      let moving = false;

      for (const [el, target] of targets) {
        if (!el.isConnected) {
          targets.delete(el);
          unlockScroll(el);
          continue;
        }
        const clamped = Math.min(maxScroll(el), Math.max(0, target));
        const next = el.scrollTop + (clamped - el.scrollTop) * blend;
        if (Math.abs(clamped - next) < 0.5) {
          write(el, clamped);
          targets.delete(el);
          unlockScroll(el);
        } else {
          write(el, next);
          moving = true;
        }
      }

      frame = moving ? requestAnimationFrame(tick) : 0;
    };

    const onWheel = (event: WheelEvent) => {
      if (media.matches || event.ctrlKey || event.defaultPrevented) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;

      let dy = event.deltaY;
      if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) dy *= 16;
      if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) dy *= window.innerHeight * 0.9;
      if (!dy) return;

      const el = findScroller(event.target, dy);
      if (!el) return;

      event.preventDefault();
      const start = targets.has(el) ? targets.get(el)! : el.scrollTop;
      targets.set(el, Math.min(maxScroll(el), Math.max(0, start + dy)));
      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };

    const onScroll = (event: Event) => {
      const el = event.target;
      if (!(el instanceof HTMLElement)) return;
      const pending = pendingScrolls.get(el) ?? 0;
      if (pending > 0) {
        pendingScrolls.set(el, pending - 1);
        return;
      }
      targets.delete(el);
      unlockScroll(el);
    };

    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("wheel", onWheel, { capture: true });
      window.removeEventListener("scroll", onScroll, true);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
