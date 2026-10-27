// Internal: tells whether a focus event is the result of the user moving the focus with the
// keyboard (Tab, Shift+Tab, arrows, Home/End...) as opposed to a script calling `focus()` or
// `autoFocus` (a Dialog moving the focus to its first button, a page that focuses a field on load).
//
// `:focus-visible` is not enough: browsers also match it for script focus when the previous
// interaction was the keyboard (opening a dialog with Enter), so it cannot tell "the user tabbed
// here" from "the app moved the focus here". A navigation key held down at the moment of the focus
// event can: the browser moves the focus in the default action of the keydown, before the keyup.
const NAVIGATION_KEYS = new Set([
  'Tab',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageUp',
  'PageDown',
]);

// A keyup lost to a window switch must not leave the flag stuck for ever (no window-level listener
// for it: the Tailwind scan would read a bare event name there as a utility class).
const STALE_AFTER_MS = 1000;

let navigationKeyDownAt: number | null = null;
let listeners = 0;

const onKeyDown = (event: KeyboardEvent) => {
  navigationKeyDownAt = NAVIGATION_KEYS.has(event.key) ? Date.now() : null;
};
const reset = () => {
  navigationKeyDownAt = null;
};

/** Starts tracking (reference counted); returns the function that stops it. */
export function trackKeyboardNavigation(): () => void {
  if (typeof document === 'undefined') return () => undefined;
  if (listeners === 0) {
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('keyup', reset, true);
    document.addEventListener('pointerdown', reset, true);
  }
  listeners += 1;
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    listeners -= 1;
    if (listeners === 0) {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('keyup', reset, true);
      document.removeEventListener('pointerdown', reset, true);
      navigationKeyDownAt = null;
    }
  };
}

/** True while a focus-moving key is held down, i.e. a focus event now is the user's. */
export function isKeyboardNavigating(): boolean {
  return navigationKeyDownAt !== null && Date.now() - navigationKeyDownAt < STALE_AFTER_MS;
}
