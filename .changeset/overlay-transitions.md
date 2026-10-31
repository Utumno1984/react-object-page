---
'@react-object-page/core': minor
---

`Dialog` and `Sheet` now animate: the backdrop fades and the panel fades and scales in (`Dialog`) or slides in from its edge (`Sheet`), and both animate out before the nodes are removed (160 ms, `cubic-bezier(0.2, 0, 0, 1)`). The durations come from new tokens `--motion-rop-overlay-duration` / `--motion-rop-overlay-easing`; the animations are keyframes (`rop-overlay-*`, `rop-modal-*`, exposed as `--animate-rop-*`), and they are applied only under `motion-safe:`, so with `prefers-reduced-motion: reduce` there is no animation at all and the panel appears and disappears at once, as before.

Focus handling is unchanged in behaviour but now follows the real unmount: the focus trap is released as soon as the state turns closed, while the focus returns to the opener in the frame after the exit animation has finished (not in the middle of it). A panel that is closed and reopened during its exit stays the same panel and keeps its original opener. While exiting, the panel and its backdrop let the pointer through. The animated `scale` / `translate` properties are used instead of `transform`, so the `Dialog`'s centring is untouched. No new public API (the animation is not configurable from the consumer in this release); the compiled `styles.css` now contains five top-level `@keyframes rop-*` rules, which cannot be placed in a layer.
