---
'@react-object-page/core': minor
---

`Button`: variants `primary | secondary | ghost | danger`, sizes `sm | md | lg | inline` (one line tall, inside text) and `icon-xs | icon-sm | icon-md`. Renders `<button type="button">` (never an implicit `submit`), supports `leadingIcon` / `trailingIcon` on the icon scale, `asChild` through `@radix-ui/react-slot` (a disabled `<a>` gets `aria-disabled`, `tabIndex=-1` and a blocked click) and forwards `ref`. The icon-only sizes require `aria-label` or `aria-labelledby` (a TypeScript error, plus `console.error` in development). The keyboard focus indicator is a plain `outline` so the compiled `styles.css` keeps its global `@layer properties` limited to three inert `--tw-*` defaults. New runtime dependency: `@radix-ui/react-slot`.
