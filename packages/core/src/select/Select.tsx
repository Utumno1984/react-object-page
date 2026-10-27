import { forwardRef, useContext, useMemo, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import * as RadixSelect from '@radix-ui/react-select';
import { FieldContext } from '../field/FieldContext';
import { Icon } from '../icon/Icon';
import { internalIcons } from '../internal/icons';
import {
  LISTBOX_CONTENT,
  LISTBOX_EMPTY,
  LISTBOX_ITEM,
  LISTBOX_ITEM_INDICATOR,
  LISTBOX_VIEWPORT,
} from '../internal/listbox-styles';
import { textOf } from '../internal/react-nodes';
import { overlayLayer } from '../overlay/layers';
import { cn } from '../utils/cn';

export type SelectSize = 'sm' | 'md';

export interface SelectOption {
  /** Non-empty (the empty string is Radix's "no value" and is not accepted). Unique in the list. */
  value: string;
  label: ReactNode;
  disabled?: boolean;
  /** Text used by typeahead. Default: the plain text of `label`. */
  textValue?: string;
}

export interface SelectProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    'value' | 'defaultValue' | 'onChange' | 'children' | 'role' | 'type' | 'dir'
  > {
  options: readonly SelectOption[];
  /**
   * Controlled value. `undefined` (the key being present) means "nothing selected" and shows the
   * placeholder: the consumer never handles a sentinel value. Omit the prop to leave it uncontrolled.
   */
  value?: string | undefined;
  defaultValue?: string;
  /**
   * Called with the chosen option's value, **only** when the user picks an option (click, Enter,
   * Space, typeahead on the trigger). Never called when `value` changes from outside, whatever the
   * new value is (an option that has just arrived, one that does not exist, `undefined`).
   */
  onValueChange?: (value: string) => void;
  /** Shown when nothing is selected. */
  placeholder?: string;
  /** Shown in the trigger when `value` matches no option. Default: the raw value. */
  unknownValueLabel?: ReactNode;
  /** Shown in the open list when `options` is empty. Default `Nessuna opzione`. */
  emptyLabel?: ReactNode;
  /** Height scale. Default `md`. */
  size?: SelectSize;
}

// Full literals (Tailwind scan). Same box as Input (32px / 36px); the text is clipped by the value
// span, whose container (the trigger) has a real `max-w-full` and `min-w-0`, so a long label never
// widens the Field.
const TRIGGER =
  'flex max-w-full min-w-0 items-center justify-between gap-2 rounded-rop-md border border-rop-border bg-rop-surface px-3 ' +
  'font-rop-sans text-rop-body text-rop-text text-start focus-visible:[outline:2px_solid_var(--color-rop-primary)] ' +
  'focus-visible:outline-offset-2 data-[placeholder]:text-rop-text-muted disabled:cursor-not-allowed disabled:opacity-50 ' +
  'aria-invalid:border-rop-error aria-readonly:bg-rop-surface-subtle';
const SIZE_CLASS: Record<SelectSize, string> = {
  sm: 'py-[5px]',
  md: 'py-[7px]',
};
const VALUE = 'block min-w-0 flex-1 truncate';

let warnedDuplicates = false;
function warnDuplicateValues(options: readonly SelectOption[]): void {
  if (warnedDuplicates) return;
  if (new Set(options.map((o) => o.value)).size === options.length) return;
  warnedDuplicates = true;
  console.warn('[react-object-page] <Select> options must have unique values; the first of each duplicate wins.');
}

/**
 * Single-choice select (wraps `@radix-ui/react-select`): a combobox trigger and a listbox in a
 * portal, on the `popover` level (above a Dialog or Sheet). Inside a `Field` it takes `id`,
 * `aria-labelledby`, `aria-describedby`, `aria-invalid`, `aria-required` and the state from it:
 * `disabled` is out of the tab order; `forced`/`locked` keep the focus and the value but never
 * open (click, Enter, Space, arrows and typeahead included).
 *
 * The consumer's `onValueChange` is the only exit of a choice and is reached only through the
 * handler below, which the value fed to Radix cannot trigger: Radix is always controlled by this
 * component, so a new `value` from outside is just a render. No `name` is forwarded to Radix (it
 * would add a hidden native `<select>` that can echo on its own).
 */
export const Select = /* @__PURE__ */ forwardRef<HTMLButtonElement, SelectProps>(function Select(props, ref) {
  const {
    options,
    value: valueProp,
    defaultValue,
    onValueChange,
    placeholder,
    unknownValueLabel,
    emptyLabel = 'Nessuna opzione',
    size = 'md',
    className,
    ...rest
  } = props;
  const control = useContext(FieldContext);
  const controlled = 'value' in props;
  const [inner, setInner] = useState<string | undefined>(defaultValue);
  const current = controlled ? valueProp : inner;
  const blocked = control?.interactionBlocked ?? false;
  const [open, setOpen] = useState(false);

  warnDuplicateValues(options);
  const byValue = useMemo(() => {
    const map = new Map<string, SelectOption>();
    for (const option of options) if (!map.has(option.value)) map.set(option.value, option);
    return map;
  }, [options]);

  const selected = current === undefined || current === '' ? undefined : byValue.get(current);
  const describedBy = [control?.['aria-describedby'], rest['aria-describedby']].filter(Boolean).join(' ') || undefined;
  // `forced`/`locked`: the list never opens, whatever asks (the trigger keeps the focus).
  const shown = blocked ? false : open;

  // The single path to the consumer. Radix only calls it for a pick made inside the list or a
  // typeahead on the trigger; a stray empty or unknown value (never a user's choice) is dropped.
  const handleValueChange = (next: string) => {
    if (blocked) return;
    const option = byValue.get(next);
    if (!option || option.disabled) return;
    if (!controlled) setInner(next);
    onValueChange?.(next);
  };

  return (
    <RadixSelect.Root
      value={current ?? ''}
      onValueChange={handleValueChange}
      open={shown}
      onOpenChange={(next) => {
        if (!blocked) setOpen(next);
      }}
      disabled={control?.disabled ?? rest.disabled}
    >
      <RadixSelect.Trigger
        {...rest}
        ref={ref}
        id={control?.id ?? rest.id}
        aria-describedby={describedBy}
        aria-labelledby={control?.['aria-labelledby'] ?? rest['aria-labelledby']}
        aria-invalid={control?.['aria-invalid'] ?? rest['aria-invalid']}
        aria-required={control?.['aria-required'] ?? rest['aria-required']}
        aria-readonly={control?.['aria-readonly'] ?? undefined}
        // Radix hides everything outside the open list with `aria-hidden`, trigger included; a
        // focusable control under `aria-hidden` is an axe violation. The focus is in the list while
        // open and comes back to the trigger on close (a programmatic focus ignores tabindex).
        tabIndex={shown ? -1 : undefined}
        className={cn(TRIGGER, SIZE_CLASS[size], className)}
      >
        {/* Radix's Value drops `className`: the clipping box is this wrapper. */}
        <span className={VALUE}>
          <RadixSelect.Value placeholder={placeholder}>
            {selected ? selected.label : (unknownValueLabel ?? current)}
          </RadixSelect.Value>
        </span>
        <RadixSelect.Icon asChild>
          <Icon size="sm">{internalIcons['chevron-down']}</Icon>
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          collisionPadding={8}
          className={cn(LISTBOX_CONTENT, overlayLayer.popover)}
        >
          <RadixSelect.Viewport className={LISTBOX_VIEWPORT}>
            {options.length === 0 ? <div className={LISTBOX_EMPTY}>{emptyLabel}</div> : null}
            {options.map((option) =>
              byValue.get(option.value) === option ? (
                <RadixSelect.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  textValue={option.textValue ?? textOf(option.label)}
                  // Radix sets this only on the highlighted option; a listbox shows the selection.
                  aria-selected={option.value === current}
                  className={cn(LISTBOX_ITEM, '[overflow-wrap:anywhere]')}
                >
                  <RadixSelect.ItemIndicator className={LISTBOX_ITEM_INDICATOR}>
                    <Icon size="sm">{internalIcons.check}</Icon>
                  </RadixSelect.ItemIndicator>
                  <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                </RadixSelect.Item>
              ) : null,
            )}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
});
