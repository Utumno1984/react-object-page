---
'@react-object-page/core': minor
---

`DescriptionListStatus`: status row to mount above a `DescriptionList` (`StatusBadge` + optional audit `detail`, one line, truncated with `TruncatedText`). Its height is reserved while mounted, even with no status and no detail, so switching record does not move the list below; an empty row exposes nothing to assistive technology and a filled one is static (no `aria-live`). `DescriptionListItem` gains `variant="summary"`: emphasised totals row (semibold, tabular figures) with one separator above each run of summaries, in the same value column as the other items (drop one separator with `className="border-0! pt-0!"`).
