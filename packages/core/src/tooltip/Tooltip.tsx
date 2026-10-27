import {
  createContext,
  useContext,
  useEffect,
  useState,
  type FocusEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import * as RadixTooltip from '@radix-ui/react-tooltip';
import { isKeyboardNavigating, trackKeyboardNavigation } from '../internal/keyboard-navigation';
import { overlayLayer } from '../overlay/layers';
import { cn } from '../utils/cn';

/** Hover delay before a tooltip opens, in ms, unless a provider or a `Tooltip` says otherwise. */
export const TOOLTIP_DEFAULT_DELAY = 500;
/** After a tooltip closes, moving to another trigger within this time opens it with no delay. */
export const TOOLTIP_DEFAULT_SKIP_DELAY = 300;

export type TooltipSide = 'top' | 'right' | 'bottom' | 'left';
export type TooltipAlign = 'start' | 'center' | 'end';

// Full literals (Tailwind scan). The maximum width is a real one on the content element; long text
// wraps (`[overflow-wrap:anywhere]`, also for a single long word). Pointer events stay on (the
// tooltip is hoverable, see `Tooltip`) but it can never take the focus: it has no `tabindex`.
// The library ships no box-sizing reset (boxes are content-box): the 19rem maximum plus the 1rem of
// horizontal padding is exactly the 20rem outer width.
const CONTENT =
  'max-w-[19rem] rounded-rop-md bg-rop-text px-2 py-1 font-rop-sans text-rop-label text-rop-surface ' +
  '[overflow-wrap:anywhere] [box-shadow:0_2px_8px_rgb(0_0_0/0.25)]';

// Lets a `Tooltip` know whether it sits inside a `TooltipProvider`, to supply a local one if not.
const ProviderPresent = /* @__PURE__ */ createContext(false);

export interface TooltipProviderProps {
  /** Hover delay in ms before a tooltip opens. Default `500`. */
  delayDuration?: number;
  /** Time in ms after a close during which the next tooltip opens with no delay. Default `300`. */
  skipDelayDuration?: number;
  children?: ReactNode;
}

/**
 * Shared timing for every `Tooltip` below it: one tooltip at a time, and moving between adjacent
 * triggers opens the next one at once. Optional: a `Tooltip` outside any provider creates its own
 * (with the default timings), at the price of losing the "skip the delay" behaviour across triggers.
 */
export function TooltipProvider({
  delayDuration = TOOLTIP_DEFAULT_DELAY,
  skipDelayDuration = TOOLTIP_DEFAULT_SKIP_DELAY,
  children,
}: TooltipProviderProps) {
  return (
    <ProviderPresent.Provider value>
      <RadixTooltip.Provider delayDuration={delayDuration} skipDelayDuration={skipDelayDuration}>
        {children}
      </RadixTooltip.Provider>
    </ProviderPresent.Provider>
  );
}

export interface TooltipProps {
  /**
   * The text. `""` (also whitespace only), `null`, `undefined` and `false` mean "no tooltip": nothing
   * opens and the trigger gets no `aria-describedby`. Plain, non-interactive content only.
   */
  content?: ReactNode;
  /** Preferred side; flips to the opposite one when it would leave the viewport. Default `top`. */
  side?: TooltipSide;
  /** Alignment along that side. Default `center`. */
  align?: TooltipAlign;
  /** Distance from the trigger in px. Default `6`. */
  sideOffset?: number;
  /** Hover delay in ms for this tooltip; defaults to the provider's (`500` without one). */
  delayDuration?: number;
  /**
   * Controlled open state. It is the consumer's responsibility not to open it at mount: the
   * "only on a real gesture" guarantee applies to the uncontrolled tooltip.
   */
  open?: boolean;
  /** Called with the requested state (hover, keyboard focus, Escape, click, scroll). */
  onOpenChange?: (open: boolean) => void;
  /**
   * A trigger with the `disabled` attribute gets no tooltip, because a disabled control receives no
   * pointer or focus events. With this prop it is wrapped in a focusable `span` that does: the
   * span (not the disabled control) is then the trigger and the tab stop. Wrapping happens only
   * while the child is disabled, so toggling `disabled` remounts the child.
   */
  disabledTriggerFocusable?: boolean;
  /**
   * The trigger: exactly one element, which receives the handlers and `ref` (`asChild`). A custom
   * component must spread its props and forward its `ref` onto the DOM element, or the tooltip
   * never opens.
   */
  children: ReactElement;
}

function isEmptyContent(content: ReactNode): boolean {
  if (content === null || content === undefined || content === false) return true;
  return typeof content === 'string' && content.trim() === '';
}

/**
 * Tooltip (wraps `@radix-ui/react-tooltip`). Opens on **real gestures only**: the pointer resting on
 * the trigger for `delayDuration`, or the focus arriving by keyboard (Tab, Shift+Tab, arrows). A
 * programmatic focus (a Dialog focusing its first button, `autoFocus`) never opens it, and nothing is
 * open at mount. Escape closes only the tooltip (the Dialog around it stays open); a click or tap
 * closes it; scrolling a scrollable ancestor of the trigger closes it. It sits on the `tooltip`
 * level, above popovers and modals, and is hoverable (moving the pointer onto it keeps it open, as
 * WCAG 1.4.13 asks) but never takes focus. Touch: a tap runs the trigger's action and opens nothing.
 *
 * The trigger is described by the tooltip through `aria-describedby`, only while it is open. A
 * `Tooltip` outside a `TooltipProvider` works (it supplies its own provider).
 */
export function Tooltip({
  content,
  side = 'top',
  align = 'center',
  sideOffset = 6,
  delayDuration,
  open: openProp,
  onOpenChange,
  disabledTriggerFocusable = false,
  children,
}: TooltipProps) {
  const hasProvider = useContext(ProviderPresent);
  useEffect(() => trackKeyboardNavigation(), []);

  // The open state lives here (never Radix's `defaultOpen`), so a tooltip can only open through
  // `onOpenChange`, i.e. through a gesture, and a blocked one is forced closed.
  const [innerOpen, setInnerOpen] = useState(false);
  const empty = isEmptyContent(content);
  const triggerDisabled = !!(children.props as { disabled?: boolean }).disabled;
  const blocked = empty || (triggerDisabled && !disabledTriggerFocusable);
  // Derived reset: a state left `true` must not reopen the tooltip when it is unblocked.
  if (blocked && innerOpen) setInnerOpen(false);
  const open = blocked ? false : (openProp ?? innerOpen);

  const handleOpenChange = (next: boolean) => {
    if (blocked) return;
    if (openProp === undefined) setInnerOpen(next);
    onOpenChange?.(next);
  };

  // Radix opens on every focus event; the only ones that count are the user's own.
  const gateFocus = (event: FocusEvent<HTMLElement>) => {
    if (!isKeyboardNavigating()) event.preventDefault();
  };

  const wrapped = triggerDisabled && disabledTriggerFocusable;
  const trigger = wrapped ? (
    // The disabled control would swallow the pointer events: let them reach the span.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- the documented opt-in: the span is the tab stop
    <span tabIndex={0} className="inline-flex max-w-full [&>*]:pointer-events-none">
      {children}
    </span>
  ) : (
    children
  );

  const tree = (
    <RadixTooltip.Root open={open} onOpenChange={handleOpenChange} delayDuration={delayDuration}>
      <RadixTooltip.Trigger asChild onFocus={gateFocus}>
        {trigger}
      </RadixTooltip.Trigger>
      {empty ? null : (
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            align={align}
            sideOffset={sideOffset}
            collisionPadding={8}
            className={cn(CONTENT, overlayLayer.tooltip)}
          >
            {content}
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      )}
    </RadixTooltip.Root>
  );

  return hasProvider ? (
    tree
  ) : (
    <TooltipProvider>{tree}</TooltipProvider>
  );
}
