import type { Ref } from 'react';

type PossibleRef<T> = Ref<T> | undefined;

function assignRef<T>(ref: PossibleRef<T>, value: T | null): void | (() => void) {
  if (ref === undefined || ref === null) return undefined;
  if (typeof ref === 'function') {
    return ref(value) as void | (() => void);
  }
  ref.current = value;
  return undefined;
}

/**
 * Merges several refs (callback refs, object refs, or `undefined`) into one callback ref.
 *
 * Every non-nullish ref receives the same node on mount and `null` on unmount. Works on
 * React 18 (the returned callback is invoked with `null` on unmount) and React 19 (the
 * returned cleanup runs on unmount; callback refs that return their own cleanup get it
 * called instead of being invoked with `null`).
 */
export function composeRefs<T>(...refs: PossibleRef<T>[]): (node: T | null) => () => void {
  return (node: T | null) => {
    const cleanups = refs.map((ref) => assignRef(ref, node));
    return () => {
      refs.forEach((ref, index) => {
        const cleanup = cleanups[index];
        if (typeof cleanup === 'function') cleanup();
        else assignRef(ref, null);
      });
    };
  };
}
