---
'@react-object-page/core': minor
---

Add `useCombobox` and `defaultComboboxFilter`: a headless, synchronous combobox hook (ARIA combobox with listbox, focus always on the input, `aria-activedescendant`) with prop getters for input, listbox and options, controlled or uncontrolled selection and input text, and a replaceable case/diacritics-insensitive filter. A selection outside the filtered results stays selected (the text reverts on blur; `clearOnEmpty` opts in to clearing), `onSelectedItemChange` fires only for user selections (never when `selectedItem` changes from outside), and Enter during an IME composition does not select.
