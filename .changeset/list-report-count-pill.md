---
'@react-object-page/core': patch
---

`ListReport`: the result count next to the title is now a small pill (`bg-rop-surface-subtle`, `border-rop-border`, `rounded-rop-sm`) and eases to a stronger tone for 200 ms when `resultCount` or `totalCount` changes (filter, search, new data); nothing animates at mount. New motion tokens `--motion-rop-feedback-duration` (120ms) and `--motion-rop-feedback-easing`; with `prefers-reduced-motion: reduce` the transition is off and the pill keeps its resting tone, so the new value just appears. The text of the count and the table's live region are unchanged. No new public API (the pill carries `data-rop-count`, and `data-changed` while the flash is on).
