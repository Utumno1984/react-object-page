---
'@react-object-page/core': minor
---

Add `useDirtyGuard({ when, labels? })`, the unsaved-changes guard of an Object Page, with no router integration. While `when` is true a native `beforeunload` listener is registered (removed when `when` turns false or on unmount; independent per hook instance). It returns `guard(action)`, which runs `action` immediately when `when` is false and otherwise opens a confirmation `dialog` (render it with `{dialog}`): "Continua a modificare" (initial focus, Escape, backdrop and close button all mean this; the action is not run) and "Esci senza salvare" (closes the dialog first, then runs the action once). A second `guard` call while the dialog is open is ignored; `when` turning false with the dialog open leaves it open. Texts are overridable via `labels` (Italian defaults). Exports the types `UseDirtyGuardOptions`, `UseDirtyGuardReturn` and `DirtyGuardLabels`.
