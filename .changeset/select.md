---
'@react-object-page/core': minor
---

Add `Select` (wraps `@radix-ui/react-select`): a single-choice combobox with a listbox in a portal on the `popover` z-index level, so inside a `Dialog` or `Sheet` the options are above the overlay and clicking one leaves the dialog open (Escape closes only the list). Data API (`options`), integrated with `Field` (`disabled` is not focusable; `forced`/`locked` keep the focus and the value but never open). `onValueChange` is called only when the user picks an option, never when `value` changes from outside (late-arriving options, `undefined`, unknown values). A `value` with no matching option shows `unknownValueLabel` or the raw value; `value={undefined}` shows the placeholder.
