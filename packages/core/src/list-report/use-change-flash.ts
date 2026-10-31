import { useEffect, useState } from 'react';

/** How long the "just changed" state lasts, in ms. */
export const CHANGE_FLASH_MS = 200;

/**
 * `true` for `CHANGE_FLASH_MS` after `value` changes from the previous render, `false` at mount (the
 * initial value is a state, not a change). The change is derived while rendering (no effect, so there
 * is no frame with the new value and the old state); only the timer that ends it is an effect. A
 * further change while it is on restarts the timer.
 */
export function useChangeFlash(value: string | number): boolean {
  const [state, setState] = useState({ value, flashing: false });
  if (state.value !== value) setState({ value, flashing: true });

  const { flashing } = state;
  useEffect(() => {
    if (!flashing) return undefined;
    const timer = setTimeout(() => setState((current) => ({ ...current, flashing: false })), CHANGE_FLASH_MS);
    return () => clearTimeout(timer);
  }, [flashing, state.value]);

  return flashing;
}
