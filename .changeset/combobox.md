---
'@react-object-page/core': minor
---

Add `Combobox`: a synchronous input + filtered list built on `useCombobox`, with the listbox in a Popover portal on the `popover` z-index level anchored to the input (above a `Dialog` or `Sheet`; the focus never leaves the input; Escape closes only the list). Data API (`options`, `value`, `onValueChange`) consistent with `Select`, integrated with `Field` (`disabled` is not focusable; `forced`/`locked` keep the focus and the value but never open). `onValueChange` is called only for a user gesture, never when `value` changes from outside; a value with no option shows `unknownValueLabel` or the raw value; a selection outside the filtered results stays selected and the text reverts on leaving the field. The list keeps clear of the on-screen keyboard (visual viewport).
