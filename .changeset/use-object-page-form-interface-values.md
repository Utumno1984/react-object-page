---
'@react-object-page/core': patch
---

`useObjectPageForm`'s `Values` type parameter now only requires `extends object` instead of `extends Record<string, unknown>`, so a plain `interface` works directly as `Values` (an `interface` has no index signature and did not satisfy `Record<string, unknown>`). Also clarified in `setValues`'s JSDoc that it performs a shallow merge and that TypeScript cannot catch `setValues({ requiredField: undefined })` for a consumer with `exactOptionalPropertyTypes: false` (the default) — enable that compiler flag in your own project if you want it caught. No runtime behavior change.
