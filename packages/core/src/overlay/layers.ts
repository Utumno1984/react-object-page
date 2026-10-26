/**
 * Overlay levels mapped onto the z-index tokens of `styles/tokens.css`
 * (sticky < overlay < modal < popover < tooltip). Internal: overlay wrappers take their stacking
 * from here and never write a literal z-index, so a popover is always above a modal and a tooltip
 * above both.
 *
 * The class names are written out in full on purpose: the CSS build scans the sources for
 * utilities, a name assembled at run time would never be generated.
 *
 * Radix content positioned by `@radix-ui/react-popper` (Popover, Select, Tooltip...) lives inside
 * a wrapper element that copies the computed z-index of the content: the class goes on the content
 * element and the wrapper then gets the same level.
 */
export const overlayLayer = {
  backdrop: 'z-rop-overlay',
  modal: 'z-rop-modal',
  popover: 'z-rop-popover',
  tooltip: 'z-rop-tooltip',
} as const;

export type OverlayLayer = keyof typeof overlayLayer;
