import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { SECTION_GAP_PX } from './object-page-styles';

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
const SCROLL_KEYS = /* @__PURE__ */ new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar']);

// Where the keys above do not scroll the scroller: they edit, move a caret or pick a value.
const FIELD_SELECTOR =
  'input, textarea, select, button, [contenteditable=""], [contenteditable="true"], ' +
  '[role="textbox"], [role="combobox"], [role="listbox"], [role="slider"], [role="spinbutton"]';
const isField = (target: EventTarget | null): boolean => target instanceof Element && target.closest(FIELD_SELECTOR) !== null;

interface Pin {
  id: string;
  /** Where the scroller ends up (clamped to what can be scrolled). */
  landing: number;
  arrived: boolean;
  /** How to find the landing again, and to scroll to it, when the layout moved. */
  reposition: Reposition;
}

export interface Reposition {
  landing: () => number;
  scrollTo: (top: number) => void;
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
 * stays there; it is dropped when the user scrolls (a wheel or touch not starting on the bar, a scroll
 * key outside a field, a press on the scrollbar), when the scroller moves away from `landing` after
 * arriving, or when the animation stalls before arriving. If the layout moves on the way (content that
 * grows), the landing is recomputed and the animation re-aimed.
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
      // Content that grew (or a resize) moved the pinned section: where the jump has to land is elsewhere.
      // On its way, the animation is re-aimed at the new place; once arrived, a scroller that stays put
      // is no longer on the section, and the pin is dropped just below.
      if (changed) {
        const fresh = pin.reposition.landing();
        if (Math.abs(fresh - pin.landing) > TOLERANCE) {
          pin.landing = fresh;
          if (!pin.arrived) pin.reposition.scrollTo(fresh);
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
      // A section that was jumped to sits SECTION_GAP_PX below the bar: it has passed the bar's edge.
      const edge = scroller.getBoundingClientRect().top + (barRef.current?.getBoundingClientRect().height ?? 0) + SECTION_GAP_PX + TOLERANCE;
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
    (id: string, landing: number, reposition: Reposition) => {
      const scroller = scrollerRef.current;
      const arrived = !scroller || Math.abs(scroller.scrollTop - landing) <= TOLERANCE;
      const next = { id, landing, arrived, reposition };
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
    const inBar = (event: Event) => event.target instanceof Node && !!barRef.current?.contains(event.target);
    // Only gestures that scroll the scroller hand the active section back. A press or a key inside a
    // field is not one (a space typed in a text field, a click to place the caret), and a touch or wheel
    // that starts on the bar scrolls the bar's own list. Anything that does move the scroller away is
    // caught anyway by the position check in `measure`.
    const onGesture = (event: Event) => {
      if (!inBar(event)) release();
    };
    const onPointerDown = (event: PointerEvent) => {
      // Only a press on the scrollbar (the strip the content does not cover) is a way to scroll.
      if (event.target !== scroller) return;
      const box = scroller.getBoundingClientRect();
      if (event.clientX - box.left >= scroller.clientWidth || event.clientY - box.top >= scroller.clientHeight) release();
    };
    const onKey = (event: KeyboardEvent) => {
      if (SCROLL_KEYS.has(event.key) && !inBar(event) && !isField(event.target)) release();
    };
    scroller.addEventListener('scroll', schedule, { passive: true });
    scroller.addEventListener('wheel', onGesture, { passive: true });
    scroller.addEventListener('touchstart', onGesture, { passive: true });
    scroller.addEventListener('pointerdown', onPointerDown, { passive: true });
    scroller.addEventListener('keydown', onKey);
    return () => {
      scroller.removeEventListener('scroll', schedule);
      scroller.removeEventListener('wheel', onGesture);
      scroller.removeEventListener('touchstart', onGesture);
      scroller.removeEventListener('pointerdown', onPointerDown);
      scroller.removeEventListener('keydown', onKey);
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      clearTimeout(stall.current);
    };
  }, [scrollerRef, barRef, schedule, release]);

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
    // Everything in the scroller, not only the sections: a header or any block above them that grows
    // moves the sections too (and the browser may not anchor the scroll position for us).
    for (const child of Array.from(scroller.children)) observer.observe(child);
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
