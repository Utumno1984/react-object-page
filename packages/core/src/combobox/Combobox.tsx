import {
  forwardRef,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import * as Popover from '@radix-ui/react-popover';
import { FieldContext } from '../field/FieldContext';
import { Icon } from '../icon/Icon';
import { internalIcons } from '../internal/icons';
import {
  LISTBOX_CONTENT_POPOVER,
  LISTBOX_EMPTY,
  LISTBOX_ITEM,
  LISTBOX_ITEM_INDICATOR,
  LISTBOX_VIEWPORT,
} from '../internal/listbox-styles';
import { overlayLayer } from '../overlay/layers';
import { cn } from '../utils/cn';
import { useCombobox } from './use-combobox';

export type ComboboxSize = 'sm' | 'md';

export interface ComboboxOption {
  /** Unique in the list. */
  value: string;
  /** Plain text: it is what the input shows and what the filter matches. */
  label: string;
  disabled?: boolean;
}

export interface ComboboxProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'value' | 'defaultValue' | 'onChange' | 'size' | 'role' | 'type' | 'children'
  > {
  options: readonly ComboboxOption[];
  /**
   * Controlled value. `undefined` (the key being present) means "nothing selected" and shows the
   * placeholder: the consumer never handles a sentinel value. Omit the prop to leave it uncontrolled.
   */
  value?: string | undefined;
  defaultValue?: string;
  /**
   * Called only when the user picks an option (click, Enter) or, with `clearOnEmpty`, empties the
   * text and leaves the field (`undefined`). Never called when `value` changes from outside,
   * whatever the new value is (an option that has just arrived, one that does not exist, `undefined`).
   */
  onValueChange?: (value: string | undefined) => void;
  /** Shown in the open list when nothing matches. Default `Nessun risultato`. */
  emptyLabel?: string;
  /** Shown in the input when `value` matches no option. Default: the raw value. */
  unknownValueLabel?: string;
  /** Replaces the default filter (case- and diacritics-insensitive substring match on the label). */
  filter?: (options: readonly ComboboxOption[], inputValue: string) => readonly ComboboxOption[];
  /** Emptying the text and leaving the field clears the selection. Default: the selection stays. */
  clearOnEmpty?: boolean;
  /** Height scale. Default `md`. */
  size?: ComboboxSize;
}

// Full literals (Tailwind scan). Same box as Input (32px / 36px); the text is clipped by the input
// itself, whose `max-w-full` / `min-w-0` keep a long label from widening the Field.
const INPUT =
  'block max-w-full min-w-0 rounded-rop-md border border-rop-border bg-rop-surface px-3 font-rop-sans text-rop-body text-rop-text ' +
  'placeholder:text-rop-text-muted focus-visible:[outline:2px_solid_var(--color-rop-primary)] focus-visible:outline-offset-2 ' +
  'read-only:bg-rop-surface-subtle disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-rop-error';
const SIZE_CLASS: Record<ComboboxSize, string> = {
  sm: 'py-[5px]',
  md: 'py-[7px]',
};

// Keys that would open the list (the others only act on an open one): swallowed while the Field
// blocks interaction. Enter and Escape are left alone (implicit form submit, closing a Dialog).
const LIST_KEYS = new Set(['ArrowDown', 'ArrowUp']);

const DEFAULT_PADDING = 8;

/**
 * Space under the visual viewport taken by the on-screen keyboard (spec §1.10). It does not
 * resize the layout viewport, and the positioning engine only re-measures on window resize and
 * scroll: publishing the covered height as state both reserves the room and triggers the measure.
 */
function useKeyboardInset(active: boolean): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = typeof window === 'undefined' ? null : window.visualViewport;
    if (!active || !vv) return undefined;
    const update = () => {
      // Pinch-zoom also resizes the visual viewport: the arithmetic is for scale 1 only.
      setInset(vv.scale === 1 ? Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)) : 0);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      setInset(0);
    };
  }, [active]);
  return inset;
}

/**
 * Synchronous combobox (input + filtered list), built on `useCombobox`: the list is a Popover in a
 * portal on the `popover` level (above a Dialog or Sheet), anchored to the input, and the focus
 * never leaves the input. Inside a `Field` it takes `id`, `aria-describedby`, `aria-invalid`,
 * `aria-required` and the state from it: `disabled` is out of the tab order; `forced`/`locked`
 * keep the focus and the value but never open (typing, arrows, Enter and click included).
 *
 * `onValueChange` is called only for a user gesture: a `value` that changes from outside, to an
 * option that has just arrived, an unknown value or `undefined`, is just a render.
 */
