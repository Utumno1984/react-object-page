---
'@react-object-page/core': minor
---

Style foundations: design tokens as CSS variables in the `rop` namespace (semantic colors, type scale, `sans`/`mono` families, radii, z-index scale `sticky < overlay < modal < popover < tooltip`), the `cn()` helper (clsx + tailwind-merge aware of the tokens), and two CSS entries: `@react-object-page/core/styles.css` (compiled, no preflight, utilities in `@layer`) and `@react-object-page/core/theme.css` (tokens + `@theme` for Tailwind v4 projects). `sideEffects` is now `["**/*.css"]`.
