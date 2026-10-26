---
'@react-object-page/core': patch
---

`Button`: fix `size="inline"` overflowing a narrower-than-label container on both sides (the overflow is centered by default); it now overflows only to the right, as documented, so the start of the label is never pushed off-screen.
