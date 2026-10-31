import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

// Bundlers replace `process.env.NODE_ENV` in consumer builds; without `process` assume development.
const isDev = (): boolean => {
  try {
    return process.env.NODE_ENV !== 'production';
  } catch {
    return true;
  }
};

export interface UseFocusFirstInvalidFieldOptions {
  /** Container of the form controls. Only descendants of `containerRef.current` are considered. */
  containerRef: RefObject<HTMLElement | null>;
  /**
   * Errors keyed by field `name` (for example `useObjectPageForm().fieldErrors`). Only the keys are
   * read; this hook knows nothing about the form hook.
   */
  fieldErrors: Partial<Record<string, string>>;
}

/**
 * When `fieldErrors` goes from empty to non-empty, scrolls the first invalid control into view
 * (`block: 'center'`) and focuses it. Controls are looked up as `[name="<key>"]` inside the
 * container, and "first" is the **visual (document) order** of the matches, never the order of the
 * keys of `fieldErrors`. If no key matches a mounted `[name]` element nothing happens (one
 * `console.error` in development). Runs in an effect, so it is inert on the server.
 *
 * It fires on the empty → non-empty transition only: a new non-empty `fieldErrors` replacing a
 * non-empty one (a second failed attempt without correcting anything) does not move the focus again.
 */
export function useFocusFirstInvalidField({ containerRef, fieldErrors }: UseFocusFirstInvalidFieldOptions): void {
  const hadErrorsRef = useRef(false);
  const keys = Object.keys(fieldErrors);
  const hasErrors = keys.length > 0;

  useEffect(() => {
    const had = hadErrorsRef.current;
    hadErrorsRef.current = hasErrors;
    if (!hasErrors || had) return;

    const wanted = new Set(Object.keys(fieldErrors));
    const container = containerRef.current;
    let first: HTMLElement | null = null;
    if (container) {
      // Attribute comparison instead of a `[name="..."]` selector: no escaping of exotic names.
      for (const el of container.querySelectorAll<HTMLElement>('[name]')) {
        if (!wanted.has(el.getAttribute('name') ?? '')) continue;
        if (first === null || first.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING) first = el;
      }
    }

    if (first === null) {
      if (isDev()) {
        console.error(
          '[react-object-page] useFocusFirstInvalidField: none of the keys of `fieldErrors` matches a mounted `[name]` element inside the container, nothing was focused.',
        );
      }
      return;
    }
    first.scrollIntoView({ block: 'center' });
    first.focus({ preventScroll: true });
    // Keyed on the transition (`hasErrors`) and the latest errors/container, read when it fires.
  }, [hasErrors, fieldErrors, containerRef]);
}
