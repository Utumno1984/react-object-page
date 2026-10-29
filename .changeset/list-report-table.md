---
'@react-object-page/core': minor
---

Add `ListReportTable`, the List Report table: a native `<table>` that renders the state of `useListReport`. Declared column widths (`<colgroup>`, `table-layout: fixed`, `min-width` from `width`/`minWidth`), sortable headers as buttons inside `<th aria-sort>` (the focus stays on the button after re-ordering), text cells truncated with `TruncatedText`, one scroll container (`forwardRef`, optional `maxHeight`) with a sticky header on the shared z-index scale, a constant row height (`--rop-list-report-row-height`) and per-column alignment with logical properties (`dir="rtl"`). An accessible name (`aria-label`, `aria-labelledby` or `caption`) is required by the type and warned about in development. `useListReport` now also returns `getRowId`.
