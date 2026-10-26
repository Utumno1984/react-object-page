import { forwardRef, useContext, type InputHTMLAttributes } from 'react';
import { FieldContext } from '../field/FieldContext';
import { cn } from '../utils/cn';

export type InputSize = 'sm' | 'md';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Height scale. Default `md` (the native `size` attribute is not exposed). */
  size?: InputSize;
}

// Full literals (Tailwind scan, which also reads comments: no bare names of the shadow-like
// utilities here). The keyboard focus indicator is the same arbitrary declaration as in Button.
// The library ships no preflight (boxes are content-box) and a guard forbids a box-sizing reset:
// so no `w-full` / `h-*` here, which padding would push past the Field. The width is the one the
// Field's column gives it (a stretched flex item), the height is line height + padding + border,
// like Button (32px / 36px).
const BASE =
  'block max-w-full min-w-0 rounded-rop-md border border-rop-border bg-rop-surface px-3 font-rop-sans text-rop-body text-rop-text ' +
  'placeholder:text-rop-text-muted focus-visible:[outline:2px_solid_var(--color-rop-primary)] focus-visible:outline-offset-2 ' +
  'read-only:bg-rop-surface-subtle disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-rop-error';
const SIZE_CLASS: Record<InputSize, string> = {
  sm: 'py-[5px]',
  md: 'py-[7px]',
};

/**
 * Text input. Outside a `Field` it is a styled native `<input>`. Inside one it takes `id`,
 * `aria-describedby` (merged with its own), `aria-invalid`, `aria-required`, `disabled`,
 * `readOnly` and `aria-readonly` from the Field, which win over the same props passed here
 * (except `disabled`/`readOnly`, which the Field can only add). Native `readOnly` is what makes
 * a `forced`/`locked` input immune to typing, paste, Backspace, the wheel and the arrow keys.
 * Changing `value` from outside never calls `onChange`.
 */
export const Input = /* @__PURE__ */ forwardRef<HTMLInputElement, InputProps>(function Input(props, ref) {
  const { size = 'md', className, ...rest } = props;
  const control = useContext(FieldContext);
  const describedBy = [control?.['aria-describedby'], rest['aria-describedby']].filter(Boolean).join(' ') || undefined;
  return (
    <input
      {...rest}
      ref={ref}
      id={control?.id ?? rest.id}
      aria-describedby={describedBy}
      aria-invalid={control?.['aria-invalid'] ?? rest['aria-invalid']}
      aria-required={control?.['aria-required'] ?? rest['aria-required']}
      aria-readonly={control?.['aria-readonly'] ?? rest['aria-readonly']}
      disabled={control?.disabled ?? rest.disabled}
      readOnly={control?.readOnly ?? rest.readOnly}
      className={cn(BASE, SIZE_CLASS[size], className)}
    />
  );
});
