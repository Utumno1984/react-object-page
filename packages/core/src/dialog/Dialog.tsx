import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type ForwardedRef,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
} from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { Button } from '../button/Button';
import { internalIcons } from '../internal/icons';
import { overlayLayer } from '../overlay/layers';
import { useReturnFocus } from '../overlay/use-return-focus';
import { cn } from '../utils/cn';

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl';

// Full literals (Tailwind scan). Maximum widths; the dialog is also capped at the viewport width
// minus 1rem of margin per side (see BASE), so on a narrow screen it never overflows.
const SIZE_CLASS: Record<DialogSize, string> = {
  sm: 'max-w-[25rem]',
  md: 'max-w-[35rem]',
  lg: 'max-w-[45rem]',
  xl: 'max-w-[60rem]',
};

// Bundlers replace `process.env.NODE_ENV` in consumer builds; without `process` assume development.
const isDev = (): boolean => {
  try {
    return process.env.NODE_ENV !== 'production';
  } catch {
    return true;
  }
};

interface DialogContextValue {
  /** Where `DialogContent` publishes its `returnFocusRef`, read by `useReturnFocus` at close time. */
  fallbackHolder: { current: RefObject<HTMLElement | null> | undefined };
}

const DialogContext = /* @__PURE__ */ createContext<DialogContextValue | null>(null);

function useDialogContext(part: string): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error(`[react-object-page] <${part}> must be rendered inside <Dialog>.`);
  return ctx;
}

export interface DialogProps {
  /** Controlled open state. With it, the dialog behaves the same whoever sets it (trigger, button, effect). */
  open?: boolean;
  /** Initial state when uncontrolled. A dialog mounted open has no opener to return the focus to. */
  defaultOpen?: boolean;
  /** Called with the requested state (Escape, backdrop, close button, trigger). */
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}

/**
 * Modal dialog root (wraps `@radix-ui/react-dialog`). The open state is tracked here, not only
 * inside Radix, so that `useReturnFocus` sees every way of opening: with `DialogTrigger`, or from
 * application state with no trigger at all. The focus returns to the element that had it before
 * opening (or to `DialogContent`'s `returnFocusRef`), never through Radix's own trigger-only return.
 */
export function Dialog({ open, defaultOpen = false, onOpenChange, children }: DialogProps) {
  const [innerOpen, setInnerOpen] = useState(defaultOpen);
  const current = open ?? innerOpen;
  const fallbackHolder = useRef<RefObject<HTMLElement | null> | undefined>(undefined);
  // Stable object whose `current` is resolved when the focus is returned, i.e. after the content
  // (which publishes the ref) has unmounted.
  const fallbackRef = useMemo<RefObject<HTMLElement | null>>(
    () => ({
      get current() {
        return fallbackHolder.current?.current ?? null;
      },
      set current(_value) {
        /* read-only view */
      },
    }),
    [],
  );
  useReturnFocus({ open: current, fallbackRef });

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (open === undefined) setInnerOpen(next);
      onOpenChange?.(next);
    },
    [open, onOpenChange],
  );

  const ctx = useMemo(() => ({ fallbackHolder }), []);
  return (
    <DialogContext.Provider value={ctx}>
      <RadixDialog.Root open={current} onOpenChange={handleOpenChange}>
        {children}
      </RadixDialog.Root>
    </DialogContext.Provider>
  );
}

export type DialogTriggerProps = ComponentPropsWithoutRef<typeof RadixDialog.Trigger>;

/** Opens the dialog on click. `asChild` renders your own element (e.g. a `Button`) instead. */
export const DialogTrigger = /* @__PURE__ */ forwardRef<ElementRef<typeof RadixDialog.Trigger>, DialogTriggerProps>(
  function DialogTrigger(props, ref) {
    return <RadixDialog.Trigger {...props} ref={ref} />;
  },
);

