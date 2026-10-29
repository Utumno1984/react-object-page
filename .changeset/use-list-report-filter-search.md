---
'@react-object-page/core': minor
---

`useListReport` gains a single-choice filter and a text search. Filters are pills (`filters`, `filter` / `defaultFilter` / `onFilterChange`); the search keeps what the user typed (`searchDraft`) apart from the committed `searchQuery` that filters the rows, committed by `commitSearch()` or after `searchCommitDelay` (default 300 ms, `null` = manual). Both are controlled or uncontrolled with no echo of outside changes, and an outside `searchQuery` change never overwrites a draft being edited. Matching is case- and diacritics-insensitive, every whitespace-separated term must match (`searchable` per column, `getSearchText` to override). The pipeline is filter, search, sort; the hook also returns `totalCount`, `resultCount` and `clearFilters()`. New `ListReportFilter` type. Bundle budget of `useListReport` raised from 1828 to 2986 B gzip (filter, search and commit-timer logic).
