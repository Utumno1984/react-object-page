---
'@react-object-page/core': minor
---

Add `Sheet` (`SheetTrigger`, `SheetContent` with `side` (`left` | `right`), `size` (`sm` | `md` | `lg`), `dismissible` and `returnFocusRef`, `SheetHeader`, `SheetTitle` with `visuallyHidden`, `SheetDescription`, `SheetBody`, `SheetFooter`, `SheetClose`): a modal side panel attached to a viewport edge with the same guarantees as `Dialog` (full bookkeeping whether opened by its trigger or by external state, focus return through `useReturnFocus`, only the body scrolls, follows the visual viewport). `Dialog` and `Sheet` now share one internal module; the `Dialog` API and behaviour are unchanged.
