import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  version,
  type ReactElement,
  type Ref,
  type SVGProps,
} from 'react';
import { cn } from '../utils/cn';
import { composeRefs } from '../utils/compose-refs';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// Full literals (Tailwind scan). The pixel values live in tokens.css (`--icon-rop-*`).
const SIZE_CLASS: Record<IconSize, string> = {
  xs: 'size-(--icon-rop-xs)',
  sm: 'size-(--icon-rop-sm)',
  md: 'size-(--icon-rop-md)',
  lg: 'size-(--icon-rop-lg)',
  xl: 'size-(--icon-rop-xl)',
};

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children' | 'ref' | 'size'> {
  /** Side of the square the SVG is forced into, whatever its own width/height. Default `md`. */
  size?: IconSize;
  /**
   * Accessible name. Without it (or empty/blank) the icon is decorative: `aria-hidden`, not
   * focusable, no role. With it: `role="img"` named by this text.
   */
  label?: string;
  /** Exactly one SVG element (any SVG: it is sized and coloured by this component). */
  children: ReactElement<SVGProps<SVGSVGElement>>;
}

// `process` is absent in plain browsers and not typed here (no @types/node in the library build).
const isDev = (): boolean =>
  (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV !== 'production';

// A function, not a module-level constant: no top-level work, so the module stays tree-shakable.
const isReact19 = (): boolean => Number.parseInt(version, 10) >= 19;

/**
 * Wraps any SVG in the icon scale. The SVG itself is cloned (not wrapped), so it is the node that
 * measures the token size, carries the ARIA semantics and inherits the text colour. The child's
 * own `className` and `ref` are preserved.
 */
export const Icon = /* @__PURE__ */ forwardRef<SVGSVGElement, IconProps>(function Icon(
  { size = 'md', label, className, children, ...rest },
  ref,
) {
  const child = Children.count(children) === 1 ? Children.toArray(children)[0] : null;
  if (!isValidElement<SVGProps<SVGSVGElement>>(child) || (typeof child.type === 'string' && child.type !== 'svg')) {
    // Declared behaviour: nothing is rendered (never a half-sized, half-labelled foreign node).
    if (isDev()) {
      console.warn('[react-object-page] <Icon> expects exactly one <svg> element as its child; rendering nothing.');
    }
    return null;
  }

  const childRef = (isReact19() ? child.props.ref : (child as unknown as { ref?: Ref<SVGSVGElement> }).ref) as
    | Ref<SVGSVGElement>
    | undefined;
  const named = typeof label === 'string' && label.trim() !== '';

  return cloneElement(child, {
    ...rest,
    ref: composeRefs(childRef, ref),
    // Default classes first, then the child's own, then the consumer's: the last one wins.
    // Negative block margin: the icon box barely touches the line box (an sm icon in a caption
    // line keeps the line height); larger icons still grow the line, as they must.
    className: cn(
      'inline-block shrink-0 align-middle my-[-0.25em]',
      SIZE_CLASS[size],
      child.props.className,
      className,
    ),
    // The semantics of `label` always win over whatever the child declared.
    ...(named
      ? { role: 'img', 'aria-label': label, 'aria-hidden': undefined, focusable: undefined }
      : { role: undefined, 'aria-label': undefined, 'aria-hidden': true, focusable: 'false' }),
  } as Partial<SVGProps<SVGSVGElement>> & { ref: Ref<SVGSVGElement> });
});