export const Combobox = /* @__PURE__ */ forwardRef<HTMLInputElement, ComboboxProps>(function Combobox(props, ref) {
  const {
    options,
    value: valueProp,
    defaultValue,
    onValueChange,
    emptyLabel = 'Nessun risultato',
    unknownValueLabel,
    filter,
    clearOnEmpty,
    size = 'md',
    className,
    ...rest
  } = props;
  const control = useContext(FieldContext);
  const blocked = control?.interactionBlocked ?? false;
  const controlled = 'value' in props;
  const anchorRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const byValue = useMemo(() => {
    const map = new Map<string, ComboboxOption>();
    for (const option of options) if (!map.has(option.value)) map.set(option.value, option);
    return map;
  }, [options]);

  // A value with no option still has to be seen: it becomes a selected item outside `options`.
  const toItem = (value: string | undefined): ComboboxOption | null => {
    if (value === undefined || value === '') return null;
    return byValue.get(value) ?? { value, label: unknownValueLabel ?? value };
  };

  const combobox = useCombobox<ComboboxOption>({
    items: options,
    itemToString: (option) => option.label,
    itemToKey: (option) => option.value,
    isItemDisabled: (option) => !!option.disabled,
    selectedItem: controlled ? toItem(valueProp) : undefined,
    defaultSelectedItem: toItem(defaultValue),
    onSelectedItemChange: (item) => onValueChange?.(item?.value),
    filter,
    clearOnEmpty,
  });

  // The list never survives a block: hidden now, and closed for good so it does not reappear,
  // with a stale active option, when the Field is unblocked.
  const { close, isOpen } = combobox;
  useEffect(() => {
    if (blocked && isOpen) close();
  }, [blocked, isOpen, close]);
  const shown = isOpen && !blocked;
  const keyboardInset = useKeyboardInset(shown);

  // Keep the active option in view inside the list (the focus stays on the input, so the browser
  // does not scroll it by itself). Measured against the list, never `scrollIntoView`, which would
  // also scroll the page.
  const activeOption = shown && combobox.activeIndex >= 0 ? combobox.filteredItems[combobox.activeIndex] : undefined;
  const activeValue = activeOption?.value;
  useEffect(() => {
    const list = listRef.current;
    if (!list || activeValue === undefined) return;
    const el = list.querySelector<HTMLElement>('[data-active="true"]');
    if (!el) return;
    const l = list.getBoundingClientRect();
    const o = el.getBoundingClientRect();
    if (o.top < l.top) list.scrollTop -= l.top - o.top;
    else if (o.bottom > l.bottom) list.scrollTop += o.bottom - l.bottom;
  }, [activeValue]);

  const describedBy = [control?.['aria-describedby'], rest['aria-describedby']].filter(Boolean).join(' ') || undefined;
  const inputProps = combobox.getInputProps({
    ...rest,
    ref,
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
      rest.onKeyDown?.(event);
      // Blocked (forced/locked): the keys that would open or drive the list never reach the hook.
      if (blocked && LIST_KEYS.has(event.key)) event.preventDefault();
    },
    onClick: (event: MouseEvent<HTMLInputElement>) => {
      rest.onClick?.(event);
      if (!event.defaultPrevented && !blocked) combobox.open();
    },
  });

  const listbox = combobox.getListboxProps<HTMLDivElement>({ ref: listRef });

  return (
    <Popover.Root
      open={shown}
      onOpenChange={(next) => {
        if (!next) combobox.close();
      }}
    >
      <Popover.Anchor asChild>
        <div ref={anchorRef} className="flex min-w-0 max-w-full flex-col">
          <input
            {...inputProps}
            id={control?.id ?? rest.id}
            ref={inputProps.ref}
            aria-describedby={describedBy}
            aria-labelledby={control?.['aria-labelledby'] ?? rest['aria-labelledby']}
            aria-invalid={control?.['aria-invalid'] ?? rest['aria-invalid']}
            aria-required={control?.['aria-required'] ?? rest['aria-required']}
            aria-readonly={control?.['aria-readonly'] ?? rest['aria-readonly']}
            disabled={control?.disabled ?? rest.disabled}
            readOnly={control?.readOnly ?? rest.readOnly}
            className={cn(INPUT, SIZE_CLASS[size], className)}
          />
        </div>
      </Popover.Anchor>
      {shown ? null : <div {...listbox} ref={undefined} hidden />}
      {shown ? (
        <Popover.Portal>
          <Popover.Content
            role="presentation"
            side="bottom"
            align="start"
            sideOffset={4}
            collisionPadding={{
              top: DEFAULT_PADDING,
              left: DEFAULT_PADDING,
              right: DEFAULT_PADDING,
              bottom: DEFAULT_PADDING + keyboardInset,
            }}
            // The focus stays on the input: the popover neither takes it on open nor returns it.
            onOpenAutoFocus={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => event.preventDefault()}
            // Escape is Radix's here (dismiss -> `close`): while the list is the top layer a Dialog
            // underneath ignores it, so the first Escape closes only the list.
            // A click on the input is not "outside"; a click elsewhere blurs the input, which closes.
            onInteractOutside={(event) => {
              if (anchorRef.current?.contains(event.target as Node)) event.preventDefault();
            }}
            className={cn(LISTBOX_CONTENT_POPOVER, overlayLayer.popover)}
          >
            <div {...listbox} className={LISTBOX_VIEWPORT}>
              {combobox.filteredItems.length === 0 ? <div className={LISTBOX_EMPTY}>{emptyLabel}</div> : null}
              {combobox.filteredItems.map((option, index) => {
                const selected = combobox.selectedItem?.value === option.value;
                return (
                  <div
                    key={option.value}
                    {...combobox.getOptionProps(option, index)}
                    data-active={index === combobox.activeIndex}
                    data-highlighted={index === combobox.activeIndex ? '' : undefined}
                    data-disabled={option.disabled ? '' : undefined}
                    className={cn(LISTBOX_ITEM, '[overflow-wrap:anywhere]')}
                  >
                    {selected ? (
                      <span className={LISTBOX_ITEM_INDICATOR}>
                        <Icon size="sm">{internalIcons.check}</Icon>
                      </span>
                    ) : null}
                    {option.label}
                  </div>
                );
              })}
            </div>
          </Popover.Content>
        </Popover.Portal>
      ) : null}
    </Popover.Root>
  );
});
