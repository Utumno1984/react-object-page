import { forwardRef, type HTMLAttributes, type LabelHTMLAttributes, type Ref } from 'react';
import { cn } from '../utils/cn';

export type TextVariant = 'body' | 'caption' | 'label';

// Full literals, so that Tailwind's source scan emits each utility.
const VARIANT_CLASS: Record<TextVariant, string> = {
  body: 'text-rop-body',
  caption: 'text-rop-caption',
  label: 'text-rop-label font-[500]',
};

interface TextBaseProps {
  /** Typographic scale step. Independent of `mono`. Default: `body`. */
  variant?: TextVariant;
  /** Monospace family (codes, identifiers), whatever the `variant`. */
  mono?: boolean;
}

export type TextProps = TextBaseProps &
  (
    | ({ as?: 'p' | 'span' | 'div' } & HTMLAttributes<HTMLElement>)
    | ({ as: 'label' } & LabelHTMLAttributes<HTMLElement>)
  );

/** Body text. Renders a `<p>` unless `as` says otherwise (closed set: p, span, div, label). */
export const Text = /* @__PURE__ */ forwardRef<HTMLElement, TextProps>(function Text(
  { as = 'p', variant = 'body', mono = false, className, ...rest },
  ref,
) {
  const Tag = as as 'p';
  return (
    <Tag
      {...(rest as HTMLAttributes<HTMLParagraphElement>)}
      ref={ref as Ref<HTMLParagraphElement>}
      className={cn('m-0', VARIANT_CLASS[variant], mono ? 'font-rop-mono' : 'font-rop-sans', className)}
    />
  );
});
