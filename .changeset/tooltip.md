---
'@react-object-page/core': minor
---

Add `Tooltip` and `TooltipProvider` (wrap `@radix-ui/react-tooltip`): the tooltip opens only on a real gesture (pointer hover for `delayDuration`, default 500 ms, or keyboard focus via Tab/Shift+Tab/arrows) and never at mount or on programmatic focus (a `Dialog` focusing its first button, `autoFocus`). Escape closes only the tooltip, it sits on the `tooltip` z-index level above modals and popovers, wraps long text within a 20rem maximum width and stays inside the viewport. Empty `content` and disabled triggers (unless `disabledTriggerFocusable`) render no tooltip and no `aria-describedby`. A `Tooltip` outside a `TooltipProvider` supplies its own.
