import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

interface UseScrollSpyOptions {
  scrollerRef: RefObject<HTMLElement | null>;
  barRef: RefObject<HTMLElement | null>;
  /** Section ids in DOM order. */
  ids: readonly string[];
  getElement: (id: string) => HTMLElement | null | undefined;
}

// A section whose top is within this many px below the bar's bottom edge counts as having passed it
// (sub-pixel positions after a programmatic scroll).
const TOLERANCE = 2;
// A scroll that has not moved for this long (ms) without reaching its destination was interrupted.
const STALL_MS = 300;

// Keys that scroll the scroller itself: they hand the active section back to the spy.
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar']);

interface Pin {
  id: string;
  /** Where the scroller ends up (clamped to what can be scrolled). */
  landing: number;
  arrived: boolean;
}

/**
 * Scroll-spy of the Anchor Bar. The active section is the last one whose top has passed the bottom
 * edge of the bar; at the end of the scroller it is the last section even when too short to reach the
 * top. Reads are throttled with `requestAnimationFrame` (at most one layout read per frame, only
 * while scrolling or resizing), not made at every scroll event.
 *
 * `pin(id, landing)` fixes the active section after a click on a link, so the animated scroll does not
 * pass through the intermediate sections and a short section that cannot reach the top is not replaced
 * by the last one afterwards. The pin lasts while the scroller is on its way to `landing` and while it
 * stays there; it is dropped when the user scrolls (wheel, touch, a scroll key, a press on the
 * scrollbar), when the scroller moves away from `landing` after arriving, or when the animation stalls
 * before arriving (interrupted by something else).
 */
export function useScrollSpy({ scrollerRef, barRef, ids, getElement }: UseScrollSpyOptions) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const pinned = useRef<Pin | null>(null);
  const frame = useRef(0);
  const stall = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const scheduleRef = useRef<() => void>(() => undefined);
  // Set by the ResizeObserver: the next measure knows the layout moved without the scroller moving.
  const layoutChanged = useRef(false);
  // Latest inputs, so the listeners are attached once and still read fresh values.
  const latest = useRef({ ids, getElement });
  latest.current = { ids, getElement };

  // Watches a pin that has not arrived: if the scroll stops short of it, the pin is dropped.
  const armStall = useCallback((target: Pin) => {
    clearTimeout(stall.current);
    if (target.arrived) return;
    stall.current = setTimeout(() => {
      if (pinned.current !== target || target.arrived) return;
      pinned.current = null;
      scheduleRef.current();
    }, STALL_MS);
  }, []);

  const measure = useCallback(() => {
    frame.current = 0;
    const changed = layoutChanged.current;
    layoutChanged.current = false;
    const scroller = scrollerRef.current;
    const { ids: list, getElement: get } = latest.current;
    if (!scroller || list.length === 0) {
      setActiveId(null);
      return;
    }
    const pin = pinned.current;
    if (pin) {
      // Content that grew (or a resize) moved the pinned section: where the click would land now is
      // elsewhere, and a scroller that stays put is no longer on it.
      if (changed && pin.arrived) {
        const element = get(pin.id);
        if (element) {
          const barHeight = barRef.current?.getBoundingClientRect().height ?? 0;
          const wanted = element.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - barHeight;
          pin.landing = Math.min(Math.max(0, wanted), Math.max(0, scroller.scrollHeight - scroller.clientHeight));
        }
      }
      const away = Math.abs(scroller.scrollTop - pin.landing) > TOLERANCE;
      if (!away) pin.arrived = true;
      if (!(pin.arrived && away)) {
        armStall(pin);
        return;
      }
      pinned.current = null;
    }
    let next = list[0] as string;
    const atEnd = scroller.scrollHeight > scroller.clientHeight && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
    if (atEnd) {
      next = list[list.length - 1] as string;
    } else {
      const edge = scroller.getBoundingClientRect().top + (barRef.current?.getBoundingClientRect().height ?? 0) + TOLERANCE;
      for (const id of list) {
        const element = get(id);
        if (element && element.getBoundingClientRect().top <= edge) next = id;
      }
    }
    setActiveId(next);
  }, [scrollerRef, barRef, armStall]);

  const schedule = useCallback(() => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(measure);
  }, [measure]);

  const pin = useCallback(
    (id: string, landing: number) => {
      const scroller = scrollerRef.current;
      const arrived = !scroller || Math.abs(scroller.scrollTop - landing) <= TOLERANCE;
      const next = { id, landing, arrived };
      pinned.current = next;
      armStall(next);
      setActiveId(id);
    },
    [scrollerRef, armStall],
  );

  useEffect(() => {
    scheduleRef.current = schedule;
  }, [schedule]);

  const release = useCallback(() => {
    if (!pinned.current) return;
    pinned.current = null;
    clearTimeout(stall.current);
    schedule();
  }, [schedule]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (SCROLL_KEYS.has(event.key)) release();
    };
    scroller.addEventListener('scroll', schedule, { passive: true });
    scroller.addEventListener('wheel', release, { passive: true });
    scroller.addEventListener('touchstart', release, { passive: true });
    scroller.addEventListener('pointerdown', release, { passive: true });
    scroller.addEventListener('keydown', onKey);
    return () => {
      scroller.removeEventListener('scroll', schedule);
      scroller.removeEventListener('wheel', release);
      scroller.removeEventListener('touchstart', release);
      scroller.removeEventListener('pointerdown', release);
      scroller.removeEventListener('keydown', onKey);
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      clearTimeout(stall.current);
    };
  }, [scrollerRef, schedule, release]);

  // Sections added, removed or renamed: a pin on a section that is gone is dropped; then re-measure.
  const key = ids.join('\n');
  useEffect(() => {
    if (pinned.current && !ids.includes(pinned.current.id)) pinned.current = null;
    schedule();
    // `key` stands for `ids`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, schedule]);

  // Window resize and sections that grow (asynchronous content) move the tops without a scroll event.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => {
      layoutChanged.current = true;
      schedule();
    });
    observer.observe(scroller);
    for (const id of ids) {
      const element = getElement(id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
    // `key` stands for `ids`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollerRef, getElement, key, schedule]);

  return { activeId, pin };
}
