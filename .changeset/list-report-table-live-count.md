---
'@react-object-page/core': patch
---

`ListReportTable`: the existing live region now also announces a change of the result count that happens while the status stays `ready` (a filter or a committed search taking the rows from 200 to 15), with the same text as the return from loading (`labels.resultCount(n)`). Still a single live region, one announcement for a change that is both a return from loading and a new count, and several updates in the same batch announce the last value only. No new public API.