// The backdrop and the content sit in one fixed wrapper at the `modal` level, which is the stacking
// unit: a second (nested) dialog's wrapper comes later in the DOM at the same level, so its backdrop
// covers the first dialog, while its popovers (level `popover`) still sit above both.
// `top`/`max-height` follow the visual viewport (variables kept by `trackVisualViewport`, defaulting
// to the layout viewport; no comma in a class name: the stylesheet leak check splits selectors on
// commas), so an on-screen keyboard does not hide the active field. The vertical
// centring is an arbitrary declaration (the named utilities of that family emit global `--tw-*`
// defaults, see the README; the Tailwind scan also reads comments, so they are not named here).
const WRAPPER = 'fixed inset-0';
const BACKDROP = 'fixed inset-0 bg-[rgb(0_0_0/0.4)]';
const BASE =
  '[--rop-vv-top:0px] [--rop-vv-h:100dvh] ' +
  'fixed inset-x-0 mx-auto top-[calc(var(--rop-vv-top)_+_var(--rop-vv-h)_/_2)] [transform:translateY(-50%)] ' +
  'flex w-[calc(100%-2rem)] max-h-[calc(var(--rop-vv-h)_-_2rem)] flex-col overflow-hidden ' +
  'rounded-rop-lg bg-rop-surface font-rop-sans text-rop-text ' +
  '[box-shadow:0_10px_30px_rgb(0_0_0/0.25)] ' +
  // The 1px border is drawn inset by these two declarations: it takes no space, so the width
  // classes are the exact outer width (the stylesheet has no box-sizing reset, see the styles
  // test; the Tailwind scan reads comments too, so the bare utility name is not written here).
  '[outline:1px_solid_var(--color-rop-border)] [outline-offset:-1px]';

/** Keeps `--rop-vv-top` / `--rop-vv-h` on the node in sync with `window.visualViewport`. */
function trackVisualViewport(node: HTMLElement): () => void {
  const vv = window.visualViewport;
  if (!vv) return () => undefined;
  const update = () => {
    node.style.setProperty('--rop-vv-top', `${vv.offsetTop}px`);
    node.style.setProperty('--rop-vv-h', `${vv.height}px`);
  };
  update();
  vv.addEventListener('resize', update);
  vv.addEventListener('scroll', update);
  return () => {
    vv.removeEventListener('resize', update);
    vv.removeEventListener('scroll', update);
  };
}

function hasAccessibleName(node: HTMLElement): boolean {
  if (node.getAttribute('aria-label')?.trim()) return true;
  return (node.getAttribute('aria-labelledby') ?? '')
    .split(/\s+/)
    .some((id) => !!id && !!document.getElementById(id)?.textContent?.trim());
}

export interface DialogContentProps
  extends Omit<ComponentPropsWithoutRef<typeof RadixDialog.Content>, 'children' | 'forceMount'> {
  /** Maximum width step. Default `md`. A conflicting width in `className` wins. */
  size?: DialogSize;
  /**
   * Whether Escape and a click on the backdrop close the dialog. Default `true`; `false` is for
   * dialogs that require an explicit choice (a button must close it).
   */
  dismissible?: boolean;
  /** Receives the focus on close when the opener is gone or disabled (or there never was one). */
  returnFocusRef?: RefObject<HTMLElement | null>;
  children?: ReactNode;
}

/**
 * The dialog panel with its backdrop, rendered in a portal. `size`, `dismissible` and
 * `returnFocusRef` are consumed here and never reach the DOM. Without an accessible name (no
 * `DialogTitle`, no `aria-label`) a development `console.error` is logged.
 */
