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

// A key whose value is `undefined` is "no error", like in `useObjectPageForm`.
const invalidKeys = (fieldErrors: Partial<Record<string, string>>): string[] =>
  Object.keys(fieldErrors).filter((key) => fieldErrors[key] !== undefined);

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
 * keys of `fieldErrors`. A match that cannot take focus (`type="hidden"`, disabled, not rendered,
 * inert) is skipped in favor of the next one. If no key matches a focusable `[name]` element nothing
 * happens (one `console.error` in development). A key whose value is `undefined` is not an error. Runs in an effect, so it is inert on the server.
 *
 * It fires on the empty → non-empty transition only: a new non-empty `fieldErrors` replacing a
 * non-empty one (a second failed attempt without correcting anything) does not move the focus again.
 */
export function useFocusFirstInvalidField({ containerRef, fieldErrors }: UseFocusFirstInvalidFieldOptions): void {
  const hadErrorsRef = useRef(false);
  const hasErrors = invalidKeys(fieldErrors).length > 0;

  useEffect(() => {
    const had = hadErrorsRef.current;
    hadErrorsRef.current = hasErrors;
    if (!hasErrors || had) return;

    const wanted = new Set(invalidKeys(fieldErrors));
    const container = containerRef.current;
    const candidates: HTMLElement[] = [];
    if (container) {
      // Attribute comparison instead of a `[name="..."]` selector: no escaping of exotic names.
      for (const el of container.querySelectorAll<HTMLElement>('[name]')) {
        if (wanted.has(el.getAttribute('name') ?? '')) candidates.push(el);
      }
    }
    // Document order, never the order of the keys of `fieldErrors`.
    candidates.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));

    // A candidate that cannot take focus (`type="hidden"`, disabled, `display: none`, inert, a
    // `fieldset`) is skipped: the first one that really receives focus wins.
    for (const el of candidates) {
      el.focus({ preventScroll: true });
      if (document.activeElement !== el) continue;
      el.scrollIntoView({ block: 'center' });
      return;
    }

    if (isDev()) {
      console.error(
        '[react-object-page] useFocusFirstInvalidField: none of the keys of `fieldErrors` matches a mounted, focusable `[name]` element inside the container, nothing was focused.',
      );
    }
    // Keyed on the transition (`hasErrors`) and the latest errors/container, read when it fires.
  }, [hasErrors, fieldErrors, containerRef]);
}
