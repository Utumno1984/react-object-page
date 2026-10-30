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

// Keys that scroll the scroller itself: they hand the active section back to the spy.
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar']);

/**
 * Scroll-spy of the Anchor Bar. The active section is the last one whose top has passed the bottom
 * edge of the bar; at the end of the scroller it is the last section even when too short to reach the
 * top. Reads are throttled with `requestAnimationFrame` (at most one layout read per frame, only
 * while scrolling or resizing), not made at every scroll event.
 *
 * `pin(id)` fixes the active section (after a click on a link) until the user scrolls by hand
 * (wheel, touch, a scroll key, a press on the scrollbar), so the animated scroll does not pass
 * through the intermediate sections and a short section that cannot reach the top is not replaced
 * by the last one afterwards.
 */
export function useScrollSpy({ scrollerRef, barRef, ids, getElement }: UseScrollSpyOptions) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const pinned = useRef<string | null>(null);
  const frame = useRef(0);
  // Latest inputs, so the listeners are attached once and still read fresh values.
  const latest = useRef({ ids, getElement });
  latest.current = { ids, getElement };

  const measure = useCallback(() => {
    frame.current = 0;
    if (pinned.current) return;
    const scroller = scrollerRef.current;
    const { ids: list, getElement: get } = latest.current;
    if (!scroller || list.length === 0) {
      setActiveId(null);
      return;
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
  }, [scrollerRef, barRef]);

  const schedule = useCallback(() => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(measure);
  }, [measure]);

  const pin = useCallback((id: string) => {
    pinned.current = id;
    setActiveId(id);
  }, []);

  const release = useCallback(() => {
    if (!pinned.current) return;
    pinned.current = null;
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
    };
  }, [scrollerRef, schedule, release]);

  // Sections added, removed or renamed: a pin on a section that is gone is dropped; then re-measure.
  const key = ids.join('\n');
  useEffect(() => {
    if (pinned.current && !ids.includes(pinned.current)) pinned.current = null;
    schedule();
    // `key` stands for `ids`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, schedule]);

  // Window resize and sections that grow (asynchronous content) move the tops without a scroll event.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(schedule);
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
