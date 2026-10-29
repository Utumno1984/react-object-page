---
'@react-object-page/core': minor
---

Add `useListReport`, the headless List Report engine (columns + sort) and the `ListReportColumn` type. Click cycle ascending, descending, none, overridable per column with `firstSortDirection`; a declared default comparator (numeric, `Intl.Collator` for strings, dates, booleans; empty values always last); stable sort; controlled or uncontrolled with `onSortChange` called only for user gestures; `aria-sort` and sort-button prop getters.
