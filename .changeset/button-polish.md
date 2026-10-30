---
'@react-object-page/core': minor
---

`Button`: text sizes (`sm | md | lg`) render a plain-text label in a `<span>` with `line-height: 1` and a 1px optical offset applied to the label only (never the button box or the icons); heights are unchanged, and `inline`, icon-only, `asChild` and element children keep their markup. New primary color scale `--color-rop-blue-50` to `--color-rop-blue-800`, derived with `color-mix()` from a single hardcoded `--color-rop-blue-600`; `--color-rop-primary` now points to it. New `--color-rop-primary-active` token, used by the `primary` variant on `:active` (enabled controls only).
