---
'@react-object-page/core': minor
---

`MessageStrip`: inline status banner with tones `info | success | warning | error` (decorative icon, visually hidden tone name via `toneLabel`), optional bold `title`, live role (`alert` for `error`, `status` otherwise, removable with `live={false}`) and an optional close `Button` (`onDismiss`) whose default accessible name includes the title (override with `dismissLabel`). `FieldMessage`: help / error text under a form control with identical geometry for both tones (the error adds a decorative icon), no live role, an `id` for `aria-describedby`, and nothing rendered for empty `children`.
