---
'@react-object-page/core': minor
---

Add `Dialog` (`DialogTrigger`, `DialogContent` with `size`/`dismissible`/`returnFocusRef`, `DialogHeader`, `DialogTitle` with `visuallyHidden`, `DialogDescription`, `DialogBody`, `DialogFooter`, `DialogClose`), a modal wrapping `@radix-ui/react-dialog`. It behaves the same whether opened by its trigger or by external state, returns the focus through `useReturnFocus`, scrolls only its body, stays within the viewport and follows the visual viewport so an on-screen keyboard does not cover the active field. Adds `@radix-ui/react-dialog` as a runtime dependency.