export const DialogContent = /* @__PURE__ */ forwardRef<ElementRef<typeof RadixDialog.Content>, DialogContentProps>(
  function DialogContent(
    {
      size = 'md',
      dismissible = true,
      returnFocusRef,
      className,
      onCloseAutoFocus,
      onEscapeKeyDown,
      onPointerDownOutside,
      onInteractOutside,
      children,
      ...rest
    },
    forwardedRef,
  ) {
    const { fallbackHolder } = useDialogContext('DialogContent');
    useLayoutEffect(() => {
      fallbackHolder.current = returnFocusRef;
    });

    const cleanupRef = useRef<(() => void) | null>(null);
    const setNode = useCallback(
      (node: HTMLDivElement | null) => {
        cleanupRef.current?.();
        cleanupRef.current = null;
        if (typeof forwardedRef === 'function') forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
        if (!node) return;
        const stopTracking = trackVisualViewport(node);
        // Radix sets `aria-labelledby` only after the title has registered (a re-render following
        // the mount), so the name is checked one frame later, on the settled DOM.
        const frame = isDev()
          ? requestAnimationFrame(() => {
              if (node.isConnected && !hasAccessibleName(node)) {
                console.error(
                  '[react-object-page] <DialogContent> has no accessible name: render a <DialogTitle> (use visuallyHidden to hide it) or pass aria-label / aria-labelledby.',
                );
              }
            })
          : 0;
        cleanupRef.current = () => {
          stopTracking();
          cancelAnimationFrame(frame);
        };
      },
      [forwardedRef],
    );

    return (
      <RadixDialog.Portal>
        <div className={cn(WRAPPER, overlayLayer.modal)}>
          <RadixDialog.Overlay className={cn(BACKDROP, overlayLayer.backdrop)} />
          <RadixDialog.Content
            aria-modal="true"
            {...rest}
            ref={setNode}
            className={cn(BASE, SIZE_CLASS[size], overlayLayer.modal, className)}
            // The return of the focus is `useReturnFocus`'s (opener-agnostic), not Radix's.
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              onCloseAutoFocus?.(event);
            }}
            onEscapeKeyDown={(event) => {
              if (!dismissible) event.preventDefault();
              onEscapeKeyDown?.(event);
            }}
            onPointerDownOutside={(event) => {
              if (!dismissible) event.preventDefault();
              onPointerDownOutside?.(event);
            }}
            onInteractOutside={(event) => {
              if (!dismissible) event.preventDefault();
              onInteractOutside?.(event);
            }}
          >
            {children}
          </RadixDialog.Content>
        </div>
      </RadixDialog.Portal>
    );
  },
);

/** Top row: title (and description) plus, typically, a `DialogClose`. Never scrolls away. */
export const DialogHeader = /* @__PURE__ */ forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function DialogHeader(
  { className, ...rest },
  ref,
) {
  return (
    <div
      {...rest}
      ref={ref}
      className={cn('flex shrink-0 items-start justify-between gap-3 border-b border-rop-border px-6 py-4', className)}
    />
  );
});

export interface DialogTitleProps extends ComponentPropsWithoutRef<typeof RadixDialog.Title> {
  /** Hides the title visually; it stays in the accessible name of the dialog. */
  visuallyHidden?: boolean;
}

/** The dialog's accessible name. */
export const DialogTitle = /* @__PURE__ */ forwardRef<ElementRef<typeof RadixDialog.Title>, DialogTitleProps>(function DialogTitle(
  { visuallyHidden = false, className, ...rest },
  ref,
) {
  return (
    <RadixDialog.Title
      {...rest}
      ref={ref}
      className={cn(
        'm-0 min-w-0 flex-1 text-rop-title-md font-[600] [overflow-wrap:anywhere]',
        visuallyHidden && 'sr-only',
        className,
      )}
    />
  );
});

/** The dialog's accessible description. */
export const DialogDescription = /* @__PURE__ */ forwardRef<
  ElementRef<typeof RadixDialog.Description>,
  ComponentPropsWithoutRef<typeof RadixDialog.Description>
>(function DialogDescription({ className, ...rest }, ref) {
  return (
    <RadixDialog.Description
      {...rest}
      ref={ref}
      className={cn('m-0 text-rop-body text-rop-text-muted', className)}
    />
  );
});

/**
 * The only part that scrolls. When its content overflows it becomes focusable, so a keyboard user
 * can scroll it. A wide child (table) scrolls horizontally inside it; the dialog never widens.
 */
