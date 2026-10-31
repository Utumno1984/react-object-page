// Full literals everywhere (Tailwind's scan cannot see a class built by concatenation, and a
// module-level template literal would count as a side effect for the bundler). One rule for every
// value, whatever its type (string, link, mono text, button, multi-line node): `dd` never branches
// on what it holds.

/**
 * The `<dl>` is BOTH the size container and the grid, so `className`, `style` and `ref` act on the
 * very box the container query measures (an element cannot query itself, so the elements that
 * change layout are the items, its descendants). It always has two tracks: the label column (as
 * wide as the longest label, at most 40% of the list) and the values.
 *
 * Inline-size containment gives the box NO intrinsic width: `w-full` keeps it from collapsing as a
 * flex item, but in a shrink-to-fit parent (auto-width table cell, `inline-block`, `fit-content`)
 * the parent would size it to 0. `min-w-32` (8rem) is the floor that keeps such a list readable
 * (stacked) instead of one character per line; the parent should still be given a real width.
 */
export const LIST =
  '@container m-0 grid w-full min-w-32 max-w-full grid-cols-[fit-content(40%)_minmax(0,1fr)] gap-x-4 gap-y-3 p-0';

/**
 * Item: spans the whole row. Inline = subgrid, sharing the list's two tracks, so every value
 * starts on the same vertical line; stacked = its own single column (`dt` above `dd`). `auto` is
 * stacked below the `--container-rop-description-list` threshold and subgrid from it up.
 */
export const ITEM_CLASS = {
  inline: 'rop-dl-item col-span-full grid grid-cols-subgrid items-start gap-y-0.5',
  stacked: 'rop-dl-item col-span-full grid grid-cols-[minmax(0,1fr)] items-start gap-y-0.5',
  auto: 'rop-dl-item col-span-full grid grid-cols-[minmax(0,1fr)] items-start gap-y-0.5 @rop-description-list:grid-cols-subgrid',
} as const;

export const TERM =
  'm-0 min-w-0 p-0 font-rop-sans text-rop-body text-start text-rop-text-muted [overflow-wrap:anywhere]';
export const DETAILS = 'm-0 min-w-0 p-0 font-rop-sans text-rop-body text-start text-rop-text [overflow-wrap:anywhere]';

/**
 * Status row (a sibling above the `<dl>`). `min-height` is one `body` line taken from the token
 * (a `StatusBadge` is never taller), so an empty row and a full one are the same height; rem-based,
 * so it grows with the text at 200% zoom.
 */
export const STATUS_ROOT =
  'flex min-h-[var(--text-rop-body--line-height)] w-full min-w-0 max-w-full items-center gap-x-2 font-rop-sans text-rop-body text-rop-text';
export const STATUS_SLOT = 'flex min-w-0 max-w-full shrink items-center';
export const STATUS_DETAIL = 'min-w-0 flex-1 text-start text-rop-text-muted';

/**
 * Summary item (totals): emphasis from the typographic tokens (semibold, tabular figures, `dt` in
 * the main text colour) and ONE separator above the first item of each run of summaries, i.e. when
 * the previous sibling is not a summary (a summary that is first in the list has no previous
 * sibling: no separator at the top). Same subgrid / columns as a normal item.
 */
export const SUMMARY_ITEM =
  'font-semibold [font-variant-numeric:tabular-nums] [&>dt]:text-rop-text [.rop-dl-item:not([data-rop-summary])+&]:pt-3 [.rop-dl-item:not([data-rop-summary])+&]:[border-top:1px_solid_var(--color-rop-border)]';
