import {
  cloneElement,
  forwardRef,
  Fragment,
  isValidElement,
  useEffect,
  version,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
  type SVGProps,
} from 'react';
import { Slot, Slottable } from '@radix-ui/react-slot';
import { Icon, type IconSize } from '../icon/Icon';
import { cn } from '../utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonTextSize = 'sm' | 'md' | 'lg' | 'inline';
export type ButtonIconSize = 'icon-xs' | 'icon-sm' | 'icon-md';
export type ButtonSize = ButtonTextSize | ButtonIconSize;

// Full literals (Tailwind scan, which also reads comments: do not write the bare names of the
// shadow-like utilities here). The keyboard focus indicator is an arbitrary declaration, not one of
// those utilities, because they make Tailwind v4 emit many global `--tw-*` defaults in its
// un-namespaced layer (see the README). `:focus-visible`: keyboard only, never on click.
const BASE =
  'inline-flex max-w-full shrink-0 cursor-pointer select-none items-center justify-center gap-1.5 ' +
  'rounded-rop-md border border-transparent text-center no-underline font-rop-sans font-[500] [overflow-wrap:anywhere] ' +
  'focus-visible:[outline:2px_solid_var(--color-rop-primary)] focus-visible:outline-offset-2 ' +
  'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50';

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-rop-primary text-rop-primary-contrast hover:bg-rop-primary/90',
  secondary: 'border-rop-border bg-rop-surface text-rop-text hover:bg-rop-surface-subtle',
  ghost: 'bg-transparent text-rop-primary hover:bg-rop-surface-subtle',
  danger: 'bg-rop-error text-rop-primary-contrast hover:bg-rop-error/90',
};

// Text sizes grow in height when the label wraps (`min-h`); the icon-only ones are fixed squares.
// `inline` takes font and line height from the surrounding text and is exactly one line tall
// (`1lh`), so a button inside a paragraph never widens the line.
const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'min-h-8 px-2.5 py-1 text-rop-label',
  md: 'min-h-9 px-3.5 py-1.5 text-rop-label',
  lg: 'min-h-11 px-4 py-2 text-rop-label',
  inline: 'h-[1lh] px-1 align-baseline text-[length:inherit] leading-[inherit]',
  'icon-xs': 'size-6 p-0',
  'icon-sm': 'size-8 p-0',
  'icon-md': 'size-9 p-0',
};

const ICON_SIZE: Record<ButtonSize, IconSize> = {
  inline: 'xs',
  sm: 'sm',
  md: 'sm',
  lg: 'md',
  'icon-xs': 'sm',
  'icon-sm': 'md',
  'icon-md': 'lg',
};

type IconElement = ReactElement<SVGProps<SVGSVGElement>>;

interface ButtonBaseProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Visual emphasis. Default `secondary`. */
  variant?: ButtonVariant;
  /**
   * Renders the single child element (e.g. an `<a href>`) instead of a `<button>`, merging classes,
   * props, `onClick` and `ref` into it. `type` is not defaulted in this mode; `disabled` becomes
   * `aria-disabled="true"` + `tabIndex=-1` + a blocked click, since only `<button>` has a native one.
   */
  asChild?: boolean;
  /** An `<svg>` shown before the label, sized by `size`. Decorative: never part of the name. */
  leadingIcon?: IconElement;
  /** An `<svg>` shown after the label, sized by `size`. Decorative: never part of the name. */
  trailingIcon?: IconElement;
  children?: ReactNode;
}

type AccessibleName =
  | { 'aria-label': string; 'aria-labelledby'?: string }
  | { 'aria-labelledby': string; 'aria-label'?: string };

/**
 * Text sizes need nothing extra. The `icon-*` sizes have no visible text, so TypeScript requires an
 * accessible name (`aria-label` or `aria-labelledby`); a missing/blank one is also reported with
 * `console.error` in development.
 */
export type ButtonProps = ButtonBaseProps & ({ size?: ButtonTextSize } | ({ size: ButtonIconSize } & AccessibleName));

// Bundlers replace `process.env.NODE_ENV` in consumer builds; without `process` assume development.
const isDev = (): boolean => typeof process === 'undefined' || process.env.NODE_ENV !== 'production';
const isBlank = (value: unknown): boolean => typeof value !== 'string' || value.trim() === '';

const blockClick = (event: MouseEvent) => event.preventDefault();

/**
 * Button primitive. Renders `<button type="button">` (never an implicit `submit`), or, with
 * `asChild`, the child element carrying the same classes. The consumer `className` is merged last
 * and wins over the defaults. `ref` points to the rendered node (the child's node with `asChild`).
 */
export const Button = /* @__PURE__ */ forwardRef<HTMLElement, ButtonProps>(function Button(props, ref) {
  const {
    variant = 'secondary',
    size = 'md',
    asChild = false,
    leadingIcon,
    trailingIcon,
    className,
    disabled,
    type,
    onClick,
    children,
    ...rest
  } = props;

  const iconOnly = size.startsWith('icon-');
  const named = !isBlank(rest['aria-label']) || !isBlank(rest['aria-labelledby']);
  useEffect(() => {
    if (iconOnly && !named && isDev()) {
      console.error(
        `[react-object-page] <Button size="${size}"> has no visible text: it needs an accessible name (aria-label or aria-labelledby).`,
      );
    }
  }, [iconOnly, named, size]);

  const iconSize = ICON_SIZE[size];
  const classes = cn(BASE, VARIANT_CLASS[variant], SIZE_CLASS[size], className);
  const leading = leadingIcon ? <Icon size={iconSize}>{leadingIcon}</Icon> : null;
  const trailing = trailingIcon ? <Icon size={iconSize}>{trailingIcon}</Icon> : null;

  if (asChild) {
    if (!isValidElement(children) || children.type === Fragment) {
      throw new Error('[react-object-page] <Button asChild> expects exactly one React element as its child.');
    }
    if (
      isDev() &&
      Number.parseInt(version, 10) < 19 &&
      typeof children.type === 'function' &&
      !(children.type.prototype as { isReactComponent?: unknown } | undefined)?.isReactComponent
    ) {
      console.error(
        '[react-object-page] <Button asChild>: the child is a function component, which cannot receive the ref on React 18. Wrap it in forwardRef.',
      );
    }
    // A disabled `<a>` has no native `disabled`. Slot would still call the child's own onClick, so
    // that one is replaced by a blocker, and the Button's `onClick` is not passed on.
    const child = disabled ? cloneElement(children as ReactElement<{ onClick?: unknown }>, { onClick: blockClick }) : children;
    return (
      <Slot
        {...rest}
        ref={ref}
        className={classes}
        onClick={disabled ? undefined : onClick}
        {...(disabled ? { 'aria-disabled': true, tabIndex: -1 } : {})}
      >
        {leading}
        <Slottable>{child}</Slottable>
        {trailing}
      </Slot>
    );
  }

  // Icon-only: a lone <svg> child is put on the icon scale like leading/trailing icons.
  const content =
    iconOnly && isValidElement(children) && children.type === 'svg' ? (
      <Icon size={iconSize}>{children as IconElement}</Icon>
    ) : (
      children
    );

  return (
    <button
      {...rest}
      ref={ref as Ref<HTMLButtonElement>}
      type={type ?? 'button'}
      disabled={disabled}
      onClick={onClick}
      className={classes}
    >
      {leading}
      {content}
      {trailing}
    </button>
  );
});