export const DialogBody = /* @__PURE__ */ forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function DialogBody(
  { className, tabIndex, ...rest },
  ref,
) {
  const node = useRef<HTMLDivElement | null>(null);
  const [scrollable, setScrollable] = useState(false);
  useEffect(() => {
    const el = node.current;
    if (!el) return undefined;
    const measure = () => setScrollable(el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    return () => observer.disconnect();
  }, []);
  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      node.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );
  return (
    <div
      {...rest}
      ref={setRef}
      tabIndex={tabIndex ?? (scrollable ? 0 : undefined)}
      className={cn(
        'min-h-0 min-w-0 flex-1 overflow-auto px-6 py-4 text-rop-body focus-visible:[outline:2px_solid_var(--color-rop-primary)] focus-visible:-outline-offset-2',
        className,
      )}
    />
  );
});

/** Bottom row for the actions. Never scrolls away. */
export const DialogFooter = /* @__PURE__ */ forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function DialogFooter(
  { className, ...rest },
  ref,
) {
  return (
    <div
      {...rest}
      ref={ref}
      className={cn('flex shrink-0 flex-wrap justify-end gap-2 border-t border-rop-border px-6 py-3', className)}
    />
  );
});

export type DialogCloseProps = ComponentPropsWithoutRef<typeof RadixDialog.Close>;

/**
 * Closes the dialog. With no children and no `asChild` it renders the default close button: a ghost
 * `icon-xs` `Button` with the close icon, named "Chiudi: <title>" (from the dialog's title) unless
 * you pass `aria-label` / `aria-labelledby`. With `children` / `asChild` it is Radix's plain Close.
 */
export const DialogClose = /* @__PURE__ */ forwardRef<HTMLButtonElement, DialogCloseProps>(function DialogClose(props, ref) {
  const { asChild, children, ...rest } = props;
  if (asChild || children !== undefined) {
    return (
      <RadixDialog.Close {...rest} asChild={asChild} ref={ref}>
        {children}
      </RadixDialog.Close>
    );
  }
  return <DefaultClose {...rest} forwardedRef={ref} />;
});

function DefaultClose({
  forwardedRef,
  className,
  ...rest
}: Omit<DialogCloseProps, 'asChild' | 'children'> & { forwardedRef: ForwardedRef<HTMLButtonElement> }) {
  const node = useRef<HTMLButtonElement | null>(null);
  const [titleId, setTitleId] = useState<string | null>(null);
  const ownName = !!rest['aria-label']?.trim() || !!rest['aria-labelledby']?.trim();
  // The title's id belongs to Radix's context (not exposed) and is put on the dialog node only
  // once the title has registered: read it from there and follow it.
  useLayoutEffect(() => {
    const dialog = node.current?.closest('[role="dialog"]');
    if (!dialog) return undefined;
    const read = () => setTitleId(dialog.getAttribute('aria-labelledby'));
    read();
    const observer = new MutationObserver(read);
    observer.observe(dialog, { attributes: true, attributeFilter: ['aria-labelledby'] });
    return () => observer.disconnect();
  }, []);
  const generatedId = useId();
  const closeId = rest.id ?? generatedId;
  const setRef = useCallback(
    (el: HTMLButtonElement | null) => {
      node.current = el;
      if (typeof forwardedRef === 'function') forwardedRef(el);
      else if (forwardedRef) forwardedRef.current = el;
    },
    [forwardedRef],
  );
  const naming = ownName
    ? {}
    : titleId
      ? { 'aria-label': 'Chiudi:', 'aria-labelledby': `${closeId} ${titleId}` }
      : { 'aria-label': 'Chiudi' };
  return (
    <RadixDialog.Close asChild>
      <Button {...({ ...naming, ...rest } as { 'aria-label': string })} id={closeId} ref={setRef} variant="ghost" size="icon-xs" className={className}>
        {internalIcons.close}
      </Button>
    </RadixDialog.Close>
  );
}
