---
'@react-object-page/core': minor
---

Typography and icons: `Text` (`variant` body/caption/label, `mono`, `as` p/span/div/label), `Title` (`level` 1..6 independent from `size` sm/md/lg) and `Icon`, which forces any consumer SVG into the icon scale `xs..xl` (12/16/20/24/32 px, new `--icon-rop-*` tokens), inherits `currentColor` and is decorative (`aria-hidden`) unless given a `label` (`role="img"`). All three forward refs and merge the consumer `className` over the defaults. The small set of internal icons (close, chevron-down, check, info, success, warning, error) is not part of the public API.
