---
'@react-object-page/core': minor
---

Add `TruncatedText`: single-line text with an ellipsis and a real width constraint on the element (`min-width: 0`, `max-width: 100%`, block or flex child), whose full text appears in a `Tooltip` only when it is actually truncated. Truncation is measured at the gesture (hover for the delay, keyboard focus with `tabIndex={0}`), never at mount, so a container resized after the mount is judged by its current width. The tooltip adds no `aria-describedby` (the text is already the element's content). `tooltipContent` overrides the text for non-string children.
