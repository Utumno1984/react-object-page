---
'@react-object-page/core': minor
---

`DescriptionList` + `DescriptionListItem`: read-only key/value pairs in a semantic `<dl>`. `layout` is `auto` (default; a CSS container query on the list's own container, threshold token `--container-rop-description-list`), `inline` or `stacked`. Values share one column in inline mode and follow the same alignment rule whether they are strings or React nodes. Empty values (`null`, `undefined`, `false`, `''`, empty fragment/array; not `0`) show a placeholder with a hidden "Not specified" text (`emptyLabel`, `emptyPlaceholder`).
