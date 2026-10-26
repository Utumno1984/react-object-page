import { createContext } from 'react';

export type FieldState = 'default' | 'disabled' | 'forced' | 'locked';

/**
 * What a form control receives from its `Field`. Spread it on a native `<input>`/`<button>`:
 * the enumerable keys below are HTML/ARIA attributes (`readOnly` renders as a harmless `readonly`
 * on a `<button>`). Keys that do not apply are absent (never `undefined`/`"false"`), so they
 * cannot override a control's own props.
 *
 * `state` and `interactionBlocked` are NOT attributes: they are non-enumerable, readable only
 * explicitly (`control.interactionBlocked`), and therefore lost by a spread. A custom control that
 * is not a native input must read `interactionBlocked` (true for `disabled`, `forced` and
 * `locked`) and ignore Space/Enter/click while it is true.
 */
export interface FieldControlProps {
  id: string;
  /** Ids of the state reason, error and help, in this order; only of messages that exist. */
  'aria-describedby'?: string;
  'aria-invalid'?: true;
  'aria-required'?: true;
  /** `disabled` state: native, out of the tab order. */
  disabled?: true;
  /** `forced` / `locked`: focusable but not editable. */
  readOnly?: true;
  'aria-readonly'?: true;
  /** Not enumerable. */
  readonly state: FieldState;
  /** Not enumerable. True when the user must not be able to change the value. */
  readonly interactionBlocked: boolean;
}

/** `null` outside a Field. */
export const FieldContext = /* @__PURE__ */ createContext<FieldControlProps | null>(null);
